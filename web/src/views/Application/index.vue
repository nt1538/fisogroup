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
                <th>FISO</th><th>Last Name</th><th>First Name</th><th>NPN</th><th>License #</th>
                <th>Level</th><th>Comm %</th><th>Split %</th><th>Carrier</th><th>Type</th>
                <th>Product</th><th>App Date</th><th>Policy #</th><th>Face Amt</th>
                <th>Target Prem</th><th>Init Prem</th><th>Comm from Carrier</th>
                <th>Status</th><th>MRA</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in lifeOrders" :key="item.id">
                <td>{{ item.agent_fiso }}</td><td>{{ item.last_name }}</td><td>{{ item.first_name }}</td><td>{{ item.national_producer_number }}</td><td>{{ item.license_number }}</td>
                <td>{{ item.hierarchy_level }}</td><td>{{ item.commission_percent }}%</td><td>{{ item.commission_amount }}%</td>
                <td>{{ item.carrier_name }}</td><td>{{ item.product_type }}</td><td>{{ item.product_name_carrier }}</td>
                <td>{{ formatDate(item.application_date) }}</td><td>{{ item.policy_number }}</td>
                <td>{{ item.face_amount }}</td><td>{{ item.target_premium }}</td><td>{{ item.initial_premium }}</td>
                <td>{{ item.commission_from_carrier }}</td><td>{{ item.application_status }}</td><td>{{ item.mra_status }}</td>
              </tr>
            </tbody>
          </table>
        </div>
  
        <div class="section">
          <h2>Annuity Products - In Progress</h2>
          <table class="commission-table">
            <thead>
              <tr>
                <th>FISO</th><th>Last Name</th><th>First Name</th><th>NPN</th><th>License #</th>
                <th>Level</th><th>Comm %</th><th>Split %</th><th>Carrier</th><th>Type</th>
                <th>Product</th><th>App Date</th><th>Policy #</th><th>Init Prem</th><th>Comm from Carrier</th>
                <th>Status</th><th>MRA</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in annuityOrders" :key="item.id">
                <td>{{ item.agent_fiso }}</td><td>{{ item.last_name }}</td><td>{{ item.first_name }}</td><td>{{ item.national_producer_number }}</td><td>{{ item.license_number }}</td>
                <td>{{ item.hierarchy_level }}</td><td>{{ item.commission_percent }}%</td><td>{{ item.commission_amount }}%</td>
                <td>{{ item.carrier_name }}</td><td>{{ item.product_type }}</td><td>{{ item.product_name_carrier }}</td>
                <td>{{ formatDate(item.application_date) }}</td><td>{{ item.policy_number }}</td>
                <td>{{ item.initial_premium }}</td><td>{{ item.commission_from_carrier }}</td>
                <td>{{ item.application_status }}</td><td>{{ item.mra_status }}</td>
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
      const lifeRes = await axios.get('/orders/life?status=in_progress');
      const annuityRes = await axios.get('/orders/annuity?status=in_progress');
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
  
