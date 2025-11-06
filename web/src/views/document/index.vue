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

      <!-- ✅ FISO SureLC Section -->
      <h1 class="title">FISO SureLC™</h1>
      <div class="surelc-card">
        <img src="@/assets/img/fiso-surelc.png" alt="FISO SureLC QR Code" class="qr" />
        <a
          href="https://surelc.surancebay.com/sbweb/login.jsp?branch=FISO%20Group&branchEditable=off&branchRequired=on&branchVisible=on&gaId=222&gaName=BGA%20Life%20Insurance%20Services"
          target="_blank"
          class="surelc-button"
        >
          Visit FISO Group SureLC™
        </a>
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

/* ✅ FISO SureLC Section */
.surelc-card {
  background: white;
  padding: 40px 30px;
  border-radius: 8px;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
  margin-bottom: 50px;
}

.qr {
  width: 200px;
  height: auto;
  display: block;
  margin: 0 auto 25px auto;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.surelc-button {
  display: inline-block;
  background-color: #003366;
  color: #fff;
  font-weight: bold;
  padding: 12px 28px;
  border-radius: 6px;
  text-decoration: none;
  transition: background-color 0.3s ease;
}

.surelc-button:hover {
  background-color: #0055aa;
}
</style>
