<template>
  <div class="admin-dashboard">
    <h2>Admin Dashboard</h2>

    <section class="search-bar">
      <input v-model="searchQuery" placeholder="Search by employee name or order ID" />
      <select v-model="selectedStatus">
        <option value="">All Status</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
      </select>
      <input type="date" v-model="startDate" />
      <input type="date" v-model="endDate" />
      <select v-model="sortOrder">
        <option value="desc">Newest First</option>
        <option value="asc">Oldest First</option>
      </select>
      <button @click="fetchOrders">Search</button>
    </section>

    <section class="orders-table">
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Policy #</th>
            <th>Employee</th>
            <th>Status</th>
            <th>Type</th>
            <th>Premium</th>
            <th>Commission %</th>
            <th>Created</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id">
            <td>{{ order.id }}</td>
            <td>{{ order.policy_number }}</td>
            <td>
              <router-link :to="`/admin/employees/${order.user_id}/edit`">{{ order.employee_name }}</router-link>
            </td>
            <td>
              <select v-model="order.application_status" @change="updateStatus(order)">
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </td>
            <td>{{ order.order_type }}</td>
            <td>${{ order.initial_premium }}</td>
            <td>{{ order.commission_percent }}%</td>
            <td>{{ formatDate(order.created_at) }}</td>
            <td>
              <router-link :to="`/admin/order/${order.id}/edit`">Edit</router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const orders = ref([])

const searchQuery = ref('')
const selectedStatus = ref('')
const sortOrder = ref('desc')
const startDate = ref('')
const endDate = ref('')

const fetchOrders = async () => {
  const params = {
    query: searchQuery.value,
    status: selectedStatus.value,
    sort: sortOrder.value,
    startDate: startDate.value,
    endDate: endDate.value
  }

  const res = await axios.get('/api/admin/orders', { params })
  orders.value = res.data
}

const updateStatus = async (order) => {
  try {
    await axios.post('/api/admin/update-status', {
      orderId: order.id,
      newStatus: order.application_status,
      orderType: order.order_type,
    })
    alert('Status updated successfully')
  } catch (e) {
    console.error(e)
    alert('Failed to update status')
  }
}

const formatDate = (dt) => new Date(dt).toLocaleDateString()

onMounted(fetchOrders)
</script>

<style scoped>
.admin-dashboard {
  padding: 20px;
}
.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.orders-table table {
  width: 100%;
  border-collapse: collapse;
}
.orders-table th, .orders-table td {
  padding: 8px 12px;
  border: 1px solid #ddd;
}
</style>
