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
                <th>User ID</th><th>Name</th><th>National Producer Number</th>
                <th>Level</th><th>Commission Percentage</th><th>Commission Amount</th><th>Carrier</th>
                <th>Product</th><th>Application Date</th><th>Policy #</th><th>Insured Name</th><th>Writing Agent</th>
                <th>Face Amount</th><th>Target Premium</th><th>Planned Premium</th>
                <th>Split Percentage</th><th>Split ID</th>
                <th>Status</th><th>Matter Require Attention</th><th>Commission Type</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in lifeOrders" :key="item.id">
                <td>{{ item.user_id }}</td><td>{{ item.full_name }}</td><td>{{ item.national_producer_number }}</td>
                <td>{{ item.hierarchy_level }}</td><td>{{ item.commission_percent }}%</td><td>${{ item.commission_amount }}</td>
                <td>{{ item.carrier_name }}</td><td>{{ item.product_name}}</td>
                <td>{{ formatDate(item.application_date) }}</td><td>{{ item.policy_number }}</td><td>{{ item.insured_name }}</td><td>{{ item.writing_agent }}</td>
                <td>{{ item.face_amount }}</td><td>{{ item.target_premium }}</td><td>{{ item.initial_premium }}</td>
                <td>{{ item.split_percent }}</td><td>{{ item.split_with_id }}</td><td>{{ item.application_status }}</td><td>{{ item.mra_status }}</td><td>{{ item.order_type }}</td>
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
                <th>User ID</th><th>Name</th><th>National Producer Number</th>
                <th>Level</th><th>Commission Percentage</th><th>Commission Amount</th><th>Carrier</th>
                <th>Product</th><th>Application Date</th><th>Policy #</th><th>Insured Name</th><th>Writing Agent</th>
                <th>Initial Premium</th><th>Base Premium</th><th>Split Percentage</th><th>Split ID</th><th>Status</th><th>Matter Require Attention</th><th>Commission Type</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in annuityOrders" :key="item.id">
                <td>{{ item.user_id }}</td><td>{{ item.full_name }}</td><td>{{ item.national_producer_number }}</td>
                <td>{{ item.hierarchy_level }}</td><td>{{ item.commission_percent }}%</td><td>${{ item.commission_amount }}</td>
                <td>{{ item.carrier_name }}</td><td>{{ item.product_name}}</td>
                <td>{{ formatDate(item.application_date) }}</td><td>{{ item.policy_number }}</td><td>{{ item.insured_name }}</td><td>{{ item.writing_agent }}</td>
                <td>{{ item.initial_premium }}</td><td>{{ item.flex_premium }}</td><td>{{ item.split_percent }}</td><td>{{ item.split_with_id }}</td>
                <td>{{ item.application_status }}</td><td>{{ item.mra_status }}</td><td>{{ item.order_type }}</td>
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
  
  function formatDate(date) {
    return new Date(date).toLocaleDateString();
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
  
