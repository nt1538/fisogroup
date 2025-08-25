<template>
  <div class="dashboard">
    <Sidebar />
    <div class="upload-page">
      <h1>Submit New Application</h1>

      <form @submit.prevent="submitForm" class="upload-form">
        <!-- Product type -->
        <div class="form-row">
          <label>Product Type:</label>
          <select v-model="form.product_line" :disabled="locked" required>
            <option disabled value="">Select</option>
            <option value="life">Life</option>
            <option value="annuity">Annuity</option>
          </select>
        </div>

        <!-- Carrier -->
        <div class="form-row">
          <label>Carrier:</label>
          <select v-model="selectedCarrier" :disabled="locked || !form.product_line" required>
            <option disabled value="">Select a carrier</option>
            <option v-for="c in carrierOptions" :key="c" :value="c">{{ c }}</option>
            <option value="__OTHER__">Other (type manually)</option>
          </select>
        </div>

        <!-- Manual carrier when "Other" -->
        <div class="form-row" v-if="selectedCarrier === '__OTHER__'">
          <label>Enter Carrier Name:</label>
          <input v-model="manualCarrier" :disabled="locked" placeholder="Carrier name" required />
        </div>

        <!-- Product -->
        <div class="form-row" v-if="form.product_line">
          <label>Product:</label>
          <select v-model="selectedProductKey" :disabled="locked || !selectedCarrierReal" required>
            <option disabled value="">Select a product</option>
            <option v-for="p in productOptions" :key="p.key" :value="p.key">
              {{ p.label }}
            </option>
            <option value="__OTHER__">Other (not listed)</option>
          </select>
        </div>

        <!-- Manual product when "Other" -->
        <div class="form-row" v-if="selectedProductKey === '__OTHER__'">
          <label>Enter Product Name:</label>
          <input v-model="manualProductName" :disabled="locked" placeholder="Product name" required />
        </div>

        <!-- Annuity age bracket -->
        <div class="form-row" v-if="form.product_line === 'annuity' && showBracketRow">
          <label>Age Bracket:</label>
          <template v-if="selectedProductKey !== '__OTHER__' && bracketOptions.length > 0">
            <select v-model="selectedAgeBracket" :disabled="locked" required>
              <option disabled value="">Select age bracket</option>
              <option v-for="b in bracketOptions" :key="b || 'none'" :value="b">{{ b || '—' }}</option>
            </select>
          </template>
          <template v-else-if="selectedProductKey === '__OTHER__'">
            <input v-model="manualAgeBracket" :disabled="locked" placeholder="e.g. Ages 0-70 (optional)" />
          </template>
        </div>

        <!-- Life product subtype (read-only) -->
        <div class="form-row" v-if="form.product_line === 'life'">
          <label>Life Product Type:</label>
          <input :value="displayLifeType" readonly />
        </div>

        <!-- Rate shown + stored (only product_rate) -->
        <div class="form-row">
          <label>Product Rate:</label>
          <input :value="displayProductRate" type="text" readonly />
          <small>Product Rate is based on the product you select.</small>
        </div>

        <!-- Dates & policy -->
        <div class="form-row">
          <label>Application Date:</label>
          <input type="date" v-model="form.application_date" required />
        </div>

        <div class="form-row">
          <label>Policy Number:</label>
          <input v-model="form.policy_number" required />
        </div>

        <div class="form-row">
          <label>Insured Name:</label>
          <input v-model="form.insured_name" required />
        </div>

        <!-- Amounts -->
        <div class="form-row" v-if="form.product_line === 'life'">
          <label>Face Amount:</label>
          <input v-model.number="form.face_amount" type="number" min="0" step="0.01" />
          <label>Target Premium:</label>
          <input v-model.number="form.target_premium" type="number" min="0" step="0.01" />
        </div>

        <div class="form-row">
          <label>Planned Premium:</label>
          <input v-model.number="form.initial_premium" type="number" min="0" step="0.01" required />
        </div>

        <div class="form-row" v-if="form.product_line === 'annuity'">
          <label>Base Premium:</label>
          <input v-model.number="form.flex_premium" type="number" min="0" step="0.01" required />
        </div>

        <!-- Split -->
        <div class="form-row">
          <label>
            <input type="checkbox" v-model="isSplit" />
            Split this order with another agent
          </label>
        </div>

        <div class="form-row" v-if="isSplit">
          <label>Split Percent (Another Agent):</label>
          <input type="number" v-model.number="form.split_percent" min="1" max="99" />
        </div>

        <div class="form-row" v-if="isSplit">
          <label>Split With User ID:</label>
          <input v-model="form.split_with_id" />
        </div>

        <div class="button-row">
          <button type="submit" :disabled="!canSubmit">Submit</button>
          <button type="button" class="ghost" v-if="locked" @click="resetSelection">Reset Selection</button>
        </div>
      </form>

      <div v-if="submitted" class="success-msg">
        ✅ Application successfully submitted.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import axios from '@/config/axios.config'

