<template>
    <div class="dashboard">
      <Sidebar />
      <div class="commission-page">
        <h1>Application Uploads (In Progress)</h1>
  
        <div class="section">
          <h2>Life Products - In Progress</h2>
          <table class="commission-table">
            <thead>
              <tr>
                <th>User ID</th><th>Name</th><th>Application Date</th><th>Carrier</th>
                <th>Product</th><th>Policy #</th><th>Insured Name</th>
                <th>Face Amount</th><th>Planned Premium</th><th>Target Premium</th>
                <th>Split ID</th><th>Split Percentage</th>
                <th>Notes</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in lifeOrders" :key="item.id">
                <td>{{ item.user_id }}</td><td>{{ item.full_name }}</td><td>{{ formatDate(item.application_date) }}</td>
                <td>{{ item.carrier_name }}</td><td>{{ item.product_name}}</td>
                <td>{{ item.policy_number }}</td><td>{{ item.insured_name }}</td>
                <td>{{ item.face_amount }}</td><td>{{ item.initial_premium }}</td><td>{{ item.target_premium }}</td>
                <td>{{ item.split_with_id }}</td><td>{{ item.split_percent }}</td><td>{{ item.mra_status }}</td>
                <td>
                    <router-link :to="`/employee/reports/app-edit/life/${item.id}`">
                      ✏️ Edit
                    </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
  
        <div class="section">
          <h2>Annuity Products - In Progress</h2>
          <table class="commission-table">
            <thead>
              <tr>
                <th>User ID</th><th>Name</th><th>Application Date</th><th>Carrier</th>
                <th>Product</th><th>Policy #</th><th>Insured Name</th>
                <th>Planned Premium</th><th>Base Premium</th>
                <th>Split ID</th><th>Split Percentage</th><th>Notes</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in annuityOrders" :key="item.id">
                <td>{{ item.user_id }}</td><td>{{ item.full_name }}</td><td>{{ formatDate(item.application_date) }}</td>
                <td>{{ item.carrier_name }}</td><td>{{ item.product_name}}</td>
                <td>{{ item.policy_number }}</td><td>{{ item.insured_name }}</td>
                <td>{{ item.initial_premium }}</td><td>{{ item.flex_premium }}</td>
                <td>{{ item.split_with_id }}</td><td>{{ item.split_percent }}</td><td>{{ item.mra_status }}</td>
                <td>
                    <router-link :to="`/employee/reports/app-edit/annuity/${item.id}`">
                      ✏️ Edit
                    </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import axios from '@/config/axios.config';
  import Sidebar from '@/components/Sidebar.vue';
  
  const lifeOrders = ref([]);
  const annuityOrders = ref([]);
  
  onMounted(async () => {
    try {
      const lifeRes = await axios.get('/orders/application/life');
      const annuityRes = await axios.get('/orders/application/annuity');
      lifeOrders.value = lifeRes.data;
      annuityOrders.value = annuityRes.data;
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  });
  
function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

  </script>
  
  <style scoped>
  .dashboard {
    display: flex;
    overflow-y: scroll;
  }
  
  .commission-page {
    flex-grow: 1;
    padding: 40px;
    background: #f4f4f4;
    min-height: 100vh;
    margin-left: 280px;
  }
  
  .section {
    margin-bottom: 40px;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  }
  
  .commission-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  
  .commission-table th, .commission-table td {
    padding: 8px;
    border: 1px solid #ccc;
    text-align: left;
  }
  
  .commission-table th {
    background-color: #0055a4;
    color: white;
  }
  </style>
  
