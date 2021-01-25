import TinyH264Worker from 'worker-loader!./../vendor/tinyh264/H264NALDecoder.worker';
import { BaseCanvasBasedPlayer } from './BaseCanvasBasedPlayer';
import VideoSettings from '../VideoSettings';
import YUVWebGLCanvas from '../../vendor/tinyh264/YUVWebGLCanvas';
import YUVCanvas from '../../vendor/tinyh264/YUVCanvas';
import Size from '../Size';

type WorkerMessage = {
    type: string;
    width: number;
    height: number;
    data: ArrayBuffer;
    renderStateId: number;
};

export class TinyH264Player extends BaseCanvasBasedPlayer {
    private static videoStreamId = 1;

    public static readonly preferredVideoSettings: VideoSettings = new VideoSettings({
      lockedVideoOrientation: -1,
      bitrate: 500000,
      maxFps: 24,
      iFrameInterval: 5,
      bounds: new Size(480, 480),
      sendFrameMeta: false,
    });

    private worker?: TinyH264Worker;

    private isDecoderReady = false;

    protected canvas?: YUVWebGLCanvas | YUVCanvas;

    public readonly supportsScreenshot: boolean = true;

    constructor(udid: string) {
      super(udid, 'tinyh264');
    }

    private onWorkerMessage = (e: MessageEvent): void => {
      const message: WorkerMessage = e.data;
      switch (message.type) {
        case 'pictureReady':
          const { width, height, data } = message;
          this.onFrameDecoded(width, height, new Uint8Array(data));
          break;
        case 'decoderReady':
          this.isDecoderReady = true;
          break;
        default:
          console.error(this.name, Error(`Wrong message type "${message.type}"`));
      }
    };

    private initWorker(): void {
      this.worker = new TinyH264Worker();
      this.worker.addEventListener('message', this.onWorkerMessage);
    }

    protected initCanvas(width: number, height: number): void {
      super.initCanvas(width, height);

      if (BaseCanvasBasedPlayer.hasWebGLSupport()) {
        this.canvas = new YUVWebGLCanvas(this.tag);
      } else {
        this.canvas = new YUVCanvas(this.tag);
      }
    }

    protected decode(data: Uint8Array): void {
      if (!this.worker || !this.isDecoderReady) {
        return;
      }

      this.worker.postMessage(
        {
          type: 'decode',
          data: data.buffer,
          offset: data.byteOffset,
          length: data.byteLength,
          renderStateId: TinyH264Player.videoStreamId,
        },
        [data.buffer],
      );
    }

    public play(): void {
      super.play();
      if (!this.worker) {
        this.initWorker();
      }
    }

    public stop(): void {
      super.stop();
      if (this.worker) {
        this.worker.removeEventListener('message', this.onWorkerMessage);
        this.worker.postMessage({ type: 'release', renderStateId: TinyH264Player.videoStreamId });
        delete this.worker;
      }
    }

    public getPreferredVideoSetting(): VideoSettings {
      return TinyH264Player.preferredVideoSettings;
    }

    protected clearState(): void {
      super.clearState();
      if (this.worker) {
        this.worker.postMessage({ type: 'release', renderStateId: TinyH264Player.videoStreamId });
        TinyH264Player.videoStreamId++;
      }
    }
}
