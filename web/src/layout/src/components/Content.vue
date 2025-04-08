<template>
  <div class="fs-content">
    <div class="fs-content__wrapper">
      <router-view v-slot="{ Component }" :key="$route.fullPath">
        <transition name="fade">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<style lang="scss">
  @include b(content) {
    min-width: 1200px;
    max-width: 1440px;
    margin: auto;
    overflow: hidden;
  }
  .m {
    @include b(content) {
      min-width: 300px;
      width: 100%;
    }
  }
</style>
