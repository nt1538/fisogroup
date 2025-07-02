<template>
  <AdminLayout>
    <h2>Order List</h2>
    <div class="filters">
      <input v-model="searchName" placeholder="Search by Employee Name" />
      <input v-model="searchOrderId" placeholder="Search by Order ID" />
      <input type="date" v-model="startDate" />
      <input type="date" v-model="endDate" />
      <button @click="loadOrders">Search</button>
    </div>

    <table v-if="orders.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>Employee</th>
          <th>Type</th>
          <th>Status</th>
          <th>Created At</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="order in orders" :key="order.id">
          <td>{{ order.user_id }}</td>
          <td>{{ order.user_name }}</td>
          <td>{{ order.table_type }}</td>
          <td>{{ order.application_status }}</td>
          <td>{{ formatDate(order.created_at) }}</td>
          <td>
            <router-link :to="`/admin/adminOrderEdit/${order.table_type}/${order.id}`">Edit</router-link>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else>No Orders Found</div>
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '@/config/axios.config';
import AdminLayout from '@/layout/src/AdminLayout.vue';

const searchName = ref('');
const searchOrderId = ref('');
const table_type = route.params.table_type;
const userId = route.params.id;
const orders = ref([]);

async function loadOrders() {
  const res = await axios.get('/admin/orders', {
    params: {
      user_name: searchName.value,
      order_id: searchOrderId.value,
      start_date: startDate.value,
      end_date: endDate.value
    }
  });
  orders.value = res.data;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString();
}

onMounted(() => {
  loadOrders();
});
</script>

<style scoped>
.filters {
  margin: 15px 0;
  display: flex;
  gap: 10px;
}
input {
  padding: 8px;
  border: 1px solid #ccc;
}
button {
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