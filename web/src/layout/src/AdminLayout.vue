<template>
  <div class="admin-layout">
    <AdminSidebar />
    <div class="content">
      <slot />
    </div>
  </div>
</template>

<script setup>
import AdminSidebar from '@/components/AdminSidebar.vue';
</script>

<style scoped>
.admin-layout {
  display: flex;
  height: 100vh;
  width: 100%;
}
.content {
  flex-grow: 1;
  padding: 20px;
  background-color: #f4f6f8;
  overflow-y: auto;
}
</style>