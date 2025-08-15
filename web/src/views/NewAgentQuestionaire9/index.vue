<template>
  <div class="dashboard">
    <Sidebar />
    <div class="form-container">
      <h1>Electronic Fund Transfers (EFT)</h1>
      <p>
        Please fill out the following information to authorize electronic fund transfers for your commissions and reimbursements.
      </p>

      <form @submit.prevent="submitForm">
        <div class="form-grid">
          <div class="form-field" v-for="(label, idx) in fieldOrder" :key="label">
            <label :for="`field-${idx}`">{{ label }}:</label>

            <input
              v-if="label !== 'Account Type' && label !== 'Date'"
              :id="`field-${idx}`"
              v-model="form[label]"
              type="text"
              :placeholder="label"
              autocomplete="off"
            />

            <select
              v-if="label === 'Account Type'"
              :id="`field-${idx}`"
              v-model="form[label]"
            >
              <option disabled value="">Select Type</option>
              <option>Checking</option>
              <option>Savings</option>
            </select>

            <input
              v-if="label === 'Date'"
              :id="`field-${idx}`"
              type="date"
              v-model="form[label]"
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

        <div class="signature-section">
          <label style="font-weight: bold;">Signature:</label>
          <canvas ref="signatureCanvas" class="signature-pad"></canvas>
          <div class="buttons">
            <button type="button" @click="clearSignature" style="background-color: #aaa; margin-top: 10px;">
              Clear Signature
            </button>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" :disabled="isSubmitting">
            <span v-if="!isSubmitting">Submit</span>
            <span v-else>Submitting…</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import SignaturePad from 'signature_pad'
import Sidebar from '@/components/Sidebar.vue'

const router = useRouter()
const signatureCanvas = ref(null)
let signaturePad
const isSubmitting = ref(false)

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
  'Signature': '' // base64 (jpeg) only
})

function resizeCanvas(canvas) {
  const ratio = Math.max(window.devicePixelRatio || 1, 1)
  const data = signaturePad?.toData()
  canvas.width = canvas.offsetWidth * ratio
  canvas.height = canvas.offsetHeight * ratio
  canvas.getContext('2d').scale(ratio, ratio)
  if (data && signaturePad) signaturePad.fromData(data)
}

function handleResize() {
  if (!signatureCanvas.value) return
  resizeCanvas(signatureCanvas.value)
}

onMounted(() => {
  const canvas = signatureCanvas.value
  resizeCanvas(canvas)
  signaturePad = new SignaturePad(canvas, {
    penColor: 'black',
    backgroundColor: 'white'
  })
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})

function clearSignature() {
  signaturePad?.clear()
}

function sigToJPEGBase64() {
  const src = signatureCanvas.value
  const w = Math.max(600, src.offsetWidth)
  const h = 200
  const tmp = document.createElement('canvas')
  tmp.width = w
  tmp.height = h
  const ctx = tmp.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(src, 0, 0, w, h)
  return tmp.toDataURL('image/jpeg', 0.7).split(',')[1]
}

function collectAllPagesData() {
  const pages = {};
  for (let i = 1; i <= 10; i++) {
    const raw = localStorage.getItem(`newAgentPage${i}`);
    if (!raw) continue;
    try {
      pages[`page${i}`] = JSON.parse(raw);
    } catch (e) {
      console.warn(`Skipping malformed newAgentPage${i}`, e);
    }
  }
  return { pages }; // <— key change: wrap as { pages: { page1: {...}, ... } }
}

async function submitForm() {
  try {
    if (!signaturePad || signaturePad.isEmpty()) {
      alert('Please provide your signature.');
      return;
    }

    isSubmitting.value = true;

    // 1) Build EFT payload for *this* page
    const eftPayload = {
      account_owner_name: form.value['Account Owner Name'] || '',
      transit_aba:        form.value['Transit/ABA #'] || '',
      account_number:     form.value['Account #'] || '',
      institution_name:   form.value['Financial Institution Name'] || '',
      branch_address:     form.value['Branch Address'] || '',
      city:               form.value['City'] || '',
      state:              form.value['State'] || '',
      zip:                form.value['Zip'] || '',
      account_type:       form.value['Account Type'] || '',
      phone:              form.value['Phone'] || '',
      date:               form.value['Date'] || '',
      // base64 (no data: prefix) to keep payload small; admin PDF code already handles images
      EFTSignature:       sigToJPEGBase64()
    };

    // 2) Save as the *10th page* in localStorage (consistent with your other pages)
    localStorage.setItem('newAgentPage10', JSON.stringify(eftPayload));

    // 3) Collect ALL pages (1..10) and submit to backend
    const payload = collectAllPagesData();

    const res = await fetch('/api/submit-agent-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Submit failed (${res.status}): ${text || 'No response body'}`);
    }

    // 4) Clean up
    for (let i = 1; i <= 10; i++) {
      localStorage.removeItem(`newAgentPage${i}`);
    }

    alert('All data submitted successfully!');
    router.push('/employee/dashboard');
  } catch (err) {
    console.error(err);
    alert(`Error submitting form: ${err.message}`);
  } finally {
    isSubmitting.value = false;
  }
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
button[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}
button:hover:not([disabled]) {
  background-color: #003f82;
}
</style>