<template>
    <div class="dashboard">
      <Sidebar />
  
      <div class="page-container">
        <h1 class="title">My FISO Documents</h1>
        <div class="placeholder-card">
          <p>This section will display uploaded FISO documents.</p>
          <p>You can add files or documents here later.</p>
        </div>
  
        <h1 class="title">Licensing</h1>
        <div class="placeholder-card">
          <p>This section will show your licensing files and statuses.</p>
          <p>Use this area to store or present downloadable licenses and certificates.</p>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import Sidebar from '@/components/Sidebar.vue';
  </script>
  
  <style scoped>
  .dashboard {
    display: flex;
  }
  
  .page-container {
    flex-grow: 1;
    padding: 40px;
    margin-left: 280px;
    background: #f4f4f4;
    min-height: 100vh;
  }
  
  .title {
    font-size: 24px;
    font-weight: bold;
    color: #003366;
    margin-top: 30px;
    margin-bottom: 10px;
  }
  
  .placeholder-card {
    background: white;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 40px;
    font-size: 16px;
    color: #333;
  }
  </style>
  