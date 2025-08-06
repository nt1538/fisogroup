<template>
  <div class="dashboard">
    <Sidebar />
    <div class="form-container">
      <h1>Electronic Fund Transfers (EFT)</h1>
      <p>
        Please fill out the following information to authorize electronic fund transfers for your commissions and reimbursements.
      </p>

      <div class="form-grid">
        <div class="form-field">
          <label>Account Owner Name:</label>
          <input v-model="form['Account Owner Name']" type="text" placeholder="Account Owner Name" />
        </div>

        <div class="form-field">
          <label>Transit/ABA #:</label>
          <input v-model="form['Transit/ABA #']" type="text" placeholder="Transit/ABA #" />
        </div>

        <div class="form-field">
          <label>Account #:</label>
          <input v-model="form['Account #']" type="text" placeholder="Account #" />
        </div>

        <div class="form-field">
          <label>Financial Institution Name:</label>
          <input v-model="form['Financial Institution Name']" type="text" placeholder="Institution Name" />
        </div>

        <div class="form-field">
          <label>Branch Address:</label>
          <input v-model="form['Branch Address']" type="text" placeholder="Branch Address" />
        </div>

        <div class="form-field">
          <label>City:</label>
          <input v-model="form['City']" type="text" placeholder="City" />
        </div>

        <div class="form-field">
          <label>State:</label>
          <input v-model="form['State']" type="text" placeholder="State" />
        </div>

        <div class="form-field">
          <label>Zip:</label>
          <input v-model="form['Zip']" type="text" placeholder="Zip" />
        </div>

        <div class="form-field">
          <label>Account Type:</label>
          <select v-model="form['Account Type']">
            <option disabled value="">Select Type</option>
            <option>Checking</option>
            <option>Savings</option>
          </select>
        </div>

        <div class="form-field">
          <label>Phone:</label>
          <input v-model="form['Phone']" type="tel" placeholder="123-456-7890" />
        </div>

        <div class="form-field">
          <label>Date:</label>
          <input v-model="form['Date']" type="date" />
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

      <div style="margin-top: 20px;">
        <label style="font-weight: bold;">Signature:</label>
        <vue-signature-pad
          ref="signaturePad"
          :options="{ minWidth: 1, maxWidth: 2.5, penColor: 'black' }"
          style="border: 1px solid #ccc; width: 100%; height: 200px;"
        />
        <div style="margin-top: 10px;">
          <button type="button" @click="clearSignature" style="background-color: #aaa; margin-right: 10px;">Clear Signature</button>
        </div>
      </div>

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
import VueSignaturePad from 'vue-signature-pad'

const router = useRouter()
const signaturePad = ref(null)

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
  "Date": new Date().toISOString().substring(0, 10)
})

function clearSignature() {
  signaturePad.value.clear()
}

async function submitForm() {
  if (signaturePad.value.isEmpty()) {
    alert('Please provide your signature.')
    return
  }

  // Convert signature to base64 and store
  form.value["Signature"] = signaturePad.value.saveSignature()

  // Save current form
  localStorage.setItem('newAgentPage10', JSON.stringify(form.value))

  // Collect all 10 pages of data
  const allPagesData = {}
  for (let i = 1; i <= 10; i++) {
    const pageData = localStorage.getItem(`newAgentPage${i}`)
    if (pageData) {
      Object.assign(allPagesData, JSON.parse(pageData))
    }
  }

  // Send to backend
  await fetch('/api/submit-agent-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(allPagesData)
  })

  // Clear storage
  for (let i = 1; i <= 10; i++) {
    localStorage.removeItem(`newAgentPage${i}`)
  }

  alert('All data submitted successfully!')
  router.push('/employee/dashboard')
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
input,
select {
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
