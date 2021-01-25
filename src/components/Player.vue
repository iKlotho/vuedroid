<template>
<div>Hello</div>
</template>
<script lang='ts'>
import { Options, Vue } from 'vue-class-component';

import { ScrcpyStreamParams } from '../../common/ScrcpyStreamParams';
import { StreamClientScrcpy } from '../client/StreamClientScrcpy';

@Options({
  props: {},
})
export default class Player extends Vue {
  mounted(): void {
    const query = {
      action: 'stream',
      udid: 'emulator-5554',
      player: 'broadway',
      ip: 'localhost',
      port: '8886',
      query: '',
    };
    const player = new StreamClientScrcpy(query as ScrcpyStreamParams);
    console.log('pl', player);
  }
}
</script>
