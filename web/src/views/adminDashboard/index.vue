<template>
  <AdminLayout>
    <h2>Dashboard</h2>
    <div class="grid">
      <div class="card">User Count：{{ stats.userCount }}</div>
      <div class="card">Life Order Count：{{ stats.lifeOrderCount }}</div>
      <div class="card">Annuity Order Count：{{ stats.annuityOrderCount }}</div>
      <div class="card">Total Commission：${{ stats.totalCommissionAmount }}</div>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '@/config/axios.config';
import AdminLayout from '@/layout/src/AdminLayout.vue';

const stats = ref({
  userCount: 0,
  lifeOrderCount: 0,
  annuityOrderCount: 0,
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
  gap: 20px;
}
.card {
  padding: 20px;
  background: #eee;
  border-radius: 8px;
}
</style>