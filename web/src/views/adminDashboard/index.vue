<template>
  <AdminLayout>
    <h2>Dashboard</h2>
    <div class="grid">
      <div class="card">👥 User Count: {{ stats.userCount }}</div>
      <div class="card">📝 Application Orders: {{ stats.applicationOrderCount }}</div>
      <div class="card">📦 Distributed Orders: {{ stats.distributedOrderCount }}</div>
      <div class="card">💰 Total Commission Distributed: ${{ stats.totalCommissionAmount }}</div>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '@/config/axios.config';
import AdminLayout from '@/layout/src/AdminLayout.vue';

const stats = ref({
  userCount: 0,
  applicationOrderCount: 0,
  distributedOrderCount: 0,
  totalCommissionAmount: 0,
});

onMounted(async () => {
  const res = await axios.get('/admin/summary');
  stats.value = res.data;
});
</script>

<style scoped>
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 20px;
}
.card {
  padding: 20px;
  background: #f0f2f5;
  border-radius: 10px;
  min-width: 220px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  font-size: 16px;
}
</style>
