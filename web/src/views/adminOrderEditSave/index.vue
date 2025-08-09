<template>
  <AdminLayout>
    <h2>Edit Commission Order #{{ orderId }}</h2>
    <div v-if="order">
      <div class="form-group" v-for="(value, key) in editableFields" :key="key">
        <label :for="key">
          {{ key.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) }}
        </label>

        <!-- Only allow editing for policy_effective_date -->
        <template v-if="key === 'policy_effective_date'">
          <input type="date" v-model="order[key]" :id="key" />
        </template>

        <!-- Other fields readonly -->
        <template v-else>
          <input type="text" :value="order[key]" :id="key" readonly />
        </template>
      </div>

      <!-- Admin Comment -->
      <div class="form-group">
        <label for="comment">Comment</label>
        <textarea v-model="order.comment" id="comment" rows="4" />
      </div>

      <div class="button-row">
        <button @click="saveOrder">Save</button>
      </div>
    </div>
    <div v-else>Loading...</div>
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import axios from '@/config/axios.config';
import AdminLayout from '@/layout/src/AdminLayout.vue';

const route = useRoute();
const orderId = route.params.id;
const tableType = route.params.table_type;
const order = ref(null);

const editableFields = ref({
  product_name: '',
  carrier_name: '',
  application_date: '',
  commission_distribution_date: '',
  policy_effective_date: '',
  policy_number: '',
  face_amount: 0,            // only for life
  target_premium: 0,         // only for life
  flex_premium: 0,           // only for annuity
  initial_premium: 0,
  product_rate: 100, // Default rate
  commission_from_carrier: 0,
  application_status: '',
  mra_status: '',
  split_with_id: '',
  split_percent: 0,
  explanation: '',
});

// ✅ Add this to compute the type of order
const orderType = computed(() => order.value?.order_type || '');

// ✅ Add this helper to control field visibility in template
function shouldShowField(key) {
  if (tableType === 'saved_life_orders') {
    return key !== 'flex_premium';
  } else if (tableType === 'saved_annuity_orders') {
    return key !== 'face_amount' && key !== 'target_premium';
  }
  return true;
}

// Optional: Format field name for label
function formatLabel(key) {
  return key.replaceAll('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

onMounted(async () => {
  const res = await axios.get(`/admin/orders/${tableType}/${orderId}`);
  order.value = res.data;

  for (const key in editableFields.value) {
    if (key in order.value) {
      if (key === 'policy_effective_date' || key === 'application_date' || key === 'commission_distribution_date') {
        editableFields.value[key] = order.value[key]
          ? formatDateInput(order.value[key])
          : '';
      } else {
        editableFields.value[key] = order.value[key];
      }
    }
  }

  order.value = { ...order.value, ...editableFields.value };
});

async function saveOrder() {
  try {
    await axios.put(`/admin/orders/${tableType}/${orderId}`, {
      policy_effective_date: order.value.policy_effective_date,
      comment: order.value.comment,
    });
    alert('Saved successfully');
  } catch (error) {
    console.error('Failed to save:', error);
    alert('Failed to save');
  }
}

function formatDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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
  text-transform: capitalize;
}
input,
select,
textarea {
  padding: 8px;
  border: 1px solid #ccc;
}
input[readonly] {
  background-color: #f3f3f3;
  color: #555;
}
textarea {
  resize: vertical;
}
.button-row {
  margin-top: 20px;
  display: flex;
  justify-content: flex-start;
}
button {
  padding: 10px 20px;
  background-color: #2980b9;
  color: white;
  border: none;
  cursor: pointer;
}
</style>
