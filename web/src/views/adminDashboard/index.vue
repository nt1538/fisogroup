<template>
  <AdminLayout>
    <h2>管理员仪表盘</h2>
    <div class="grid">
      <div class="card">用户总数：{{ stats.userCount }}</div>
      <div class="card">订单总数：{{ stats.orderCount }}</div>
      <div class="card">总佣金：${{ stats.totalCommission }}</div>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '@/config/axios.config';
import AdminLayout from '@/layout/src/AdminLayout.vue';

const stats = ref({
  userCount: 0,
  orderCount: 0,
  totalCommission: 0,
});

onMounted(async () => {
  const res = await axios.get('/api/admin/summary');
  stats.value = res.data;
});
</script>

<style scoped>
.grid {
  display: flex;
  gap: 20px;
}
.card {
  padding: 20px;
  background: #eee;
  border-radius: 8px;
}
</style>