<template>
  <AdminLayout>
    <h1>管理员控制台</h1>
    <p>欢迎来到后台管理系统，您可以通过左侧菜单管理订单与员工。</p>
    <div class="cards">
      <div class="card">总订单数：<strong>--</strong></div>
      <div class="card">员工数量：<strong>--</strong></div>
      <div class="card">系统运行状态：<strong>正常</strong></div>
    </div>
  </AdminLayout>
</template>

<script setup>
import AdminLayout from '@/Layout/src/AdminLayout.vue'
</script>

<style scoped>
.cards {
  display: flex;
  gap: 20px;
  margin-top: 20px;
}
.card {
  flex: 1;
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  font-size: 16px;
}
</style>