<template>
  <div class="fs-body">
    <slot />
  </div>
</template>
<script>
  export default {
    name: 'MyBody'
  }
</script>
<style lang="scss">
  @include b(body) {
  }
</style>
