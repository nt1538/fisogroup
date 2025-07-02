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
            <option value="cancelled">Cancelled</option>
          </select>
        </template>
        <template v-else-if="key === 'application_date'">
          <input type="date" v-model="order[key]" :id="key" />
        </template>
        <template v-else-if="typeof value === 'number'">
          <input type="number" v-model="order[key]" :id="key" />
        </template>
        <template v-else>
          <input type="text" v-model="order[key]" :id="key" />
        </template>
      </div>
      <button @click="saveOrder">Save</button>
    </div>
    <div v-else>Loading...</div>
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from '@/config/axios.config';
import AdminLayout from '@/layout/src/AdminLayout.vue';

const route = useRoute();
const orderId = route.params.id;
const tableType = route.params.type;
const order = ref(null);

// 设置允许编辑的字段
const editableFields = ref({
  product_name: '',
  carrier_name: '',
  application_date: '',
  policy_number: '',
  face_amount: 0,
  target_premium: 0,
  initial_premium: 0,
  commission_from_carrier: 0,
  commission_percent: 0,
  application_status: '',
  mra_status: ''
});

onMounted(async () => {
  const res = await axios.get(`/admin/orders/${tableType}/${orderId}`);
  order.value = res.data;
  // 初始化 editableFields
  for (const key in editableFields.value) {
    if (key in order.value) editableFields.value[key] = order.value[key];
  }
});

async function saveOrder() {
  const res = await axios.put(`/admin/orders/${tableType}/${orderId}`, order.value);
  alert('Order saved successfully');
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
input, select {
  padding: 8px;
  border: 1px solid #ccc;
}
button {
  padding: 10px 20px;
  margin-top: 20px;
}
</style>
