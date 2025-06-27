<template>
  <div class="sidebar">
    <router-link to="/admin/dashboard" class="sidebar-item">📊 Dashboard</router-link>
    <router-link to="/admin/orders" class="sidebar-item">📦 Manage Orders</router-link>
    <router-link to="/admin/employees" class="sidebar-item">👥 Manage Employees</router-link>
  </div>
</template>

<script setup>
// 管理员侧边栏组件
</script>

<style scoped>
.sidebar {
  background-color: #2c3e50;
  color: white;
  height: 100vh;
  width: 220px;
  display: flex;
  flex-direction: column;
  padding-top: 20px;
}
.sidebar-item {
  padding: 15px 20px;
  color: white;
  text-decoration: none;
}
.sidebar-item:hover {
  background-color: #34495e;
}
</style>