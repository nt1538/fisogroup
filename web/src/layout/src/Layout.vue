<template>
  <div class="app-layout">
    <Sidebar class="sidebar" v-if="isEmployeePage"/>
    <div class="main">
      <Header class="header" />
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { ref, watchEffect } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import Header from '@/layout/src/components/Header.vue'
watchEffect(() => {
  isEmployeePage.value = route.path.startsWith('/employee')
})

</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

.sidebar {
  width: 200px;
  background: #f5f5f5;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  height: 80px;
  flex-shrink: 0;
  background-color: #fff;
  z-index: 100;
}

router-view {
  flex: 1;
  overflow: auto;
}
</style>

