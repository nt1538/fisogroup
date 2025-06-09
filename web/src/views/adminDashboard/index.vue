<template>
    <section class="admin-dashboard">
      <h2>Admin Dashboard</h2>
  
      <div class="admin-section">
        <h3>➕ Add New Employee</h3>
        <form @submit.prevent="addUser">
          <div class="form-group">
            <input type="text" v-model="newUser.name" placeholder="Name" required />
            <input type="email" v-model="newUser.email" placeholder="Email" required />
          </div>
          <div class="form-group">
            <input type="password" v-model="newUser.password" placeholder="Password" required />
            <input type="text" v-model="newUser.role" placeholder="Role (A, B, C, Agency1, etc.)" required />
          </div>
          <div class="form-group">
            <input type="number" v-model="newUser.comp_level" placeholder="Compensation Level (%)" required />
            <input type="number" v-model="newUser.introducer_id" placeholder="Introducer ID (optional)" />
          </div>
          <button type="submit" class="btn">Add Employee</button>
        </form>
      </div>
  
      <div class="admin-section">
        <h3>📜 Add New Deal</h3>
        <form @submit.prevent="addDeal">
          <div class="form-group">
            <input type="number" v-model="newDeal.user_id" placeholder="User ID" required />
            <input type="number" v-model="newDeal.order_amount" placeholder="Order Amount" required />
          </div>
          <button type="submit" class="btn">Add Deal</button>
        </form>
      </div>
  
      <div class="admin-section">
        <h3>📋 All Employees</h3>
        <table class="employee-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Total Earnings</th>
              <th>Current Profit</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in employees" :key="user.id">
              <td>{{ user.id }}</td>
              <td>{{ user.name }}</td>
              <td>{{ user.email }}</td>
              <td>{{ user.role }}</td>
              <td>${{ user.total_earnings }}</td>
              <td>${{ user.current_profit }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import axios from 'axios';
  
  const employees = ref([]);
  const newUser = ref({ name: "", email: "", password: "", role: "", comp_level: "", introducer_id: null });
  const newDeal = ref({ user_id: "", order_amount: "" });
  
  const adminId = JSON.parse(localStorage.getItem("user"))?.id; // Get admin ID
  
  onMounted(async () => {
    try {
      const response = await axios.get('/api/users', {
        headers: { 'admin-id': adminId }
      });
      employees.value = response.data;
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  });
  
  const addUser = async () => {
    try {
      await axios.post('/api/admin/add-user', newUser.value, {
        headers: { 'admin-id': adminId }
      });
      alert("✅ User added successfully!");
      window.location.reload();
    } catch (error) {
      console.error("❌ Error adding user:", error);
    }
  };
  
  const addDeal = async () => {
    try {
      await axios.post('/api/admin/add-deal', newDeal.value, {
        headers: { 'admin-id': adminId }
      });
      alert("✅ Deal added successfully!");
      window.location.reload();
    } catch (error) {
      console.error("❌ Error adding deal:", error);
    }
  };
  </script>
  
  <style scoped>
  .admin-dashboard {
    max-width: 900px;
    margin: 20px auto;
    padding: 20px;
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
  }
  
  .admin-section {
    margin-bottom: 30px;
    padding: 15px;
    border-bottom: 2px solid #eeeeee;
  }
  
  h2 {
    text-align: center;
    color: #333;
  }
  
  h3 {
    color: #444;
    margin-bottom: 10px;
  }
  
  .form-group {
    display: flex;
    gap: 15px;
    margin-bottom: 10px;
  }
  
  input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
  }
  
  .btn {
    background-color: #4CAF50;
    color: white;
    padding: 10px 15px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
    display: block;
    margin: 10px auto 0;
  }
  
  .btn:hover {
    background-color: #45a049;
  }
  
  /* Employee Table */
  .employee-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
  }
  
  .employee-table th, .employee-table td {
    padding: 10px;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }
  
  .employee-table th {
    background-color: #f2f2f2;
  }
  
  .employee-table tr:hover {
    background-color: #f1f1f1;
  }
  </style>
  
