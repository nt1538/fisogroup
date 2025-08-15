<template>
  <div class="dashboard">
    <Sidebar />
    <div class="upload-page">
      <h1>Submit New Application</h1>

      <form @submit.prevent="submitForm" class="upload-form">
        <!-- Product type -->
        <div class="form-row">
          <label>Product Type:</label>
          <select v-model="form.product_type" :disabled="locked" required>
            <option disabled value="">Select</option>
            <option value="life">Life</option>
            <option value="annuity">Annuity</option>
          </select>
        </div>

        <!-- Carrier (from catalog) -->
        <div class="form-row">
          <label>Carrier:</label>
          <select v-model="selectedCarrier" :disabled="locked || !form.product_type" required>
            <option disabled value="">Select a carrier</option>
            <option v-for="c in carriers" :key="c.value" :value="c.value">
              {{ c.label }}
            </option>
            <option v-if="!carriers.length" disabled value="">No carriers found</option>
          </select>
        </div>

        <!-- Product (from catalog, + Other) -->
        <div class="form-row" v-if="form.product_type">
          <label>Product:</label>
          <select v-model="selectedProductKey" :disabled="locked || !selectedCarrier" required>
            <option disabled value="">Select a product</option>
            <option
              v-for="opt in productOptions"
              :key="opt.key"
              :value="opt.key"
            >
              {{ opt.label }}
            </option>
            <option value="__OTHER__">Other (not listed)</option>
          </select>
        </div>

        <!-- If Other: free-text product name (required) -->
        <div class="form-row" v-if="selectedProductKey === '__OTHER__'">
          <label>Enter Product Name:</label>
          <input v-model="manualProductName" :disabled="locked" placeholder="Type the product name" required />
        </div>

        <!-- If annuity and:
             - known product with multiple brackets -> show age bracket chooser
             - Other -> allow free text age bracket (optional) -->
        <div class="form-row" v-if="form.product_type === 'annuity' && showAnnuityBracketRow">
          <label>Age Bracket:</label>

          <template v-if="selectedProductKey !== '__OTHER__' && bracketOptions.length > 0">
            <select v-model="selectedAgeBracket" :disabled="locked" required>
              <option disabled value="">Select age bracket</option>
              <option v-for="b in bracketOptions" :key="b || 'none'" :value="b">
                {{ b || '—' }}
              </option>
            </select>
          </template>

          <template v-else-if="selectedProductKey === '__OTHER__'">
            <input v-model="manualAgeBracket" :disabled="locked" placeholder="e.g. Ages 0-70 (optional)" />
          </template>
        </div>

        <!-- Auto-filled read-only product rate when known product -->
        <div class="form-row">
          <label>Product Rate (%):</label>
          <input :value="displayProductRate" type="number" readonly />
          <small v-if="selectedProductKey === '__OTHER__'">
            Will be set by admin later for unlisted products.
          </small>
        </div>

        <!-- Dates & policy info -->
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
        <div class="form-row" v-if="form.product_type === 'life'">
          <label>Face Amount:</label>
          <input v-model.number="form.face_amount" type="number" min="0" step="0.01" />
          <label>Target Premium:</label>
          <input v-model.number="form.target_premium" type="number" min="0" step="0.01" />
        </div>

        <div class="form-row">
          <label>Planned Premium:</label>
          <input v-model.number="form.initial_premium" type="number" min="0" step="0.01" required />
        </div>

        <div class="form-row" v-if="form.product_type === 'annuity'">
          <label>Base Premium:</label>
          <input v-model.number="form.flex_premium" type="number" min="0" step="0.01" required />
        </div>

        <!-- Split -->
        <div class="form-row">
          <label>
            <input type="checkbox" v-model="isSplit" :disabled="locked" />
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
import axios from '@/config/axios.config'
import Sidebar from '@/components/Sidebar.vue'

const user = JSON.parse(localStorage.getItem('user') || '{}')

const submitted = ref(false)
const isSplit = ref(false)
const locked = ref(false) // lock carrier/product once a known product is selected

// catalog selections
const carriers = ref([]) // [{ value, label }]
const products = ref([])

const selectedCarrier = ref('')
const selectedProductKey = ref('') // encoded key for product; "__OTHER__" means manual
const selectedAgeBracket = ref('')

// manual fields for "Other"
const manualProductName = ref('')
const manualAgeBracket = ref('')

// form payload
const form = ref({
  insured_name: '',
  product_type: '',
  carrier_name: '',
  product_name: '',
  application_date: '',
  policy_number: '',
  face_amount: null,
  target_premium: null,
  initial_premium: null,
  flex_premium: null,
  product_rate: null, // auto when known product, null when Other
  // split
  split_percent: 100,
  split_with_id: '',
})

