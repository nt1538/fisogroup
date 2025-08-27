<template>
  <AdminLayout>
    <h2>Order List</h2>

    <!-- Filters -->
    <div class="filters">
      <input v-model="searchName" placeholder="Search by Employee Name" />
      <input v-model="searchPolicyNumber" placeholder="Search by Policy Number" />
      <input type="date" v-model="startDate" />
      <input type="date" v-model="endDate" />
      <button @click="loadOrders">Search</button>
    </div>

    <!-- Quick range buttons -->
    <div class="filter-buttons" style="margin:10px 0 15px; display:flex; gap:10px; flex-wrap:wrap;">
      <button @click="loadOrdersByRange('all')">All</button>
      <button @click="loadOrdersByRange('ytd')">YTD</button>
      <button @click="loadOrdersByRange('rolling_3')">Rolling 3 Months</button>
      <button @click="loadOrdersByRange('rolling_12')">Rolling 12 Months</button>
      <button @click="sortByCarrierCommission">Sort by Commission From Carrier</button>
    </div>

    <!-- Totals -->
    <div v-if="orders.length" class="totals" style="margin:10px 0 15px; font-weight:700; text-align:right;">
      Sum of Commission From Carrier: ${{ formatMoney(totalCarrierCommission) }}
    </div>

    <table v-if="orders.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>Writing Agent</th>
          <th>Level</th>
          <th>Application Date</th>
          <th>Type</th>
          <th>Carrier</th>
          <th>Product Name</th>
          <th>Policy Number</th>
          <th>Insured Name</th>
          <th>Status</th>
          <th>Face Amount</th>
          <th>Planned Premium</th>
          <th>Target/Base Premium</th>
          <th>Product Rate</th>
          <th>Commission From Carrier</th>
          <th>Split Percentage</th>
          <th>Split ID</th>
          <th>Notes</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="order in orders" :key="order.id">
          <td>{{ order.user_id }}</td>
          <td>{{ order.user_name }}</td>
          <td>{{ order.hierarchy_level }}</td>
          <td>{{ formatDate(order.application_date) }}</td>
          <td>{{ order.table_type.replace('saved_', '').replace('_orders', '') }}</td>
          <td>{{ order.carrier_name }}</td>
          <td>{{ order.product_name }}</td>
          <td>{{ order.policy_number }}</td>
          <td>{{ order.insured_name }}</td>
          <td>{{ order.application_status }}</td>
          <td>{{ order.face_amount }}</td>
          <td>{{ order.initial_premium }}</td>
          <td>{{ order.table_type === 'saved_annuity_orders' ? order.flex_premium : order.target_premium }}</td>
          <td>{{ order.product_rate }}</td>
          <td>${{ formatMoney(order.commission_from_carrier) }}</td>
          <td>{{ order.split_percent === 100 ? 100 : 100 - order.split_percent }}%</td>
          <td>{{ order.split_with_id }}</td>
          <td>{{ order.mra_status }}</td>
          <td class="action-cell">
            <router-link
              :to="`/admin/adminOrderEditSave/${order.table_type}/${order.id}`"
              class="btn"
            >
              Edit
            </router-link>

            <button
              v-if="canRenew(order)"
              class="btn"
              @click="renew(order)"
            >
              Renewal
            </button>
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

onMounted(() => {
  loadOrdersByRange('all');
});

async function loadOrders() {
  try {
    const res = await axios.get('/admin/orders/saved', {
      params: {
        user_name: searchName.value,
        policy_number: searchPolicyNumber.value,
        start_date: startDate.value,
        end_date: endDate.value,
        category: 'saved'
      }
    });
    orders.value = res.data;
  } catch (err) {
    console.error('Failed to load orders', err);
  }
}

function canRenew(order) {
  const isLife = typeof order.table_type === 'string' && order.table_type.includes('life')
  return isLife && order.application_status === 'distributed'
}

async function loadOrdersByRange(range) {
  try {
    const res = await axios.get('/admin/orders/saved', {
      params: {
        user_name: searchName.value,
        policy_number: searchPolicyNumber.value,
        range,
        category: 'saved'
      }
    });
    orders.value = res.data;
  } catch (err) {
    console.error('Failed to load orders by range', err);
  }
}

function sortByCarrierCommission() {
  orders.value = [...orders.value].sort((a, b) => {
    const ca = Number(a.commission_from_carrier) || 0;
    const cb = Number(b.commission_from_carrier) || 0;
    return cb - ca; // descending
  });
}

const totalCarrierCommission = computed(() =>
  orders.value.reduce((sum, o) => sum + (Number(o.commission_from_carrier) || 0), 0)
);

function formatMoney(v) {
  const n = Number(v) || 0;
  return n.toFixed(2);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function renew(order) {
  if (!confirm(`Create renewal commission for order #${order.id}?`)) return;
  try {
    await axios.post(`/admin/saved/${order.table_type}/${order.id}/renewal`);
    alert('Renewal commission created.');
    // Optionally refresh the list
    await loadOrdersByRange('all');
  } catch (err) {
    console.error('Renewal failed', err);
    alert(err?.response?.data?.error || 'Renewal failed.');
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

.action-cell {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Make links and buttons look identical */
.btn {
  display: inline-block;
  background-color: #0055a4;
  color: #fff;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  text-decoration: none; /* remove link underline */
  font-weight: 600;
  line-height: 1;
}

.btn:hover {
  background-color: #003f82;
}

.btn:disabled,
.btn[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>