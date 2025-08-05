<template>
  <div class="dashboard">
    <Sidebar />
    <div class="form-container">
      <h1>Electronic Fund Transfers (EFT)</h1>
      <p>
        Please fill out the following information to authorize electronic fund transfers for your commissions and reimbursements.
      </p>

      <div class="form-grid">
        <div class="form-field" v-for="(value, key) in form" :key="key">
          <label>{{ key }}:</label>
          <input
            v-model="form[key]"
            type="text"
            :placeholder="key"
          />
        </div>
      </div>

      <p>
        By signing below I hereby authorize the Company to initiate credit entries and, if necessary,
        adjustments for credit entries in error to the checking and/or savings account indicated on this form.
        This authority is to remain in full effect until the Company has received written notification
        from me of its termination. I understand that this authorization is subject to the terms of any
        agent or representative contract, commission agreement, or loan agreement that I may have
        now, or in the future, with the Company.
      </p>

      <div class="form-actions">
        <button @click="submitForm">Submit</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'

const router = useRouter()

const form = ref({
  "Account Owner Name": '',
  "Transit/ABA #": '',
  "Account #": '',
  "Financial Institution Name": '',
  "Branch Address": '',
  "City": '',
  "State": '',
  "Zip": '',
  "Account Type": '',
  "Phone": '',
  "Signature": '',
  "Date": new Date().toISOString().substring(0, 10),
})

function submitForm() {
  fetch('/api/submit-eft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form.value),
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || 'Form submitted successfully.')
      router.push('/employee/form11') // go to next page if needed
    })
    .catch(() => {
      alert('Failed to submit EFT form.')
    })
}

</script>

<style scoped>
.dashboard {
  display: flex;
  height: 100vh;
}
.form-container {
  flex-grow: 1;
  padding: 40px;
  background-color: #f9f9f9;
  margin-left: 280px;
  overflow-y: auto;
}
h1 {
  font-size: 26px;
  font-weight: bold;
  margin-bottom: 20px;
}
p {
  font-size: 15px;
  margin-bottom: 20px;
  line-height: 1.6;
}
input {
  margin: 4px 0;
  padding: 6px 10px;
  width: 250px;
  border-radius: 4px;
  border: 1px solid #ccc;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}
label {
  font-weight: 500;
  display: block;
  margin-bottom: 4px;
}
.form-actions {
  margin-top: 30px;
}
button {
  padding: 10px 20px;
  background-color: #0055a4;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}
button:hover {
  background-color: #003f82;
}
</style>