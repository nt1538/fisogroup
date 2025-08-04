<template>
  <AdminLayout>
    <h2>Edit Commission Order #{{ orderId }}</h2>
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
    Object.entries(order.value).filter(([key]) => key !== 'comment' && key !== 'policy_effective_date')
  );
});
onMounted(async () => {
  const res = await axios.get(`/admin/orders/${tableType}/${orderId}`);
  order.value = res.data;

  for (const key in editableFields.value) {
    if (key in order.value) {
      if (key === 'commission_distribution_date') {
        // 只给 commission_distribution_date 设置默认今天
        editableFields.value[key] = order.value[key]
          ? formatDateInput(order.value[key])
          : formatDateInput(new Date());
      } else if (key === 'application_date' || key === 'policy_effective_date') {
        // 若为 null 或空，保持空字符串（不显示）
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
      comment: order.value.comment,
      policy_effective_date: order.value.policy_effective_date,
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
