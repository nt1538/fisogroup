<template>
  <div class="dashboard">
    <Sidebar />
    <div class="form-container">
      <h1>Signature Authorization</h1>

      <div class="authorization-text">
        <p>
          I, <strong>{{ fullName || '[Your Full Name]' }}</strong>, hereby authorize SuranceBay, LLC and its general agency
          customers (the “Authorized Parties”) to affix or append a copy of my signature, as set
          forth below, to any and all required signature fields on forms and agreements of any
          insurance carrier (a “Carrier”) designated by me through the SureLC software or through
          any other means, including without limitation, by e-mail or orally.
        </p>
        <p>
          The Authorized Parties shall be permitted to complete and submit all such forms and agreements on my
          behalf for the purpose of becoming authorized to sell Carrier insurance products. I hereby
          release, indemnify and hold harmless the Authorized Parties against any and all claims,
          demands, losses, damages, and causes of action, including expenses, costs and
          reasonable attorneys' fees which they may sustain or incur as a result of carrying out the
          authority granted hereunder.
        </p>
        <p>
          By my signature below, I certify that the information I have submitted to the Authorized
          Parties is correct to the best of my knowledge and acknowledge that I have read and
          reviewed the forms and agreements which the Authorized Parties have been authorized
          to affix my signature. I agree to indemnify and hold any third party harmless from and
          against any and all claims, demands, losses, damages, and causes of action, including
          expenses, costs and reasonable attorneys' fees which such third party may incur as a
          result of its reliance on any form or agreement bearing my signature pursuant to this
          authorization.
        </p>
      </div>

      <div class="signature-section">
        <h2>Please sign in the box below</h2>
        <canvas ref="signatureCanvas" class="signature-pad"></canvas>
        <div class="buttons">
          <button @click="clearSignature">Clear</button>
        </div>
      </div>

      <div class="form-actions">
        <button @click="submitSignature">Submit</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import SignaturePad from 'signature_pad'
import { useRouter } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'

const signatureCanvas = ref(null)
let signaturePad
const router = useRouter()
const fullName = localStorage.getItem('full_name') || ''

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
    backgroundColor: 'white',
  })
  window.addEventListener('resize', handleResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})

function clearSignature() {
  signaturePad.clear()
}

// ↓ Compress + strip header (base64 only)
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

function submitSignature() {
  if (signaturePad.isEmpty()) {
    alert('Please provide a signature before submitting.')
    return
  }

  const payload = {
    AuthorizationFullName: fullName,
    AuthorizationSignature: sigToJPEGBase64(), // base64 only
  }

  localStorage.setItem('newAgentPage8', JSON.stringify(payload))
  alert('Signature saved.')
  router.push('/employee/form8') // or next page
}

</script>

<style scoped>
.dashboard { display: flex; height: 100vh; }
.form-container { flex-grow: 1; padding: 40px; background-color: #f4f4f4; margin-left: 280px; overflow-y: auto; }
h1 { font-size: 26px; font-weight: bold; margin-bottom: 20px; }
.authorization-text p { font-size: 15px; margin-bottom: 15px; line-height: 1.5; }
.signature-section { margin-top: 30px; }
.signature-pad { width: 100%; height: 200px; border: 2px solid #000; border-radius: 6px; background-color: white; touch-action: none; }
.buttons { margin-top: 10px; }
button { padding: 10px 20px; background-color: #0055a4; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
button:hover { background-color: #003f82; }
.form-actions { margin-top: 30px; }
</style>