// computed helpers
const canSubmit = computed(() => {
  if (!form.value.product_type) return false
  if (!form.value.application_date || !form.value.policy_number || !form.value.insured_name) return false
  if (!form.value.carrier_name) return false

  // product name must be present:
  if (selectedProductKey.value === '__OTHER__') {
    if (!manualProductName.value) return false
  } else {
    if (!form.value.product_name) return false
  }

  // life/annuity specific amounts
  if (form.value.product_type === 'life') {
    if (form.value.initial_premium == null) return false
  } else {
    if (form.value.initial_premium == null || form.value.flex_premium == null) return false
    // if product has bracket variants, require a chosen or manual bracket
    if (showAnnuityBracketRow.value) {
      if (selectedProductKey.value === '__OTHER__') {
        // manualAgeBracket is optional; no block
      } else if (bracketOptions.value.length > 0 && !selectedAgeBracket.value) {
        return false
      }
    }
  }
  return true
})

const productOptions = computed(() => {
  if (form.value.product_type === 'life') {
    return products.value.map(p => ({
      key: encodeKey(p.product_name),
      label: `${p.product_name}${p.life_product_type ? ' (' + p.life_product_type + ')' : ''}`,
      product_name: p.product_name,
      product_rate: Number(p.product_rate),
      type: p.life_product_type || null
    }))
  } else {
    const names = [...new Set(products.value.map(p => p.product_name))]
    return names.map(name => ({
      key: encodeKey(name),
      label: name
    }))
  }
})

const bracketOptions = computed(() => {
  if (form.value.product_type !== 'annuity') return []
  if (!selectedProductKey.value || selectedProductKey.value === '__OTHER__') return []
  const { productName } = decodeKey(selectedProductKey.value)
  const rows = products.value.filter(p => p.product_name === productName)
  const opts = [...new Set(rows.map(r => r.age_bracket || ''))]
  return opts
})

const showAnnuityBracketRow = computed(() => form.value.product_type === 'annuity' && (selectedProductKey.value !== ''))

const displayProductRate = computed(() => {
  return form.value.product_rate != null ? Number(form.value.product_rate).toFixed(2) : ''
})

// watchers to load catalog & bind selected choice
watch(() => form.value.product_type, async (type) => {
  resetSelection()
  if (!type) return
  await loadCarriers(type)
})

watch(selectedCarrier, async (carrier) => {
  selectedProductKey.value = ''
  selectedAgeBracket.value = ''
  products.value = []
  form.value.carrier_name = ''
  form.value.product_name = ''
  form.value.product_rate = null
  manualProductName.value = ''
  manualAgeBracket.value = ''

  if (!carrier || !form.value.product_type) return
  form.value.carrier_name = carrier
  await loadProducts(form.value.product_type, carrier)
})

watch([selectedProductKey, selectedAgeBracket, manualProductName, manualAgeBracket], () => {
  // When selection changes, compute bindings
  if (!form.value.product_type || !selectedCarrier.value) {
    form.value.carrier_name = ''
    form.value.product_name = ''
    form.value.product_rate = null
    locked.value = false
    return
  }

  form.value.carrier_name = selectedCarrier.value

  // OTHER case: free text, keep rate null, not locked
  if (selectedProductKey.value === '__OTHER__') {
    form.value.product_name = manualProductName.value || ''
    form.value.product_rate = null
    locked.value = false
    return
  }

  // Known product
  const { productName } = decodeKey(selectedProductKey.value)
  if (form.value.product_type === 'life') {
    const row = products.value.find(p => p.product_name === productName)
    if (row) {
      form.value.product_name = row.product_name
      form.value.product_rate = Number(row.product_rate)
      locked.value = true
    } else {
      form.value.product_name = ''
      form.value.product_rate = null
      locked.value = false
    }
  } else {
    // annuity rows can vary by age_bracket
    const rows = products.value.filter(p => p.product_name === productName)
    if (rows.length === 0) {
      form.value.product_name = ''
      form.value.product_rate = null
      locked.value = false
      return
    }
    if (rows.length === 1) {
      const row = rows[0]
      form.value.product_name = row.product_name
      form.value.product_rate = Number(row.product_rate)
      selectedAgeBracket.value = row.age_bracket || ''
      locked.value = true
    } else {
      // require bracket selection
      const chosen = rows.find(r => (r.age_bracket || '') === (selectedAgeBracket.value || ''))
      if (chosen) {
        form.value.product_name = chosen.product_name
        form.value.product_rate = Number(chosen.product_rate)
        locked.value = true
      } else {
        form.value.product_name = ''
        form.value.product_rate = null
        locked.value = false
      }
    }
  }
})

