<template>
  <div class="sidebar">
    <router-link to="/admin/adminDashboard" class="sidebar-item">📊 Dashboard</router-link>

    <!-- 订单模块，支持下拉 -->
    <div class="sidebar-item" @click="toggleOrdersDropdown">
      📦 Check Orders
    </div>
    <div v-show="showOrdersDropdown" class="dropdown">
      <router-link to="/admin/adminOrderSearchApp" class="dropdown-item">📝 Application Orders</router-link>
      <router-link to="/admin/adminOrderSearchComm" class="dropdown-item">💰 Commission Orders</router-link>
      <router-link to="/admin/adminOrderSearchSave" class="dropdown-item">📁 Saved Orders</router-link>
    </div>

    <router-link to="/admin/adminEmployeeList" class="sidebar-item">👥 Employees List</router-link>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const showOrdersDropdown = ref(false);
const toggleOrdersDropdown = () => {
  showOrdersDropdown.value = !showOrdersDropdown.value;
};
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
  cursor: pointer;
}

.sidebar-item:hover {
  background-color: #34495e;
}

.dropdown {
  display: flex;
  flex-direction: column;
  background-color: #34495e;
}

.dropdown-item {
  padding: 10px 40px;
  color: white;
  text-decoration: none;
}

.dropdown-item:hover {
  background-color: #3c5a6b;
}
</style>
