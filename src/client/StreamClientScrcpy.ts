import { BaseClient } from './BaseClient';
import { Players } from '../../common/Players';
import { ScrcpyStreamParams } from '../../common/ScrcpyStreamParams';
import { DroidMoreBox } from '../toolbox/DroidMoreBox';
import { DroidToolBox } from '../toolbox/DroidToolBox';
import VideoSettings from '../VideoSettings';
import Size from '../Size';
import { ControlMessage } from '../controlMessage/ControlMessage';
import { StreamReceiver } from './StreamReceiver';
import { CommandControlMessage } from '../controlMessage/CommandControlMessage';
import TouchHandler from '../TouchHandler';
import Util from '../Util';
import ScreenInfo from '../ScreenInfo';
import { TouchControlMessage } from '../controlMessage/TouchControlMessage';
import FilePushHandler from '../FilePushHandler';
import DragAndPushLogger from '../DragAndPushLogger';
import { KeyEventListener, KeyInputHandler } from '../KeyInputHandler';
import { KeyCodeControlMessage } from '../controlMessage/KeyCodeControlMessage';
import { MsePlayer } from '../player/MsePlayer';
import { BroadwayPlayer } from '../player/BroadwayPlayer';
// import { TinyH264Player } from '../player/TinyH264Player';
import { BasePlayer } from '../player/BasePlayer';

export class StreamClientScrcpy extends BaseClient<never> implements KeyEventListener {
    public static ACTION = 'stream';

    private hasTouchListeners = false;

    private controlButtons?: HTMLElement;

    private deviceName = '';

    private clientId = -1;

    private clientsCount = -1;

    private requestedVideoSettings?: VideoSettings;

    private readonly streamReceiver: StreamReceiver;

    constructor(params: ScrcpyStreamParams) {
      super();
      console.log('Streamclientscrpy', params);

      this.streamReceiver = new StreamReceiver(params.ip, params.port, params.query);
      this.startStream(params.udid, params.player);
      this.setBodyClass('stream');
      this.setTitle(`${params.udid} stream`);
    }

    public startStream(udid: string, playerName: Players): void {
      if (!udid) {
        return;
      }
      let PlayerClass: new (udid: string) => BasePlayer;
      switch (playerName) {
        case 'mse':
          PlayerClass = MsePlayer;
          break;
        case 'broadway':
          PlayerClass = BroadwayPlayer;
          break;
          /*
            case 'tinyh264':
                PlayerClass = TinyH264Player;
                break;
                */
        default:
          return;
      }
      const player = new PlayerClass(udid);
      this.setTouchListeners(player);

      const deviceView = document.createElement('div');
      deviceView.className = 'device-view';
      const droidMoreBox = new DroidMoreBox(udid, player, this);
      const moreBox = droidMoreBox.getHolderElement();
      const stop = (ev?: string | Event) => {
        if (ev && ev instanceof Event && ev.type === 'error') {
          console.error(ev);
        }
        let parent;
        parent = deviceView.parentElement;
        if (parent) {
          parent.removeChild(deviceView);
        }
        parent = moreBox.parentElement;
        if (parent) {
          parent.removeChild(moreBox);
        }
        this.streamReceiver.stop();
        player.stop();
      };

      droidMoreBox.setOnStop(stop);
      const droidToolBox = DroidToolBox.createToolBox(udid, player, this, moreBox);
      this.controlButtons = droidToolBox.getHolderElement();
      deviceView.appendChild(this.controlButtons);
      const video = document.createElement('div');
      video.className = 'video';
      deviceView.appendChild(video);
      deviceView.appendChild(moreBox);
      player.setParent(video);
      player.pause();

      document.body.appendChild(deviceView);
      const current = player.getVideoSettings();
      if (player.getPreferredVideoSetting().equals(current)) {
        const bounds = this.getMaxSize();
        const {
          bitrate, maxFps, iFrameInterval, lockedVideoOrientation, sendFrameMeta,
        } = current;
        const newVideoSettings = new VideoSettings({
          bounds,
          bitrate,
          maxFps,
          iFrameInterval,
          lockedVideoOrientation,
          sendFrameMeta,
        });
        player.setVideoSettings(newVideoSettings, false);
      }
      const element = player.getTouchableElement();
      const handler = new FilePushHandler(element, this.streamReceiver);
      const logger = new DragAndPushLogger(element);
      handler.addEventListener(logger);

      const { streamReceiver } = this;
      streamReceiver.on('deviceMessage', (message) => {
        droidMoreBox.OnDeviceMessage(message);
      });
      streamReceiver.on('video', (data) => {
        const { STATE } = BasePlayer;
        if (player.getState() === STATE.PAUSED) {
          player.play();
        }
        if (player.getState() === STATE.PLAYING) {
          player.pushFrame(new Uint8Array(data));
        }
      });
      streamReceiver.on('clientsStats', (stats) => {
        this.deviceName = stats.deviceName;
        this.clientId = stats.clientId;
        this.clientsCount = stats.clientsCount;
      });
      streamReceiver.on('videoParameters', ({ screenInfo, videoSettings }) => {
        let min = VideoSettings.copy(videoSettings);
        let playing = false;
        const { STATE } = BasePlayer;
        if (player.getState() === STATE.PAUSED) {
          player.play();
        }
        if (player.getState() === STATE.PLAYING) {
          playing = true;
        }
        const oldInfo = player.getScreenInfo();
        if (!screenInfo.equals(oldInfo)) {
          player.setScreenInfo(screenInfo);
        }

        const oldSettings = player.getVideoSettings();
        if (!videoSettings.equals(oldSettings)) {
          player.setVideoSettings(videoSettings, videoSettings.equals(this.requestedVideoSettings));
        }
        if (!oldInfo) {
          const { bounds } = oldSettings;
          const { videoSize } = screenInfo;
          const onlyOneClient = this.clientsCount === 0;
          const smallerThenCurrent = bounds && (bounds.width < videoSize.width || bounds.height < videoSize.height);
          if (onlyOneClient || smallerThenCurrent) {
            min = oldSettings;
          }
        }
        if (!min.equals(videoSettings) || !playing) {
          this.sendNewVideoSetting(min);
        }
      });
      console.log(player.getName(), udid);
    }

