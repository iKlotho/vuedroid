<template>
  <div class="about">
    <h1>This is an about page</h1>
    <Player/>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import Player from '@/components/Player.vue'; // @ is an alias to /src

@Options({
  components: {
    Player,
  },
})
export default class About extends Vue {}
</script>
