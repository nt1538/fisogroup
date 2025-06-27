<template>
  <div class="admin-dashboard p-6">
    <h1 class="text-2xl font-bold mb-6">FISO Admin Dashboard</h1>

    <!-- 🧭 1. 快速统计卡片 -->
    <div class="grid grid-cols-4 gap-4 mb-8">
      <div class="card">Total Users: {{ stats.total_users }}</div>
      <div class="card">Orders Today: {{ stats.today_orders }}</div>
      <div class="card">Total Premium: ${{ stats.total_premium }}</div>
      <div class="card">Completed Orders: {{ stats.completed_orders }}</div>
    </div>

    <!-- 🔍 2. 筛选与搜索栏 -->
    <div class="filter-bar mb-4 grid grid-cols-6 gap-4">
      <input v-model="filters.user_name" placeholder="Search by User" class="input" />
      <input v-model="filters.order_id" placeholder="Order ID" class="input" />
      <select v-model="filters.status" class="input">
        <option value="">All Status</option>
        <option>in_progress</option>
        <option>completed</option>
        <option>rejected</option>
      </select>
      <input type="date" v-model="filters.start_date" class="input" />
      <input type="date" v-model="filters.end_date" class="input" />
      <button @click="fetchOrders" class="btn btn-primary">Search</button>
    </div>

    <!-- 📋 3. 订单列表表格 -->
    <div class="overflow-auto">
      <table class="table-auto w-full border">
        <thead>
          <tr class="bg-gray-100">
            <th @click="sortBy('user_name')">User</th>
            <th @click="sortBy('id')">Order ID</th>
            <th>Type</th>
            <th @click="sortBy('created_at')">Created At</th>
            <th>Policy #</th>
            <th>Premium</th>
            <th>Commission %</th>
            <th>Commission $</th>
            <th>Status</th>
            <th>Edit</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id" class="border-t">
            <td>{{ order.user_name }}</td>
            <td>{{ order.id }}</td>
            <td>{{ order.table_type }}</td>
            <td>{{ formatDate(order.created_at) }}</td>
            <td>{{ order.policy_number }}</td>
            <td>${{ order.initial_premium }}</td>
            <td>{{ order.commission_percent }}%</td>
            <td>${{ calculateCommission(order) }}</td>
            <td>
              <select v-model="order.application_status" @change="updateStatus(order)">
                <option>in_progress</option>
                <option>completed</option>
                <option>rejected</option>
              </select>
            </td>
            <td><button @click="goToEdit(order)" class="btn btn-sm">Edit</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 🧑‍💼 4. 员工管理入口 -->
    <div class="mt-10">
      <h2 class="text-xl font-semibold mb-2">Employee Management</h2>
      <router-link to="/admin/employees" class="text-blue-600 hover:underline">Go to Employee Directory →</router-link>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'AdminDashboard',
  data() {
    return {
      stats: {
        total_users: 0,
        today_orders: 0,
        total_premium: 0,
        completed_orders: 0
      },
      filters: {
        user_name: '',
        order_id: '',
        status: '',
        start_date: '',
        end_date: ''
      },
      orders: [],
      sort_by: 'created_at',
      order: 'desc'
    }
  },
  methods: {
    async fetchStats() {
      const res = await axios.get('/api/admin/stats')
      this.stats = res.data
    },
    async fetchOrders() {
      const res = await axios.get('/api/admin-orders/search', {
        params: {
          ...this.filters,
          sort_by: this.sort_by,
          order: this.order
        }
      })
      this.orders = res.data
    },
    formatDate(date) {
      return new Date(date).toLocaleString()
    },
    sortBy(field) {
      if (this.sort_by === field) {
        this.order = this.order === 'asc' ? 'desc' : 'asc'
      } else {
        this.sort_by = field
        this.order = 'asc'
      }
      this.fetchOrders()
    },
    calculateCommission(order) {
      if (!order.initial_premium || !order.commission_percent) return 0
      return ((order.initial_premium * order.commission_percent) / 100).toFixed(2)
    },
    async updateStatus(order) {
      const res = await axios.post(`/api/admin-orders/update-status`, {
        id: order.id,
        status: order.application_status,
        table: order.table_type
      })
      if (res.data.success) {
        this.$toast.success('Status updated successfully')
        this.fetchOrders()
      } else {
        this.$toast.error('Failed to update status')
      }
    },
    goToEdit(order) {
      this.$router.push({ name: 'OrderEdit', params: { id: order.id, table: order.table_type } })
    }
  },
  mounted() {
    this.fetchStats()
    this.fetchOrders()
  }
}
</script>

<style scoped>
.card {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 0.5rem;
  text-align: center;
  font-weight: bold;
}
.input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.btn {
  padding: 0.5rem 1rem;
  background: #2563eb;
  color: white;
  border-radius: 4px;
}
.btn-sm {
  padding: 0.25rem 0.5rem;
  background: #6b7280;
  color: white;
  font-size: 0.875rem;
}
</style>
