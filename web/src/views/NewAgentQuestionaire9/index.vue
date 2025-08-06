<template>
  <div class="dashboard">
    <Sidebar />
    <div class="form-container">
      <h1>Electronic Fund Transfers (EFT)</h1>
      <p>
        Please fill out the following information to authorize electronic fund transfers for your commissions and reimbursements.
      </p>

      <div class="form-grid">
        <div class="form-field" v-for="(value, key) in fieldOrder" :key="key">
          <label>{{ key }}:</label>
          <input
            v-if="key !== 'Account Type' && key !== 'Date'"
            v-model="form[key]"
            type="text"
            :placeholder="key"
          />
          <select v-if="key === 'Account Type'" v-model="form[key]">
            <option disabled value="">Select Type</option>
            <option>Checking</option>
            <option>Savings</option>
          </select>
          <input v-if="key === 'Date'" type="date" v-model="form[key]" />
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

      <div class="signature-section">
        <label style="font-weight: bold;">Signature:</label>
        <canvas ref="signatureCanvas" class="signature-pad"></canvas>
        <div class="buttons">
          <button type="button" @click="clearSignature" style="background-color: #aaa; margin-top: 10px;">Clear Signature</button>
        </div>
      </div>

      <div class="form-actions">
        <button @click="submitForm">Submit</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import SignaturePad from 'signature_pad'
import Sidebar from '@/components/Sidebar.vue'

const router = useRouter()
const signatureCanvas = ref(null)
let signaturePad

const fieldOrder = [
  'Account Owner Name',
  'Transit/ABA #',
  'Account #',
  'Financial Institution Name',
  'Branch Address',
  'City',
  'State',
  'Zip',
  'Account Type',
  'Phone',
  'Date'
]

const form = ref({
  'Account Owner Name': '',
  'Transit/ABA #': '',
  'Account #': '',
  'Financial Institution Name': '',
  'Branch Address': '',
  'City': '',
  'State': '',
  'Zip': '',
  'Account Type': '',
  'Phone': '',
  'Date': new Date().toISOString().substring(0, 10),
  'Signature': ''
})

onMounted(() => {
  const canvas = signatureCanvas.value
  resizeCanvas(canvas)
  signaturePad = new SignaturePad(canvas, {
    penColor: 'black',
    backgroundColor: 'white'
  })
})

function resizeCanvas(canvas) {
  const ratio = Math.max(window.devicePixelRatio || 1, 1)
  canvas.width = canvas.offsetWidth * ratio
  canvas.height = canvas.offsetHeight * ratio
  canvas.getContext('2d').scale(ratio, ratio)
}

function clearSignature() {
  signaturePad.clear()
}

async function submitForm() {
  if (signaturePad.isEmpty()) {
    alert('Please provide your signature.')
    return
  }

  form.value.Signature = signaturePad.toDataURL()

  // Save current page
  localStorage.setItem('newAgentPage10', JSON.stringify(form.value))

  // Collect all pages' data
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

  // Clean up local storage
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
.signature-section {
  margin-top: 30px;
}
.signature-pad {
  width: 100%;
  height: 200px;
  border: 2px solid #000;
  border-radius: 6px;
  background-color: white;
  touch-action: none;
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
