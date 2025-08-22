<template>
  <AdminLayout>
    <h2>Edit Order #{{ orderId }}</h2>

    <div v-if="order">
      <div
        class="form-group"
        v-for="{ key, value } in filteredFields"
        :key="key"
      >
        <label :for="key">
          {{ key.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) }}
          <span
            v-if="isCompleting && requiredOnComplete.has(key)"
            class="required-badge"
          >*</span>
        </label>

        <!-- Status -->
        <template v-if="key === 'application_status'">
          <select v-model="order[key]" :id="key">
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </template>

        <!-- Policy number -->
        <template v-else-if="key === 'policy_number'">
          <input type="text" v-model="order[key]" :id="key" />
        </template>

        <!-- Date fields -->
        <template v-else-if="dateFieldsSet.has(key)">
          <input
            type="date"
            v-model="order[key]"
            :id="key"
            :class="{ 'error-input': errors[key] }"
          />
        </template>

        <!-- Numeric fields -->
        <template v-else-if="numericFieldsSet.has(key)">
          <input
            type="number"
            v-model.number="order[key]"
            :id="key"
            step="0.01"
            :class="{ 'error-input': errors[key] }"
          />
        </template>

        <!-- Text fields -->
        <template v-else>
          <input type="text" v-model="order[key]" :id="key" />
        </template>

        <small v-if="errors[key]" class="error-text">{{ errors[key] }}</small>
      </div>

      <div class="button-row">
        <button @click="saveOrder">Save</button>
        <!-- <button class="delete" @click="confirmDelete">Delete</button> -->
      </div>
    </div>

    <div v-else>Loading...</div>

    <!-- <div v-if="showDeleteConfirm" class="confirm-dialog">
      <p>Are you sure you want to permanently delete this order?</p>
      <div class="dialog-buttons">
        <button @click="showDeleteConfirm = false">Cancel</button>
        <button class="delete" @click="deleteOrder">Confirm Delete</button>
      </div>
    </div> -->
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from '@/config/axios.config'
import AdminLayout from '@/layout/src/AdminLayout.vue'

/** ------- routing / state -------- */
const route = useRoute()
const router = useRouter()
const orderId = route.params.id
const tableType = route.params.table_type // e.g. 'application_life' | 'application_annuity' | 'commission_life' | 'commission_annuity'

const order = ref(null)
const showDeleteConfirm = ref(false)

/** ------- field whitelists / typing helpers -------- */
const editableFields = ref({
  product_name: '',
  carrier_name: '',
  application_date: '',
  commission_distribution_date: '',
  policy_effective_date: '',
  policy_number: '',
  face_amount: 0,             // Life only
  target_premium: 0,          // Life only
  flex_premium: 0,            // Annuity only
  initial_premium: 0,
  product_rate: 100,          // percent (life default 100, annuity default 6)
  commission_from_carrier: 0,
  commission_amount: null,    // optional for commission tables
  commission_percent: null,   // optional
  application_status: '',
  mra_status: '',
  split_with_id: '',
  split_percent: 0,
  explanation: '',
  insured_name: '',
  writing_agent: '',
})

// For clean template checks
const dateFieldsSet = new Set(['application_date','commission_distribution_date','policy_effective_date'])
const numericFieldsSet = new Set([
  'face_amount','target_premium','flex_premium','initial_premium',
  'product_rate','commission_from_carrier','commission_amount','commission_percent','split_percent'
])

/** ------- filtered fields (no v-if inside v-for) -------- */
const filteredFields = computed(() => {
  return Object.entries(editableFields.value)
    .filter(([key]) => {
      if (tableType === 'application_life' || tableType === 'commission_life') {
        return key !== 'flex_premium'
      }
      if (tableType === 'application_annuity' || tableType === 'commission_annuity') {
        return key !== 'face_amount' && key !== 'target_premium'
      }
      return true
    })
    .map(([key, value]) => ({ key, value }))
})

/** ------- validation when completing -------- */
const requiredOnComplete = new Set([
  'commission_distribution_date',
  'commission_from_carrier',
  'product_rate',
])
const errors = ref({})
const isCompleting = computed(() => order.value?.application_status === 'completed')

function isEmpty(v) {
  return v === '' || v === null || v === undefined
}
function validateOnComplete() {
  errors.value = {}
  if (!isCompleting.value) return true

  const cdd = order.value?.commission_distribution_date
  if (isEmpty(cdd) || isNaN(new Date(cdd).getTime())) {
    errors.value.commission_distribution_date = 'Required when completing.'
  }

  const cfcRaw = order.value?.commission_from_carrier
  if (isEmpty(cfcRaw)) {
    errors.value.commission_from_carrier = 'Required when completing.'
  } else {
    const cfc = Number(cfcRaw)
    if (!Number.isFinite(cfc) || cfc < 0) {
      errors.value.commission_from_carrier = 'Enter a non-negative number.'
    }
  }

  const prRaw = order.value?.product_rate
  if (isEmpty(prRaw)) {
    errors.value.product_rate = 'Required when completing.'
  } else {
    const pr = Number(prRaw)
    if (!Number.isFinite(pr) || pr < 0 || pr > 200) {
      errors.value.product_rate = 'Enter a percent between 0 and 200.'
    }
  }

  return Object.keys(errors.value).length === 0
}