// ---------- HARD-CODED CATALOG ----------
const CATALOG = {
  life: {
    carriers: [
      'Allianz','Ameritas','F&G Life',
      'LSW - National Life',
      'Lincoln Financial Group','Mass Mutual',
      'Nationwide','Symetra Life Insurance Company'
    ],
    products: [
      { carrier:'Allianz', name:'Allianz Accumulator IUL', type:'IUL', product_rate:100 },
      { carrier:'Ameritas', name:'FLX Living Benefits IUL', type:'IUL', product_rate:100 },
      { carrier:'F&G Life', name:'Pathsetter (Issue Ages 18-80)', type:'IUL', product_rate:100 },
      { carrier:'LSW - National Life', name:'Level Term 10 w Living Benefits', type:'Term', product_rate:60 },
      { carrier:'LSW - National Life', name:'Level Term 15 w Living Benefits', type:'Term', product_rate:60 },
      { carrier:'LSW - National Life', name:'Level Term 20 w Living Benefits', type:'Term', product_rate:70 },
      { carrier:'LSW - National Life', name:'Level Term 30 w Living Benefits', type:'Term', product_rate:70 },
      { carrier:'LSW - National Life', name:'FlexLife II', type:'IUL', product_rate:100 },
      { carrier:'LSW - National Life', name:'PeakLife', type:'IUL', product_rate:100 },
      { carrier:'LSW - National Life', name:'Summit Life', type:'IUL', product_rate:100 },
      { carrier:'LSW - National Life', name:'SurvivorLife', type:'SIUL', product_rate:100 },
      { carrier:'Lincoln Financial Group', name:'Lincoln WealthAccelerate IUL (instant decision)', type:'IUL', product_rate:90 },
      { carrier:'Lincoln Financial Group', name:'Lincoln WealthAccumulate 2 IUL', type:'IUL', product_rate:90 },
      { carrier:'Lincoln Financial Group', name:'Lincoln WealthPreserve SIUL', type:'SIUL', product_rate:90 },
      { carrier:'Mass Mutual', name:'Universal Life Guard 6', type:'UL', product_rate:55 },
      { carrier:'Mass Mutual', name:'Survivorship Universal Life Guard 6', type:'SUL', product_rate:55 },
      { carrier:'Mass Mutual', name:'Whole Life', type:'WL', product_rate:50 },
      { carrier:'Mass Mutual', name:'Survivorship Whole Life Legacy 100', type:'SWL', product_rate:50 },
      { carrier:'Nationwide', name:'IUL Accumulator II', type:'IUL', product_rate:100 },
      { carrier:'Symetra Life Insurance Company', name:'Symetra SwiftTerm 10 & 15 Year (instant decision)', type:'Term', product_rate:70 },
      { carrier:'Symetra Life Insurance Company', name:'Symetra SwiftTerm 20 & 30 Year (instant decision)', type:'Term', product_rate:100 },
      { carrier:'Symetra Life Insurance Company', name:'Symetra Accumulator Ascent IUL 4.0', type:'IUL', product_rate:117.64 },
    ],
  },
  annuity: {
    carriers: ['Athene','Allianz','Nationwide','LSW - National Life'],
    products: [
      { carrier:'Athene', name:'SPIA I', age_bracket:null, product_rate:2.50 },
      { carrier:'Athene', name:'Athene MaxRate MYG 3', age_bracket:'Ages 0-70', product_rate:1.15 },
      { carrier:'Athene', name:'Athene MaxRate MYG 5', age_bracket:'Ages 0-70', product_rate:1.50 },
      { carrier:'Athene', name:'Athene MaxRate MYG 7', age_bracket:'Ages 0-70', product_rate:1.75 },
      { carrier:'Athene', name:'Athene Ascent Pro 10 Bonus', age_bracket:'Ages 0-70', product_rate:6.00 },
      { carrier:'Athene', name:'Performance Elite 7', age_bracket:'Ages 0-70', product_rate:4.25 },
      { carrier:'Athene', name:'Performance Elite 10', age_bracket:'Ages 0-70', product_rate:6.00 },
      { carrier:'Athene', name:'Performance Elite 15', age_bracket:'Ages 0-70', product_rate:6.00 },
      { carrier:'Athene', name:'Athene Agility 7', age_bracket:'Ages 0-70', product_rate:4.00 },
      { carrier:'Athene', name:'Athene Agility 10', age_bracket:'Ages 0-70', product_rate:6.00 },
      { carrier:'Allianz', name:'Allianz 360 Option A', age_bracket:'Ages 0-75', product_rate:6.25 },
      { carrier:'Allianz', name:'Allianz Benefit Control Option A', age_bracket:'Ages 0-75', product_rate:6.25 },
      { carrier:'Allianz', name:'Allianz 222 Option A', age_bracket:'Ages 0-75', product_rate:6.25 },
      { carrier:'Allianz', name:'Allianz Accumulation Advantage Option A', age_bracket:'Ages 0-75', product_rate:6.25 },
      { carrier:'Allianz', name:'Allianz Core Income 7 Option A', age_bracket:'Ages 0-75', product_rate:4.75 },
      { carrier:'Nationwide', name:'Nationwide New Heights Select FIA 8 - No Trail', age_bracket:'Ages 0-70', product_rate:4.00 },
      { carrier:'Nationwide', name:'Nationwide New Heights Select FIA 9 - No Trail', age_bracket:'Ages 0-70', product_rate:6.25 },
      { carrier:'Nationwide', name:'Nationwide New Heights Select FIA 9 - Option 1', age_bracket:'Ages 0-70', product_rate:2.25 },
      { carrier:'Nationwide', name:'Nationwide New Heights Select FIA 10 - No Trail', age_bracket:'Ages 0-70', product_rate:5.50 },
      { carrier:'Nationwide', name:'Nationwide New Heights Select FIA 10 - Option 1', age_bracket:'Ages 0-70', product_rate:1.25 },
      { carrier:'Nationwide', name:'Nationwide New Heights Select FIA 12 - No Trail', age_bracket:'Ages 0-70', product_rate:6.50 },
      { carrier:'Nationwide', name:'Nationwide New Heights Select FIA 12 - Option 1', age_bracket:'Ages 0-70', product_rate:2.00 },
      { carrier:'LSW - National Life', name:'SecurePlus Forte', age_bracket:'Ages 0-55', product_rate:8.75 },
      { carrier:'LSW - National Life', name:'SecurePlus Forte', age_bracket:'Ages 56-60', product_rate:6.75 },
      { carrier:'LSW - National Life', name:'SecurePlus Forte', age_bracket:'Ages 61-70', product_rate:5.25 },
      { carrier:'LSW - National Life', name:'SecurePlus Forte', age_bracket:'Ages 0-55', product_rate:7.25 },
      { carrier:'LSW - National Life', name:'SecurePlus Forte', age_bracket:'Ages 56-70', product_rate:6.25 },
      { carrier:'LSW - National Life', name:'FIT Select Income*', age_bracket:'Ages 0-70', product_rate:5.25 },
      { carrier:'LSW - National Life', name:'FIT Select Income*', age_bracket:'Ages 71-75', product_rate:3.75 },
      { carrier:'LSW - National Life', name:'FIT Secure Growth*', age_bracket:'Ages 0-70', product_rate:5.25 },
      { carrier:'LSW - National Life', name:'FIT Secure Growth*', age_bracket:'Ages 71-75', product_rate:3.75 },
      { carrier:'LSW - National Life', name:'FIT Secure Growth*', age_bracket:'Ages 76-80', product_rate:2.50 },
    ],
  }
}
// ----------------------------------------