// catalog calls (adjust paths if yours differ)
async function loadCarriers(type) {
  carriers.value = []
  products.value = []
  try {
    const url = type === 'life' ? '/catalog/life/carriers' : '/catalog/annuity/carriers'
    const { data } = await axios.get(url)
    carriers.value = normalizeCarriersData(data)
    if (!carriers.value.length) {
      console.warn('No carriers returned from', url, data)
    }
  } catch (e) {
    console.error('Failed loading carriers', e)
  }
}

async function loadProducts(type, carrier) {
  products.value = []
  try {
    if (type === 'life') {
      const { data } = await axios.get('/catalog/life/products', { params: { carrier } })
      products.value = Array.isArray(data) ? data : (data?.data || data?.products || [])
    } else {
      const { data } = await axios.get('/catalog/annuity/products', { params: { carrier } })
      products.value = Array.isArray(data) ? data : (data?.data || data?.products || [])
    }
  } catch (e) {
    console.error('Failed loading products', e)
  }
}

// Turn various backend shapes into [{value, label}]
function normalizeCarriersData(raw) {
  if (!raw) return []
  if (raw.carriers) return normalizeCarriersData(raw.carriers)
  if (raw.data) return normalizeCarriersData(raw.data)
  if (Array.isArray(raw)) {
    if (!raw.length) return []
    if (typeof raw[0] === 'string') {
      return raw.map(name => ({ value: name, label: name }))
    }
    return raw
      .map(row => {
        const name =
          row.carrier_name ??
          row.name ??
          row.carrier ??
          row.label ??
          row.title ??
          ''
        return name ? { value: String(name), label: String(name) } : null
      })
      .filter(Boolean)
  }
  return []
}

// helpers to encode/decode a selection key
function encodeKey(productName) {
  return encodeURIComponent(productName)
}
function decodeKey(key) {
  return { productName: decodeURIComponent(key) }
}

// reset selection so agent can re-choose (e.g., picked the wrong product)
function resetSelection() {
  locked.value = false
  carriers.value = []
  products.value = []
  selectedCarrier.value = ''
  selectedProductKey.value = ''
  selectedAgeBracket.value = ''
  manualProductName.value = ''
  manualAgeBracket.value = ''
  form.value.carrier_name = ''
  form.value.product_name = ''
  form.value.product_rate = null
}

// submit
const submitForm = async () => {
  try {
    const endpoint = form.value.product_type === 'life'
      ? '/orders/life'
      : '/orders/annuity'

    // split defaults
    if (!isSplit.value) {
      form.value.split_percent = 100
      form.value.split_with_id = ''
    }

    // Build payload; product_rate may be null for "Other"
    const payload = {
      ...form.value,
      user_id: user.id,
      full_name: user.name,
      national_producer_number: user.npn || '',
      license_number: user.license_number || '',
      hierarchy_level: user.hierarchy_level || '',
      commission_percent: user.level_percent || 70,
      application_status: 'in_progress',
      mra_status: 'none',
      order_type: 'Personal Commission'
    }

    // If annuity + known bracket: include selectedAgeBracket (optional to store now)
    if (form.value.product_type === 'annuity') {
      payload.age_bracket = (selectedProductKey.value === '__OTHER__')
        ? (manualAgeBracket.value || null)
        : (selectedAgeBracket.value || null)
    }

    await axios.post(endpoint, payload)

    submitted.value = true
    setTimeout(() => (submitted.value = false), 3000)

    // reset form after submit
    form.value = {
      insured_name: '',
      product_type: '',
      carrier_name: '',
      product_name: '',
      application_date: '',
      policy_number: '',
      face_amount: null,
      target_premium: null,
      initial_premium: null,
      flex_premium: null,
      product_rate: null,
      split_percent: 100,
      split_with_id: '',
    }
    isSplit.value = false
    resetSelection()
  } catch (err) {
    console.error('Submission failed', err)
    alert('Submission failed. Please try again.')
  }
}
</script>

<style scoped>
.dashboard {
  display: flex;
  overflow-y: auto;
}
.upload-page {
  flex-grow: 1;
  padding: 40px;
  background: #f4f4f4;
  min-height: 100vh;
  margin-left: 280px;
}
.upload-form {
  background: white;
  padding: 30px;
  border-radius: 10px;
  max-width: 720px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.form-row {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
}
label {
  font-weight: bold;
  margin-bottom: 5px;
}
input, select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
}
.button-row {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}
button {
  background-color: #0055a4;
  color: white;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
button.ghost {
  background: transparent;
  color: #0055a4;
  border: 1px solid #0055a4;
}
.success-msg {
  margin-top: 20px;
  background: #e0ffe0;
  padding: 15px;
  border-radius: 5px;
  color: green;
}
</style>
