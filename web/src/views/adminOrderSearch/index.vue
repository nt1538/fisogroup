<template>
  <AdminLayout>
    <h2>订单搜索</h2>
    <div class="filters">
      <input v-model="filters.user" placeholder="用户名" />
      <input v-model="filters.orderId" placeholder="订单ID" />
      <select v-model="filters.status">
        <option value="">全部状态</option>
        <option value="in_progress">进行中</option>
        <option value="completed">已完成</option>
      </select>
      <input type="date" v-model="filters.startDate" />
      <input type="date" v-model="filters.endDate" />
      <button @click="searchOrders">搜索</button>
    </div>

    <table v-if="orders.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>用户</th>
          <th>类型</th>
          <th>状态</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="order in orders" :key="order.id">
          <td>{{ order.id }}</td>
          <td>{{ order.user_name }}</td>
          <td>{{ order.table_type }}</td>
          <td>{{ order.application_status }}</td>
          <td>{{ order.created_at }}</td>
          <td><router-link :to="`/admin/orders/${order.table_type}/${order.id}`">编辑</router-link></td>
        </tr>
      </tbody>
    </table>

    <div v-else>暂无订单</div>
  </AdminLayout>
</template>

<script setup>
import { ref } from 'vue';
import axios from '@/config/axios.config';
import AdminLayout from '@/layout/src/AdminLayout.vue';

const filters = ref({
  user: '',
  orderId: '',
  status: '',
  startDate: '',
  endDate: '',
});

const orders = ref([]);

async function searchOrders() {
  const { user, orderId, status, startDate, endDate } = filters.value;
  const res = await axios.get('/api/admin/orders', {
    params: {
      user_name: user,
      order_id: orderId,
      status,
      start_date: startDate,
      end_date: endDate
    }
  });
  orders.value = res.data;
}
</script>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 15px 0;
}
.filters input, .filters select {
  padding: 8px;
  border: 1px solid #ccc;
}
.filters button {
  padding: 8px 16px;
}
table {
  width: 100%;
  background: white;
  border-collapse: collapse;
}
th, td {
  padding: 10px;
  border: 1px solid #ddd;
}
</style>