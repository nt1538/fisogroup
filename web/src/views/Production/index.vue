<template>
    <div class="dashboard">
      <Sidebar />
      <div class="commission-page">
        <h1>Production Report (Completed Deals)</h1>
        <div class="filter-controls">
          <div class="filter-buttons">
            <button @click="fetchData('all')">All</button>
            <button @click="fetchData('ytd')">YTD</button>
            <button @click="fetchData('rolling_3')">Rolling 3 Months</button>
            <button @click="fetchData('rolling_12')">Rolling 12 Months</button>
          </div>
          <div class="date-range">
            <label>From: <input type="date" v-model="startDate" /></label>
            <label>To: <input type="date" v-model="endDate" /></label>
            <button @click="fetchDataByDate">Search</button>
          </div>
        </div>
        <div class="section">
          <h2>Life Products - Completed</h2>
          <table class="commission-table">
            <thead>
              <tr>
                <th>User ID</th><th>Name</th><th>National Producer Number</th>
                <th>Level</th><th>Commission Percentage</th><th>Commission Amount</th><th>Carrier</th>
                <th>Product</th><th>Application Date</th><th>Policy #</th><th>Face Amount</th>
                <th>Target Premium</th><th>Initial Premium</th><th>Commission from Carrier</th>
                <th>Split Percentage</th><th>Split ID</th><th>Status</th><th>Matter Require Attention</th><th>Commission Type</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in lifeOrders" :key="item.id">
                <td>{{ item.user_id }}</td><td>{{ item.full_name }}</td><td>{{ item.national_producer_number }}</td>
                <td>{{ item.hierarchy_level }}</td><td>{{ item.commission_percent }}%</td><td>${{ item.commission_amount }}</td>
                <td>{{ item.carrier_name }}</td><td>{{ item.product_name }}</td>
                <td>{{ formatDate(item.application_date) }}</td><td>{{ item.policy_number }}</td>
                <td>{{ item.face_amount }}</td><td>{{ item.target_premium }}</td><td>{{ item.initial_premium }}</td>
                <td>{{ item.commission_from_carrier }}</td><td>{{ item.split_percent }}</td><td>{{ item.split_with_id }}</td>
                <td>{{ item.application_status }}</td><td>{{ item.mra_status }}</td><td>{{ item.order_type }}</td>
              </tr>
            </tbody>
          </table>
        </div>
  
        <div class="section">
          <h2>Annuity Products - Completed</h2>
          <table class="commission-table">
            <thead>
              <tr>
                <th>User ID</th><th>Name</th><th>National Producer Number</th>
                <th>Level</th><th>Commission Percentage</th><th>Commission Amount</th><th>Carrier</th>
                <th>Product</th><th>Application Date</th><th>Policy #</th><th>Initial Premium</th><th>Flex Premium</th><th>Commission from Carrier</th>
                <th>Split Percentage</th><th>Split ID</th><th>Status</th><th>Matter Require Attention</th><th>Commission Type</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in annuityOrders" :key="item.id">
                <td>{{ item.user_id }}</td><td>{{ item.full_name }}</td><td>{{ item.national_producer_number }}</td>
                <td>{{ item.hierarchy_level }}</td><td>{{ item.commission_percent }}%</td><td>${{ item.commission_amount }}</td>
                <td>{{ item.carrier_name }}</td><td>{{ item.product_name}}</td>
                <td>{{ formatDate(item.application_date) }}</td><td>{{ item.policy_number }}</td>
                <td>{{ item.initial_premium }}</td><td>{{ item.flex_premium }}</td><td>{{ item.commission_from_carrier }}</td>
                <td>{{ item.split_percent }}</td><td>{{ item.split_with_id }}</td><td>{{ item.application_status }}</td><td>{{ item.mra_status }}</td><td>{{ item.order_type }}</td>
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

  const startDate = ref('');
  const endDate = ref('');

  async function fetchData(range = 'all') {
    try {
      const lifeRes = await axios.get(`/orders/life?status=completed&range=${range}&order_type=Personal Commission`);
      const annuityRes = await axios.get(`/orders/annuity?status=completed&range=${range}&order_type=Personal Commission`);
      lifeOrders.value = lifeRes.data;
      annuityOrders.value = annuityRes.data;
      console.log('Life Orders:', lifeRes.data);
      console.log('Annuity Orders:', annuityRes.data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  }

  async function fetchDataByDate() {
    if (!startDate.value || !endDate.value) return alert('Please select both start and end dates.');
    try {
      const lifeRes = await axios.get(`/orders/life?status=completed&startDate=${startDate.value}&endDate=${endDate.value}&order_type=Personal Commission`);
      const annuityRes = await axios.get(`/orders/annuity?status=completed&startDate=${startDate.value}&endDate=${endDate.value}&order_type=Personal Commission`);
      lifeOrders.value = lifeRes.data;
      annuityOrders.value = annuityRes.data;
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString();
  }
  
  onMounted(() => fetchData());

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
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
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

  .filter-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .filter-buttons button,
  .date-range button {
    margin: 5px 10px 5px 0;
    padding: 6px 14px;
    border: none;
    background-color: #0055a4;
    color: white;
    border-radius: 5px;
    cursor: pointer;
  }

  .filter-buttons button:hover,
  .date-range button:hover {
    background-color: #003f82;
  }

  .date-range label {
    margin-right: 10px;
    font-size: 14px;
  }
</style>
  