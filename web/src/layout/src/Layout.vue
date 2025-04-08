<template>
  <div class="my-layout" :class="{ m: isMClient }">
    <MY-Body>
      <MY-Header />
      <MY-Content>
        <slot />
      </MY-Content>
    </MY-Body>
  </div>
</template>

<script lang="ts" setup>
  import { useStore } from 'vuex'
  import { defineAsyncComponent, computed } from 'vue'
  const MYBody = defineAsyncComponent(() => import('./components/Body.vue'))
  const MYContent = defineAsyncComponent(() => import('./components/Content.vue'))
  const MYHeader = defineAsyncComponent(() => import('./components/Header.vue'))

  const store = useStore()

  const isMClient = computed(() => store.state.common.isM)
</script>
<style lang="scss">
  @include b(layout) {
    position: relative;
    height: 100%;
    width: 100%;

    @include pseudo(after) {
      content: '';
      display: table;
      clear: both;
    }
  }

  @include b(page) {
    margin: 10px;
  }
</style>
