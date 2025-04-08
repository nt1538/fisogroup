<template>
    <div class="sidebar">
      <h2>Dashboard</h2>
      <ul>
        <li @click="toggleSection('me')" :class="{ active: activeSection === 'me' }">
          <span>👤 Me</span> ▼
        </li>
        <ul v-if="activeSection === 'me'" class="submenu">
          <li @click="navigate('/me/profile')">Profile</li>
          <li @click="navigate('/me/Application')">Application Uploads</li>
          <li @click="navigate('/me/document')">My Fiso Document</li>
          <li class="logout" @click="logout">🚪 Logout</li>
        </ul>
  
        <li @click="toggleSection('reports')" :class="{ active: activeSection === 'reports' }">
          <span>📊 Reports</span> ▼
        </li>
        <ul v-if="activeSection === 'reports'" class="submenu">
          <li @click="navigate('/reports/org-chart')">Organization Chart</li>
          <li @click="navigate('/reports/app-reports')">Application Reports</li>
          <li @click="navigate('/reports/production')">Production Report</li>
          <li @click="navigate('/reports/commission')">Commission Statement</li>
        </ul>
  
        <li @click="navigate('/licensing')">📁 Licensing</li>
      </ul>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  
  const router = useRouter();
  const activeSection = ref('');
  
  const toggleSection = (section) => {
    activeSection.value = activeSection.value === section ? '' : section;
  };
  
  const navigate = (path) => {
    activeSection.value = path.split('/')[1]; // Get main category
    router.push(path);
  };
  
  const logout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };
  </script>
  
  <style scoped>
  .sidebar {
    width: 260px;
    height: 100vh;
    background: #01294e;
    color: white;
    padding: 20px;
    position: fixed;
    top: 0;
    left: 0;
    font-size: 16px;
    font-weight: bold;
    overflow-y: auto;
  }
  
  .sidebar h2 {
    font-size: 20px;
    text-align: center;
    margin-bottom: 20px;
  }
  
  .sidebar ul {
    list-style: none;
    padding: 0;
  }
  
  .sidebar li {
    padding: 12px;
    cursor: pointer;
    transition: background 0.3s ease;
  }
  
  .sidebar li:hover {
    background: #0055a4;
  }
  
  .active {
    background: #004080;
  }
  
  .submenu {
    background: #004080;
    padding-left: 15px;
  }
  
  .submenu li {
    padding: 10px;
    font-size: 14px;
  }
  
  .logout {
    color: red;
  }
  
  @media (max-width: 768px) {
    .sidebar {
      width: 200px;
    }
  }
  </style>
  