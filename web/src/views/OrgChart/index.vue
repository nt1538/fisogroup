<template>
  <div class="employee-orders">
    <h2>Orders for {{ user.name }}</h2>
    <div v-if="orders.length">
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Client</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Commission</th>
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id">
            <td>{{ order.id }}</td>
            <td>{{ order.client_name }}</td>
            <td>{{ order.order_type }}</td>
            <td>${{ order.premium }}</td>
            <td>${{ order.total_commission }}</td>
            <td>{{ order.created_at }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else>
      No orders found.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/config/axios.config'
import { useRoute } from 'vue-router'

const route = useRoute()
const orders = ref([])
const user = ref({ name: '' })

onMounted(async () => {
  const userId = route.params.id
  const res = await axios.get(`/orders/all-sub/${userId}`)
  orders.value = res.data.orders
  user.value = res.data.user
})
</script>

<style scoped>
.employee-orders {
  padding: 30px;
}
table {
  border-collapse: collapse;
  width: 100%;
}
th, td {
  border: 1px solid #ccc;
  padding: 8px 12px;
}
</style>
