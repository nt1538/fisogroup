<template>
  <div class="dashboard">
    <Sidebar />
    <div class="form-container">
      <h1>History</h1>

      <form @submit.prevent="submitForm" class="form-grid">
        <h2>Employment History (Last 5 Years)</h2>
        <div
          v-for="(job, index) in employmentHistory"
          :key="'job' + index"
          class="block-section"
        >
          <h3>Employment #{{ index + 1 }}</h3>
          <div class="input-group">
            <label>From:</label>
            <input type="date" v-model="job.from" />
            <label>To:</label>
            <input type="date" v-model="job.to" />
          </div>
          <div class="input-group">
            <label>Company:</label>
            <input type="text" v-model="job.company" />
            <label>Position:</label>
            <input type="text" v-model="job.position" />
          </div>
          <div class="input-group">
            <label>Location:</label>
            <input type="text" v-model="job.location" />
          </div>
        </div>

        <h2>Address History (Last 5 Years)</h2>
        <div
          v-for="(addr, index) in addressHistory"
          :key="'addr' + index"
          class="block-section"
        >
          <h3>Address #{{ index + 1 }}</h3>
          <div class="input-group">
            <label>From:</label>
            <input type="date" v-model="addr.from" />
            <label>To:</label>
            <input type="date" v-model="addr.to" />
          </div>
          <div class="input-group">
            <label>Street Address (Line 1):</label>
            <input type="text" v-model="addr.line1" />
          </div>
          <div class="input-group">
            <label>City:</label>
            <input type="text" v-model="addr.city" />
            <label>State & Zip:</label>
            <input type="text" v-model="addr.stateZip" />
          </div>
        </div>

        <div class="form-actions">
          <button type="submit">Submit</button>
          <button type="button" @click="skipToNextPage" style="margin-left: 10px;">Skip Validation</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'

const router = useRouter()

const employmentHistory = ref([
  { from: '', to: '', company: '', position: '', location: '' },
  { from: '', to: '', company: '', position: '', location: '' },
  { from: '', to: '', company: '', position: '', location: '' }
])

const addressHistory = ref([
  { from: '', to: '', line1: '', city: '', stateZip: '' },
  { from: '', to: '', line1: '', city: '', stateZip: '' },
  { from: '', to: '', line1: '', city: '', stateZip: '' },
  { from: '', to: '', line1: '', city: '', stateZip: '' },
  { from: '', to: '', line1: '', city: '', stateZip: '' }
])

function submitForm() {
  localStorage.setItem('employmentHistory', JSON.stringify(employmentHistory.value))
  localStorage.setItem('addressHistory', JSON.stringify(addressHistory.value))
  alert('History saved successfully.')
  router.push('/employee/form7')
}

function skipToNextPage() {
  router.push('/employee/form7')
}
</script>

<style scoped>
.dashboard {
  display: flex;
  padding: 40px 40px 100px;
  height: 100vh;
  overflow-y: scroll;
}
.form-container {
  flex-grow: 1;
  padding: 40px 40px 100px;
  background-color: #f4f4f4;
  min-height: 100vh;
  margin-left: 280px;
}

h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 16px;
}
h2 {
  font-size: 20px;
  margin-top: 30px;
  margin-bottom: 10px;
}
h3 {
  font-size: 16px;
  font-weight: 600;
  margin-top: 20px;
  color: #333;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
  background: #fff;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.block-section {
  padding: 15px 0;
  border-top: 1px solid #ddd;
}

.input-group {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 10px;
}

label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

input[type='text'],
input[type='date'] {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  flex: 1;
  min-width: 200px;
}

.form-actions {
  margin-top: 30px;
}

button {
  background-color: #0055a4;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}
button:hover {
  background-color: #003f82;
}
</style>