/** ------- load + prefill -------- */
onMounted(async () => {
  const res = await axios.get(`/admin/orders/${tableType}/${orderId}`)
  order.value = res.data

  // prefill editableFields with loaded order
  for (const key in editableFields.value) {
    if (key in order.value) {
      if (dateFieldsSet.has(key)) {
        editableFields.value[key] = order.value[key]
          ? formatDateInput(order.value[key])
          : '' // keep empty if absent
      } else {
        editableFields.value[key] = order.value[key]
      }
    } else {
      // sensible defaults for missing keys
      if (key === 'product_rate') {
        editableFields.value[key] = tableType === 'application_annuity' || tableType === 'commission_annuity' ? 6 : 100
      }
    }
  }

  // push back to order object for v-model binding
  order.value = { ...order.value, ...editableFields.value }
})

/** ------- minor autofill when switching to completed (do NOT auto-fill commission_from_carrier) -------- */
watch(
  () => order.value?.application_status,
  (status) => {
    if (status === 'completed' && order.value) {
      if (!order.value.commission_distribution_date) {
        order.value.commission_distribution_date = formatDateInput(new Date())
      }
      if (isEmpty(order.value.product_rate)) {
        order.value.product_rate = (tableType === 'application_annuity' || tableType === 'commission_annuity') ? 6 : 100
      }
    }
  }
)

/** ------- payload sanitizers -------- */
function toNullIfEmpty(v) {
  return v === '' || v === undefined ? null : v
}
function toNumberOrNull(v) {
  if (v === '' || v === undefined || v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Allowed fields to send
const allowedCols = [
  'product_name','carrier_name',
  'application_date','commission_distribution_date','policy_effective_date',
  'policy_number','face_amount','target_premium','flex_premium','initial_premium',
  'product_rate','commission_from_carrier','commission_amount','commission_percent',
  'application_status','mra_status','split_with_id','split_percent','explanation',
  'insured_name','writing_agent'
]

function buildPayload() {
  const src = order.value || {}
  const payload = {}

  for (const col of allowedCols) {
    if (!(col in src)) continue
    let val = src[col]

    if (dateFieldsSet.has(col)) {
      val = toNullIfEmpty(val)
    } else if (numericFieldsSet.has(col)) {
      val = toNumberOrNull(val)
    } else {
      if (val === '') val = null
    }
    payload[col] = val
  }

  // enforce sensible default for product_rate if null
  if (payload.product_rate == null) {
    payload.product_rate = (tableType === 'application_annuity' || tableType === 'commission_annuity') ? 6 : 100
  }

  // ensure non-applicable fields are null
  if (tableType === 'application_life' || tableType === 'commission_life') {
    payload.flex_premium = null
  }
  if (tableType === 'application_annuity' || tableType === 'commission_annuity') {
    payload.face_amount = null
    payload.target_premium = null
  }

  return payload
}

/** ------- actions -------- */
async function saveOrder() {
  if (!order.value) return
  if (!validateOnComplete()) {
    alert('Please fix the required fields before saving.')
    return
  }
  const payload = buildPayload()
  await axios.put(`/admin/orders/${tableType}/${orderId}`, payload)
  alert('Order saved successfully')
}

// function confirmDelete() {
//   showDeleteConfirm.value = true
// }

// async function deleteOrder() {
//   try {
//     await axios.delete(`/admin/orders/${tableType}/${orderId}`)
//     alert('Order deleted successfully')
//     router.push('/admin/adminOrderSearch')
//   } catch (err) {
//     console.error('Delete failed', err)
//     alert('Failed to delete the order')
//   }
// }

/** ------- utils -------- */
function formatDateInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
</script>

<style scoped>
.form-group {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
}
label {
  font-weight: 600;
  margin-bottom: 6px;
}
input, select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
}
.button-row {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}
button {
  padding: 10px 20px;
  background-color: #0055a4;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}
button:hover {
  background-color: #003f82;
}
button.delete {
  background-color: #c0392b;
}
.required-badge {
  color: #c0392b;
  margin-left: 4px;
}
.error-input {
  border-color: #c0392b;
  outline: none;
}
.error-text {
  color: #c0392b;
  font-size: 12px;
  margin-top: 4px;
}
.confirm-dialog {
  background-color: #fff;
  border: 1px solid #aaa;
  padding: 20px;
  margin-top: 20px;
  border-radius: 6px;
}
.dialog-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}
</style>
