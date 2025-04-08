<template>
  <div class="dashboard">
    <Sidebar />
    <div class="dashboard-content">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import Sidebar from '@/components/Sidebar.vue';
</script>

<style scoped>
.dashboard {
  display: flex;
}

.dashboard-content {
  flex-grow: 1;
  padding: 20px;
  background: #f4f4f4;
  min-height: 100vh;
}
</style>
