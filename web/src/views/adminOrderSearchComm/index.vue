<template>
  <AdminLayout>
    <h2>Order List</h2>
    <div class="filters">
      <input v-model="searchName" placeholder="Search by Employee Name" />
      <input v-model="searchPolicyNumber" placeholder="Search by Policy Number" />
      <input type="date" v-model="startDate" />
      <input type="date" v-model="endDate" />
      <button @click="loadOrders">Search</button>
    </div>

    <table v-if="orders.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>Payee Name</th>
          <th>Level</th>
          <th>Application Date</th>
          <th>Type</th>
          <th>Carrier</th>
          <th>Product Name</th>
          <th>Policy Number</th>
          <th>Insured Name</th>
          <th>Writing Agent</th>
          <th>Face Amount</th>
          <th>Planned Premium</th>
          <th>Target/Base Premium</th>
          <th>Split Percentage</th>
          <th>Split ID</th>
          <th>Commission Percentage</th>
          <th>Commission Amount</th>
          <th>Commission Type</th>
          <th>Explanation</th>
          <th>Policy Effective Date</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="order in orders" :key="order.id">
          <td>{{ order.user_id }}</td>
          <td>{{ order.user_name }}</td>
          <td>{{ order.hierarchy_level }}</td>
          <td>{{ formatDate(order.application_date) }}</td>
          <td>{{ order.table_type.replace('commission_', '') }}</td>
          <td>{{ order.carrier_name }}</td>
          <td>{{ order.product_name }}</td>
          <td>{{ order.policy_number }}</td>
          <td>{{ order.insured_name }}</td>
          <td>{{ order.writing_agent }}</td>
          <td>{{ order.face_amount }}</td>
          <td>{{ order.initial_premium }}</td>
          <td>{{ order.table_type === 'commission_annuity' ? order.flex_premium : order.target_premium }}</td>
          <td>{{ order.split_percent === 100 ? 100 : 100 - order.split_percent }}%</td>
          <td>{{ order.split_with_id }}</td>
          <td>{{ parseFloat(order.commission_percent).toFixed(2) }}%</td>
          <td>${{ parseFloat(order.commission_amount).toFixed(2) }}</td>
          <td>{{ order.order_type }}</td>
          <td>{{ order.explanation }}</td>
          <td>{{ formatDate(order.policy_effective_date) }}</td>
          <td>
            <router-link :to="`/admin/adminOrderEditComm/${order.table_type}/${order.id}`">Edit</router-link>
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
const searchPolicyNumber = ref('');
const startDate = ref('');
const endDate = ref('');

// const table_type = route.params.table_type;
// const userId = route.params.id;
const orders = ref([]);

async function loadOrders() {
  try {
    const res = await axios.get('/admin/orders/commission', {
      params: {
        user_name: searchName.value,
        policy_number: searchPolicyNumber.value,
        start_date: startDate.value,
        end_date: endDate.value,
        category: 'commission'
      }
    });
    orders.value = res.data;
  } catch (err) {
    console.error('Failed to load orders', err);
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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