const user = JSON.parse(localStorage.getItem('user') || '{}')
const submitted = ref(false)
const isSplit = ref(false)
const locked = ref(false)

const selectedCarrier = ref('')
const selectedProductKey = ref('')
const selectedAgeBracket = ref('')

const manualCarrier = ref('')
const manualProductName = ref('')
const manualAgeBracket = ref('')

const products = ref([]) // current product list for selected carrier & line

const form = ref({
  insured_name: '',
  product_line: '',
  carrier_name: '',
  product_name: '',
  life_product_type: null,
  age_bracket: null,
  application_date: '',
  policy_number: '',
  face_amount: null,
  target_premium: null,
  initial_premium: null,
  flex_premium: null,
  product_rate: null,          // <-- this is what we save to DB
  // split
  split_percent: 100,
  split_with_id: '',
})

const carrierOptions = computed(() => {
  if (!form.value.product_line) return []
  return CATALOG[form.value.product_line].carriers
})

const selectedCarrierReal = computed(() =>
  selectedCarrier.value === '__OTHER__' ? manualCarrier.value : selectedCarrier.value
)

const productOptions = computed(() => {
  if (!form.value.product_line || !selectedCarrierReal.value) return []
  return products.value.map((p) => ({
    key: encodeKey(p.name),
    label:
      form.value.product_line === 'life'
        ? `${p.name}${p.type ? ' (' + p.type + ')' : ''}`
        : `${p.name}${p.age_bracket ? ' — ' + p.age_bracket : ''}`,
  }))
})

