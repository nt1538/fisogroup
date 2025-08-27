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

    <!-- New range filter buttons -->
    <div class="filter-buttons">
      <button @click="loadOrdersByRange('all')">All</button>
      <button @click="loadOrdersByRange('ytd')">YTD</button>
      <button @click="loadOrdersByRange('rolling_3')">Rolling 3 Months</button>
      <button @click="loadOrdersByRange('rolling_12')">Rolling 12 Months</button>
      <button @click="sortByCarrierCommission">Sort by Commission From Carrier</button>
      <button @click="exportCommission">Export to Excel</button>
    </div>

    <!-- Total display -->
    <div v-if="orders.length" class="totals">
      Total Commission Amount: ${{ totalCommission.toFixed(2) }}
    </div>

    <table v-if="orders.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>Payee Name</th>
          <th>Level</th>
          <th>Commission Distribution Date</th>
          <th>Product Type</th>
          <th>Carrier</th>
          <th>Product Name</th>
          <th>Policy Number</th>
          <th>Insured Name</th>
          <th>Writing Agent</th>
          <th>Face Amount</th>
          <th>Paid Premium</th>
          <th>Target/Base Premium</th>
          <th>Commission From Carrier</th>
          <th>Product Rate</th>
          <th>Split Percentage</th>
          <th>Split ID</th>
          <th>Commission Percentage</th>
          <th>Commission Amount</th>
          <th>Commission Type</th>
          <th>Notes</th>
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
          <td>{{ formatDate(order.commission_distribution_date) }}</td>
          <td>{{ order.table_type.replace('commission_', '') }}</td>
          <td>{{ order.carrier_name }}</td>
          <td>{{ order.product_name }}</td>
          <td>{{ order.policy_number }}</td>
          <td>{{ order.insured_name }}</td>
          <td>{{ order.writing_agent }}</td>
          <td>{{ order.face_amount }}</td>
          <td>{{ order.initial_premium }}</td>
          <td>
            {{ order.table_type === 'commission_annuity'
              ? order.flex_premium
              : order.target_premium }}
          </td>
          <td>${{ parseFloat(order.commission_from_carrier).toFixed(2) }}</td>
          <td>{{ order.product_rate}}%</td>
          <td>{{ order.split_percent === 100 ? 100 : 100 - order.split_percent }}%</td>
          <td>{{ order.split_with_id }}</td>
          <td>{{ parseFloat(order.commission_percent).toFixed(2) }}%</td>
          <td>${{ parseFloat(order.commission_amount).toFixed(2) }}</td>
          <td>{{ order.order_type }}</td>
          <td>{{ order.mra_status }}</td>
          <td>{{ order.explanation }}</td>
          <td>{{ formatDate(order.policy_effective_date) }}</td>
          <td>
            <router-link :to="`/admin/adminOrderEditComm/${order.table_type}/${order.id}`">
              Edit
            </router-link>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else>No Orders Found</div>
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from '@/config/axios.config';
import AdminLayout from '@/layout/src/AdminLayout.vue';


const searchName = ref('');
const searchPolicyNumber = ref('');
const startDate = ref('');
const endDate = ref('');
const orders = ref([]);

// Load default (all) on mount
onMounted(() => {
  loadOrdersByRange('all');
});

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

// New: load by range param (ytd, rolling_3, rolling_12, all)
async function loadOrdersByRange(range) {
  try {
    const res = await axios.get('/admin/orders/commission', {
      params: {
        user_name: searchName.value,
        policy_number: searchPolicyNumber.value,
        range,
        category: 'commission'
      }
    });
    orders.value = res.data;
  } catch (err) {
    console.error('Failed to load orders by range', err);
  }
}

const totalCommission = computed(() =>
  orders.value.reduce((sum, order) => sum + (Number(order.commission_amount) || 0), 0)
);

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sortByCarrierCommission() {
  orders.value = [...orders.value].sort((a, b) => {
    const ca = Number(a.commission_from_carrier) || 0;
    const cb = Number(b.commission_from_carrier) || 0;
    return cb - ca; // descending
  });
}

async function exportCommission () {
  try {
    const params = {
      user_name: searchName.value || '',
      policy_number: searchPolicyNumber.value || '',
      range: currentRange.value || 'all',
      start_date: startDate.value || undefined,
      end_date: endDate.value || undefined,
    }
    const res = await axios.get('/admin/exports/commission.xlsx', {
      params,
      responseType: 'blob'
    })
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commission_${Date.now()}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Export failed', e)
    alert('Export failed.')
  }
}

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
thead th {
  position: sticky;
  top: 0;
  background-color: #f8f8f8;
  z-index: 2;
}
th.sticky-col, td.sticky-col {
  position: sticky;
  left: 0;
  z-index: 2;
  background-color: #fff;
  box-shadow: 2px 0 5px rgba(0,0,0,0.1);
}

th.sticky-col-2, td.sticky-col-2 {
  position: sticky;
  left: 120px; /* Adjust based on actual column width */
  z-index: 2;
  background-color: #fff;
  box-shadow: 2px 0 5px rgba(0,0,0,0.05);
}
</style>