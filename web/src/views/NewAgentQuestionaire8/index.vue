<template>
  <div class="dashboard">
    <Sidebar />
    <div class="form-container">
      <h1>Non-Solicitation Agreement</h1>

      <p>
        This Agreement is made and effective on
        <input type="date" v-model="agreementDate" /> <br /><br />
        BETWEEN: <strong>FISO GROUP LLC.</strong> (the “Agency”), a company organized and existing under the laws of the State of
        <strong>ILLINOIS</strong>,<br />
        AND:
        <input v-model="agentName" type="text" placeholder="Agent Full Name" />
        (the “Agent”), an individual who is a licensed insurance agent under the laws of the State of
        <input v-model="agentState" type="text" placeholder="e.g. New York" />, with residency located at
        <input v-model="agentAddress" type="text" placeholder="Agent Full Address" />.
      </p>

      <h2>Agreement Terms</h2>
      <ol>
        <li>
          <strong>No Business Solicitation:</strong> The Agent shall not engage in any business solicitation
          (e.g. recruiting, commission...etc) with other agents or their clients of FISO.
        </li>
        <li>
          <strong>No Recording:</strong> The Agent shall not conduct any form of video or audio recording during the training, meeting, conference, and seminar, etc., which is held by FISO.
        </li>
      </ol>

      <p>
        In the event that the Agent fails to abide by the above regulations, the Agent would be asked to
        leave the event immediately, and the Agency reserves the right to terminate any affiliation with
        the Agent.
      </p>

      <h3>Agreement Confirmation</h3>

      <div class="signature-block">
        <div>
          <label>Agent Signature Name:</label>
          <input v-model="agentSignatureName" type="text" placeholder="Agent Signature Name" />
        </div>
        <div>
          <label>FISO GROUP LLC Signature:</label>
          <input type="text" disabled value="FISO GROUP LLC (Authorized)" />
        </div>
      </div>

      <div class="signature-section">
        <h2>Please sign in the box below</h2>
        <canvas ref="signatureCanvas" class="signature-pad"></canvas>
        <div class="buttons">
          <button @click="clearSignature">Clear</button>
        </div>
      </div>

      <div class="form-actions">
        <button @click="submitForm">Submit</button>
        <button @click="skip" style="margin-left: 10px;">Skip</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SignaturePad from 'signature_pad'
import { useRouter } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'

const router = useRouter()
const signatureCanvas = ref(null)
let signaturePad

// Fields
const agreementDate = ref(new Date().toISOString().substring(0, 10))
const agentName = ref(localStorage.getItem('full_name') || '')
const agentState = ref('')
const agentAddress = ref('')
const agentSignatureName = ref(agentName.value)

onMounted(() => {
  const canvas = signatureCanvas.value
  resizeCanvas(canvas)
  signaturePad = new SignaturePad(canvas, {
    penColor: 'black',
    backgroundColor: 'white',
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

function submitForm() {
  if (signaturePad.isEmpty()) {
    alert('Please provide a drawn signature.')
    return
  }

  const form = {
    agreementDate: agreementDate.value,
    agentName: agentName.value,
    agentState: agentState.value,
    agentAddress: agentAddress.value,
    agentSignature: agentSignatureName.value,
    agentDrawnSignature: signaturePad.toDataURL()
  }

  localStorage.setItem('newAgentPage9', JSON.stringify(form))
  alert('Agreement saved successfully.')
  router.push('/employee/form10') // go to next page
}

function skip() {
  router.push('/employee/form10')
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
p,
li {
  font-size: 15px;
  margin-bottom: 10px;
  line-height: 1.6;
}
input {
  margin: 4px 0;
  padding: 6px 10px;
  width: 250px;
  border-radius: 4px;
  border: 1px solid #ccc;
}
.signature-block {
  display: flex;
  gap: 40px;
  margin-top: 20px;
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
.buttons {
  margin-top: 10px;
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
