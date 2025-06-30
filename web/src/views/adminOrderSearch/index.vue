<template>
  <AdminLayout>
    <h2>Search For Orders</h2>
    <div class="filters">
      <input v-model="filters.user" placeholder="Employee Name" />
      <input v-model="filters.orderId" placeholder="Order ID" />
      <select v-model="filters.status">
        <option value="">Status</option>
        <option value="in_progress">in Progress</option>
        <option value="completed">Completed</option>
      </select>
      <select v-model="filters.order_type">
        <option value="">Order Type</option>
        <option value="life_orders">Life</option>
        <option value="annuity_orders">Annuity</option>
      </select>
      <input type="date" v-model="filters.startDate" />
      <input type="date" v-model="filters.endDate" />
      <button @click="searchOrders">Search</button>
    </div>

    <table v-if="orders.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>User</th>
          <th>Type</th>
          <th>Status</th>
          <th>Created At</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="order in orders" :key="order.id">
          <td>{{ order.id }}</td>
          <td>{{ order.user_name }}</td>
          <td>{{ order.table_type }}</td>
          <td>{{ order.application_status }}</td>
          <td>{{ order.created_at }}</td>
          <td><router-link :to="`/admin/orders/${order.table_type}/${order.id}`">Edit</router-link></td>
        </tr>
      </tbody>
    </table>

    <div v-else>No Orders Available</div>
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
  order_type: '',
  startDate: '',
  endDate: '',
});

const orders = ref([]);

async function searchOrders() {
  const { user, orderId, status, startDate, endDate } = filters.value;
  const res = await axios.get('/admin/orders', {
    params: {
      user_name: user,
      order_id: orderId,
      status,
      table_type: order_type,
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