    public sendEvent(e: ControlMessage): void {
      this.streamReceiver.sendEvent(e);
    }

    public getDeviceName(): string {
      return this.deviceName;
    }

    public setHandleKeyboardEvents(enabled: boolean): void {
      if (enabled) {
        KeyInputHandler.addEventListener(this);
      } else {
        KeyInputHandler.removeEventListener(this);
      }
    }

    public onKeyEvent(event: KeyCodeControlMessage): void {
      this.sendEvent(event);
    }

    public sendNewVideoSetting(videoSettings: VideoSettings): void {
      this.requestedVideoSettings = videoSettings;
      this.sendEvent(CommandControlMessage.createSetVideoSettingsCommand(videoSettings));
    }

    public getClientId(): number {
      return this.clientId;
    }

    public getClientsCount(): number {
      return this.clientsCount;
    }

    public getMaxSize(): Size | undefined {
      if (!this.controlButtons) {
        return;
      }
      const { body } = document;
      const width = (body.clientWidth - this.controlButtons.clientWidth) & ~15;
      const height = body.clientHeight & ~15;
      return new Size(width, height);
    }

    private setTouchListeners(player: BasePlayer): void {
      if (!this.hasTouchListeners) {
        TouchHandler.init();
        let down = 0;
        const supportsPassive = Util.supportsPassive();
        const onMouseEvent = (e: MouseEvent | TouchEvent) => {
          const tag = player.getTouchableElement();
          if (e.target === tag) {
            const screenInfo: ScreenInfo = player.getScreenInfo() as ScreenInfo;
            if (!screenInfo) {
              return;
            }
            let events: TouchControlMessage[] | null = null;
            let condition = true;
            if (e instanceof MouseEvent) {
              condition = down > 0;
              events = TouchHandler.buildTouchEvent(e, screenInfo);
            } else if (e instanceof TouchEvent) {
              events = TouchHandler.formatTouchEvent(e, screenInfo, tag);
            }
            if (events && events.length && condition) {
              events.forEach((event) => {
                this.sendEvent(event);
              });
            }
            if (e.cancelable) {
              e.preventDefault();
            }
            e.stopPropagation();
          }
        };

        const options = supportsPassive ? { passive: false } : false;
        document.body.addEventListener(
          'touchstart',
          (e: TouchEvent): void => {
            onMouseEvent(e);
          },
          options,
        );
        document.body.addEventListener(
          'touchend',
          (e: TouchEvent): void => {
            onMouseEvent(e);
          },
          options,
        );
        document.body.addEventListener(
          'touchmove',
          (e: TouchEvent): void => {
            onMouseEvent(e);
          },
          options,
        );
        document.body.addEventListener(
          'touchcancel',
          (e: TouchEvent): void => {
            onMouseEvent(e);
          },
          options,
        );
        document.body.addEventListener('mousedown', (e: MouseEvent): void => {
          down++;
          onMouseEvent(e);
        });
        document.body.addEventListener('mouseup', (e: MouseEvent): void => {
          onMouseEvent(e);
          down--;
        });
        document.body.addEventListener('mousemove', (e: MouseEvent): void => {
          onMouseEvent(e);
        });
        this.hasTouchListeners = true;
      }
    }
}
