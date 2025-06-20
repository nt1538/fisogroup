<template>
  <div class="employee-layout">
    <Sidebar />
    <div class="main-panel">
      <Header />
      <router-view />
    </div>
  </div>
</template>

<script setup>
import Sidebar from '@/components/Sidebar.vue'
import Header from '@/layout/src/components/Header.vue'
</script>

<style scoped>
.employee-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.main-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
}
</style>