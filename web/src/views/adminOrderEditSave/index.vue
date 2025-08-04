<template>
  <AdminLayout>
    <h2>Edit Saved Order #{{ orderId }}</h2>
    <div v-if="order" class="form-container">
      <div
        v-for="(item, key) in filteredOrderFields"
        :key="key"
        class="form-group"
      >
        <label :for="key">{{ key }}</label>
  
        <!-- Editable date field -->
        <input
          v-if="key === 'policy_effective_date'"
          type="date"
          v-model="order[key]"
          :id="key"
        />

        <!-- Read-only for all other fields -->
        <input
          v-else
          :id="key"
          :value="item"
        readonly
        />
      </div>
      <div class="form-group">
        <label for="comment">Admin Comment</label>
        <textarea v-model="order.comment" id="comment" rows="5" />
      </div>

      <div class="button-row">
        <button @click="saveOrder">💾 Save Comment</button>
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

const filteredOrderFields = computed(() => {
  if (!order.value) return {};
  return Object.fromEntries(
    Object.entries(order.value).filter(([key]) => key !== 'comment')
  );
});
onMounted(async () => {
  try {
    const res = await axios.get(`/admin/orders/${tableType}/${orderId}`);
    const data = res.data;

    // Format the date properly
    if (data.policy_effective_date) {
      data.policy_effective_date = formatDateInput(data.policy_effective_date);
    }

    order.value = data;
  } catch (error) {
    console.error('Failed to fetch order:', error);
    alert('Failed to load order details');
  }
});

async function saveOrder() {
  try {
    await axios.put(`/admin/orders/${tableType}/${orderId}`, {
      comment: order.value.comment,
    });
    alert('Comment saved successfully');
  } catch (error) {
    console.error('Failed to save Comment:', error);
    alert('Failed to save Comment');
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
.form-container {
  display: flex;
  flex-direction: column;
  max-width: 600px;
}
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
input[readonly] {
  background-color: #f0f0f0;
  padding: 8px;
  border: 1px solid #ccc;
}
textarea {
  padding: 10px;
  border: 1px solid #ccc;
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
