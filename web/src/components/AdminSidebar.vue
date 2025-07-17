<template>
  <div class="sidebar">
    <router-link to="/admin/adminDashboard" class="sidebar-item">📊 Dashboard</router-link>
    <!-- Dropdown menu -->
    <div class="sidebar-item dropdown" @click="toggleDropdown">
      📦 Check Orders
      <span class="arrow" :class="{ open: dropdownOpen }">▼</span>
    </div>
    <div v-if="dropdownOpen" class="dropdown-menu">
      <router-link to="/admin/adminOrderSearchApp" class="dropdown-item">📋 Application Orders</router-link>
      <router-link to="/admin/adminOrderSearchComm" class="dropdown-item">💰 Commission Orders</router-link>
      <router-link to="/admin/adminOrderSearchSave" class="dropdown-item">🗃️ Saved Orders</router-link>
    </div>
    <router-link to="/admin/adminEmployeeList" class="sidebar-item">👥 Employees List</router-link>
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