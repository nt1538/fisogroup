<template>
    <div class="dashboard">
      <Sidebar /> <!-- Sidebar included -->
      <div class="profile-page">
        <h1 class="title">My Profile</h1>
  
        <div class="profile-container">
          <div class="profile-section">
            <h2>Personal Information</h2>
            <div class="info-grid">
              <div><strong>Name:</strong> {{ user.name }}</div>
              <div><strong>Email:</strong> {{ user.email }}</div>
              <div><strong>Phone:</strong> {{ user.phone || "N/A" }}</div>
              <div><strong>Department:</strong> {{ user.department || "N/A" }}</div>
              <div><strong>Position:</strong> {{ user.position || "N/A" }}</div>
              <div><strong>Role Level:</strong> <span class="badge">{{ user.role }}</span></div>
            </div>
          </div>
  
          <div class="earnings-section">
            <h2>Earnings Overview</h2>
            <p><strong>Year-To-Date (YTD) Earnings:</strong> ${{ ytdEarnings }}</p>
            <p><strong>Rolling 12-Month Earnings:</strong> ${{ rollingEarnings }}</p>
          </div>
  
          <div class="term-earnings">
            <h3>Term Earnings (Last 4 Terms)</h3>
            <table>
              <thead>
                <tr>
                  <th>Period Start</th>
                  <th>Period End</th>
                  <th>Earnings</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="term in termEarnings" :key="term.period_start">
                  <td>{{ formatDate(term.period_start) }}</td>
                  <td>{{ formatDate(term.period_end) }}</td>
                  <td>${{ term.earnings }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from "vue";
  import axios from "axios";
  import Sidebar from "@/components/Sidebar.vue";  // Sidebar included
  
  const user = ref({});
  const ytdEarnings = ref(0);
  const termEarnings = ref([]);
  const rollingEarnings = ref(0);
  
  const fetchUserData = async () => {
    try {
      const userId = JSON.parse(localStorage.getItem("user")).id;
      const { data } = await axios.get(`http://localhost:5000/api/me/${userId}`);
  
      user.value = data.user;
      ytdEarnings.value = data.ytdEarnings;
      termEarnings.value = data.termEarnings;
      rollingEarnings.value = data.rollingEarnings;
  
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };
  
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString();
  };
  
  onMounted(fetchUserData);
  </script>
  
  <style scoped>
  .dashboard {
    display: flex;
  }
  
  .profile-page {
    flex-grow: 1;
    padding: 40px;
    margin-left: 280px; /* Sidebar width to push content right */
    background: #f4f4f4;
    min-height: 100vh;
  }
  
  .title {
    font-size: 28px;
    font-weight: bold;
    color: #003366;
    margin-bottom: 20px;
  }
  
  .profile-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  
  .profile-section, .earnings-section, .term-earnings {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  h2, h3 {
    color: #003366;
  }
  
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    font-size: 16px;
  }
  
  .badge {
    background: #0055a4;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  th, td {
    border: 1px solid #ddd;
    padding: 10px;
    text-align: left;
  }
  
  th {
    background-color: #0055a4;
    color: white;
  }
  </style>
  
  