const bracketOptions = computed(() => {
  if (form.value.product_line !== 'annuity') return []
  if (!selectedProductKey.value || selectedProductKey.value === '__OTHER__') return []
  const prodName = decodeKey(selectedProductKey.value)
  const rows = products.value.filter(p => p.name === prodName)
  return [...new Set(rows.map(r => r.age_bracket || ''))]
})

const showBracketRow = computed(() =>
  form.value.product_line === 'annuity' && (selectedProductKey.value !== '')
)

const displayLifeType = computed(() => form.value.life_product_type || '')
const displayProductRate = computed(() =>
  form.value.product_rate != null ? `${Number(form.value.product_rate).toFixed(2)}%` : ''
)

watch(() => form.value.product_line, () => {
  resetSelection()
})

watch(selectedCarrier, () => {
  selectedProductKey.value = ''
  selectedAgeBracket.value = ''
  products.value = []
  form.value.carrier_name = ''
  form.value.product_name = ''
  form.value.product_rate = null
  manualProductName.value = ''
  manualAgeBracket.value = ''
  if (!selectedCarrier.value || !form.value.product_line) return

  const realCarrier = selectedCarrierReal.value
  form.value.carrier_name = realCarrier
  const all = CATALOG[form.value.product_line].products
  products.value = all.filter(p => p.carrier === realCarrier)
})

watch([selectedProductKey, selectedAgeBracket, manualProductName, manualAgeBracket, selectedCarrier], () => {
  if (!form.value.product_line || !selectedCarrierReal.value) {
    form.value.carrier_name = ''
    form.value.product_name = ''
    form.value.product_rate = null
    form.value.life_product_type = null
    form.value.age_bracket = null
    locked.value = false
    return
  }

  form.value.carrier_name = selectedCarrierReal.value

  if (selectedProductKey.value === '__OTHER__') {
    form.value.product_name = manualProductName.value || ''
    form.value.product_rate = null
    form.value.life_product_type = null
    form.value.age_bracket = form.value.product_line === 'annuity' ? (manualAgeBracket.value || null) : null
    locked.value = false
    return
  }

  if (!selectedProductKey.value) {
    form.value.product_name = ''
    form.value.product_rate = null
    form.value.life_product_type = null
    form.value.age_bracket = null
    locked.value = false
    return
  }

  const prodName = decodeKey(selectedProductKey.value)
  const rows = products.value.filter(p => p.name === prodName)

  if (form.value.product_line === 'life') {
    const row = rows[0]
    if (row) {
      form.value.product_name = row.name
      form.value.product_rate = row.product_rate ?? null
      form.value.life_product_type = row.type || null
      form.value.age_bracket = null
      locked.value = true
    }
  } else {
    if (rows.length === 1) {
      const r = rows[0]
      form.value.product_name = r.name
      form.value.product_rate = r.product_rate ?? null
      form.value.age_bracket = r.age_bracket || null
      selectedAgeBracket.value = r.age_bracket || ''
      locked.value = true
    } else {
      const chosen = rows.find(r => (r.age_bracket || '') === (selectedAgeBracket.value || ''))
      if (chosen) {
        form.value.product_name = chosen.name
        form.value.product_rate = chosen.product_rate ?? null
        form.value.age_bracket = chosen.age_bracket || null
        locked.value = true
      } else {
        form.value.product_name = ''
        form.value.product_rate = null
        form.value.age_bracket = null
        locked.value = false
      }
    }
  }
})

