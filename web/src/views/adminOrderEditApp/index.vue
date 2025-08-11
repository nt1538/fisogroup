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

        <template v-if="key === 'application_status'">
          <select v-model="order[key]" :id="key">
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </template>

        <template v-else-if="key === 'policy_number'">
          <input type="text" v-model="order[key]" :id="key" />
        </template>

        <template v-else-if="key === 'application_date' || key === 'commission_distribution_date' || key === 'policy_effective_date'">
          <input
            type="date"
            v-model="order[key]"
            :id="key"
            :class="{ 'error-input': errors[key] }"
          />
        </template>

        <template v-else-if="key === 'face_amount' || key === 'target_premium' || key === 'flex_premium' || key === 'product_rate' || key === 'commission_from_carrier' || key === 'split_percent'">
          <input
            type="number"
            v-model.number="order[key]"
            :id="key"
            step="0.01"
            :class="{ 'error-input': errors[key] }"
          />
        </template>

        <template v-else-if="key === 'explanation' || key === 'split_with_id'">
          <input type="text" v-model="order[key]" :id="key" />
        </template>

        <template v-else-if="typeof value === 'number'">
          <input type="number" v-model.number="order[key]" :id="key" />
        </template>

        <template v-else>
          <input type="text" v-model="order[key]" :id="key" />
        </template>

        <small v-if="errors[key]" class="error-text">{{ errors[key] }}</small>
      </div>


      <div class="button-row">
        <button @click="saveOrder">Save</button>
        <button class="delete" @click="confirmDelete">Delete</button>
      </div>
    </div>
    <div v-else>Loading...</div>

    <div v-if="showDeleteConfirm" class="confirm-dialog">
      <p>Are you sure you want to permanently delete this order?</p>
      <div class="dialog-buttons">
        <button @click="showDeleteConfirm = false">Cancel</button>
        <button class="delete" @click="deleteOrder">Confirm Delete</button>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from '@/config/axios.config'
import AdminLayout from '@/layout/src/AdminLayout.vue' // keep import if your bundler requires SFC presence

const route = useRoute()
const router = useRouter()
const orderId = route.params.id
const tableType = route.params.table_type // 'application_life' | 'application_annuity' | etc.

const order = ref(null)
const showDeleteConfirm = ref(false)

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
  application_status: '',
  mra_status: '',
  split_with_id: '',
  split_percent: 0,
  explanation: '',
})

// Filter out fields that don’t apply to the current table type
const filteredFields = computed(() => {
  return Object.entries(editableFields.value)
    .filter(([key]) => {
      if (tableType === 'application_life') return key !== 'flex_premium'
      if (tableType === 'application_annuity') return key !== 'face_amount' && key !== 'target_premium'
      return true
    })
    .map(([key, value]) => ({ key, value }))
})

// Validation state
const requiredOnComplete = new Set([
  'commission_distribution_date',
  'commission_from_carrier',
  'product_rate',
])
const errors = ref({})
const isCompleting = computed(() => order.value?.application_status === 'completed')

// Load order + prefill
onMounted(async () => {
  const res = await axios.get(`/admin/orders/${tableType}/${orderId}`)
  order.value = res.data

  for (const key in editableFields.value) {
    if (key in order.value) {
      if (
        key === 'application_date' ||
        key === 'commission_distribution_date' ||
        key === 'policy_effective_date'
      ) {
        editableFields.value[key] = order.value[key]
          ? formatDateInput(order.value[key])
          : '' // leave blank unless we want to auto-fill later
      } else {
        editableFields.value[key] = order.value[key]
      }
    } else {
      // sensible defaults for missing fields
      if (key === 'product_rate') {
        editableFields.value[key] = tableType === 'application_annuity' ? 6 : 100
      }
      if (key === 'commission_from_carrier') {
        editableFields.value[key] = 0
      }
    }
  }

  order.value = { ...order.value, ...editableFields.value }
})

// Optional: when switching to Completed, auto-fill defaults if empty
watch(
  () => order.value?.application_status,
  (status) => {
    if (status === 'completed' && order.value) {
      if (!order.value.commission_distribution_date) {
        order.value.commission_distribution_date = formatDateInput(new Date())
      }
      if (!Number.isFinite(Number(order.value.product_rate))) {
        order.value.product_rate = tableType === 'application_annuity' ? 6 : 100
      }
      if (!Number.isFinite(Number(order.value.commission_from_carrier))) {
        order.value.commission_from_carrier = 0
      }
    }
  }
)

// Validation before save when completing
function validateOnComplete() {
  errors.value = {}
  if (!isCompleting.value) return true

  // commission_distribution_date: valid date
  const cdd = order.value?.commission_distribution_date
  if (!cdd || isNaN(new Date(cdd).getTime())) {
    errors.value.commission_distribution_date = 'Required when completing.'
  }

  // commission_from_carrier: >= 0
  const cfc = Number(order.value?.commission_from_carrier)
  if (!Number.isFinite(cfc) || cfc < 0) {
    errors.value.commission_from_carrier = 'Enter a non-negative number.'
  }

  // product_rate: 0–200
  const pr = Number(order.value?.product_rate)
  if (!Number.isFinite(pr) || pr < 0 || pr > 200) {
    errors.value.product_rate = 'Enter a percent between 0 and 200.'
  }

  return Object.keys(errors.value).length === 0
}

async function saveOrder() {
  if (!order.value) return
  if (!validateOnComplete()) {
    alert('Please fix the required fields before saving.')
    return
  }
  await axios.put(`/admin/orders/${tableType}/${orderId}`, order.value)
  alert('Order saved successfully')
}

function confirmDelete() {
  showDeleteConfirm.value = true
}

async function deleteOrder() {
  try {
    await axios.delete(`/admin/orders/${tableType}/${orderId}`)
    alert('Order deleted successfully')
    router.push('/admin/adminOrderSearch')
  } catch (err) {
    console.error('Delete failed', err)
    alert('Failed to delete the order')
  }
}

function formatDateInput(value) {
  if (!value) return ''
  const date = new Date(value)
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
  font-weight: bold;
  margin-bottom: 5px;
}
input,
select {
  padding: 8px;
  border: 1px solid #ccc;
}
.button-row {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}
button {
  padding: 10px 20px;
}
button.delete {
  background-color: #c0392b;
  color: white;
  border: none;
}
.confirm-dialog {
  background-color: #fff;
  border: 1px solid #aaa;
  padding: 20px;
  margin-top: 20px;
}
.dialog-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.required-badge { color: #c0392b; margin-left: 4px; }
.error-input { border-color: #c0392b !important; }
.error-text { color: #c0392b; margin-top: 4px; }
</style>
