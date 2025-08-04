<template>
  <AdminLayout>
    <h2>Edit Order #{{ orderId }}</h2>
    <div v-if="order">
      <div class="form-group" v-for="(value, key) in editableFields" :key="key">
        <label :for="key">{{ key.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) }}</label>
        <template v-if="key === 'application_status'">
          <select v-model="order[key]" :id="key">
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </template>
        <template v-else-if="key === 'policy_number'">
          <input type="text" v-model="order[key]" :id="key" required/>
        </template>
        <template v-else-if="key === 'application_date'">
          <input type="date" v-model="order[key]" :id="key" />
        </template>
        <template v-else-if="key === 'commission_distribution_date'">
          <input type="date" v-model="order[key]" :id="key" />
        </template>
        <template v-else-if="key === 'policy_effective_date'">
          <input type="date" v-model="order[key]" :id="key" />
        </template>
        <template v-else-if="key === 'commission_from_carrier'">
          <input type="number" v-model="order[key]" :id="key" required/>
        </template>
        <template v-else-if="key === 'explanation'">
          <input type="text" v-model="order[key]" :id="key" required/>
        </template>
        <template v-else-if="key === 'split_with_id'">
          <input type="text" v-model="order[key]" :id="key" required/>
        </template>
        <template v-else-if="key === 'split_percent'">
          <input type="number" v-model="order[key]" :id="key" required/>
        </template>
        <template v-else-if="typeof value === 'number'">
          <input type="number" v-model="order[key]" :id="key" />
        </template>
        <template v-else>
          <input type="text" v-model="order[key]" :id="key" />
        </template>
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
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from '@/config/axios.config';
import AdminLayout from '@/layout/src/AdminLayout.vue';

const route = useRoute();
const router = useRouter();
const orderId = route.params.id;
const tableType = route.params.table_type;
const order = ref(null);
const showDeleteConfirm = ref(false);

const editableFields = ref({
  product_name: '',
  carrier_name: '',
  application_date: '',
  commission_distribution_date: '',
  policy_effective_date: '',
  policy_number: '',
  face_amount: 0,
  target_premium: 0,
  initial_premium: 0,
  commission_from_carrier: 0,
  application_status: '',
  mra_status: '',
  split_with_id: '',
  split_percent: 0,
  explanation: '',
});

onMounted(async () => {
  const res = await axios.get(`/admin/orders/${tableType}/${orderId}`);
  order.value = res.data;

  for (const key in editableFields.value) {
    if (key in order.value) {
      if (
        key === 'application_date' ||
        key === 'commission_distribution_date' ||
        key === 'policy_effective_date'
      ) {
        editableFields.value[key] = formatDateInput(order.value[key]);
      } else {
        editableFields.value[key] = order.value[key];
      }
    }
  }

  // Overwrite order.value with formatted fields so v-model works correctly
  order.value = { ...order.value, ...editableFields.value };
});

async function saveOrder() {
  await axios.put(`/admin/orders/${tableType}/${orderId}`, order.value);
  alert('Order saved successfully');
}

function confirmDelete() {
  showDeleteConfirm.value = true;
}

async function deleteOrder() {
  try {
    await axios.delete(`/admin/orders/${tableType}/${orderId}`);
    alert('Order deleted successfully');
    router.push('/admin/adminOrderSearch'); // Redirect to search page after deletion
  } catch (err) {
    console.error('Delete failed', err);
    alert('Failed to delete the order');
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
</style>