const canSubmit = computed(() => {
  if (!form.value.product_line) return false
  if (!form.value.application_date || !form.value.policy_number || !form.value.insured_name) return false
  if (!selectedCarrierReal.value) return false
  if (selectedProductKey.value === '__OTHER__' && !manualProductName.value) return false
  if (selectedProductKey.value !== '__OTHER__' && !form.value.product_name) return false
  if (form.value.product_line === 'annuity' && showBracketRow.value && bracketOptions.value.length > 0 && !selectedAgeBracket.value) return false
  if (form.value.product_line === 'life') {
    if (form.value.initial_premium == null) return false
  } else {
    if (form.value.initial_premium == null || form.value.flex_premium == null) return false
  }
  return true
})

function resetSelection() {
  locked.value = false
  products.value = []
  selectedCarrier.value = ''
  selectedProductKey.value = ''
  selectedAgeBracket.value = ''
  manualCarrier.value = ''
  manualProductName.value = ''
  manualAgeBracket.value = ''
  form.value.carrier_name = ''
  form.value.product_name = ''
  form.value.product_rate = null
  form.value.life_product_type = null
  form.value.age_bracket = null
}

function encodeKey(s) { return encodeURIComponent(s) }
function decodeKey(k) { return decodeURIComponent(k) }

const submitForm = async () => {
  try {
    if (!isSplit.value) {
      form.value.split_percent = 100
      form.value.split_with_id = ''
    }

    const endpoint = form.value.product_line === 'life' ? '/orders/life' : '/orders/annuity'

    const payload = {
      ...form.value,
      carrier_name: selectedCarrierReal.value,
      product_name: selectedProductKey.value === '__OTHER__' ? manualProductName.value : form.value.product_name,
      age_bracket: form.value.product_line === 'annuity'
        ? (selectedProductKey.value === '__OTHER__' ? (manualAgeBracket.value || null) : (form.value.age_bracket || null))
        : null,
      user_id: (JSON.parse(localStorage.getItem('user') || '{}').id),
      full_name: (JSON.parse(localStorage.getItem('user') || '{}').name),
      order_type: 'Personal Commission',
      application_status: 'in_progress',
      mra_status: 'none',
    }

    await axios.post(endpoint, payload)
    submitted.value = true
    setTimeout(() => (submitted.value = false), 3000)

    // reset
    Object.assign(form.value, {
      insured_name: '', product_line: '', carrier_name: '', product_name: '',
      life_product_type: null, age_bracket: null, application_date: '', policy_number: '',
      face_amount: null, target_premium: null, initial_premium: null, flex_premium: null,
      product_rate: null, split_percent: 100, split_with_id: '',
    })
    isSplit.value = false
    resetSelection()
  } catch (err) {
    console.error('Submission failed', err)
    alert('Submission failed. Please try again.')
  }
}
</script>

<style scoped>
.dashboard { display: flex; overflow-y: auto; }
.upload-page { flex-grow: 1; padding: 40px; background: #f4f4f4; min-height: 100vh; margin-left: 280px; }
.upload-form { background: white; padding: 30px; border-radius: 10px; max-width: 720px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.form-row { margin-bottom: 15px; display: flex; flex-direction: column; }
label { font-weight: bold; margin-bottom: 5px; }
input, select { padding: 8px; border: 1px solid #ccc; border-radius: 6px; }
.button-row { display: flex; gap: 10px; margin-top: 10px; }
button { background-color: #0055a4; color: white; padding: 10px 16px; border: none; border-radius: 6px; cursor: pointer; }
button.ghost { background: transparent; color: #0055a4; border: 1px solid #0055a4; }
.success-msg { margin-top: 20px; background: #e0ffe0; padding: 15px; border-radius: 5px; color: green; }
</style>
