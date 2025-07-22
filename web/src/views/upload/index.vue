<template>
  <div class="dashboard">
    <Sidebar />
    <div class="upload-page">
      <h1>Edit Application</h1>

      <form @submit.prevent="submitEdit" class="upload-form" v-if="form">
        <div class="form-row">
          <label>Product Type:</label>
          <select v-model="form.product_type" disabled>
            <option value="life">Life</option>
            <option value="annuity">Annuity</option>
          </select>
        </div>

        <div class="form-row">
          <label>Carrier Name:</label>
          <input v-model="form.carrier_name" required />
        </div>

        <div class="form-row">
          <label>Product Name:</label>
          <input v-model="form.product_name" required />
        </div>

        <div class="form-row">
          <label>Application Date:</label>
          <input type="date" v-model="form.application_date" required />
        </div>

        <div class="form-row">
          <label>Policy Number:</label>
          <input v-model="form.policy_number" required />
        </div>

        <div class="form-row" v-if="form.product_type === 'life'">
          <label>Face Amount:</label>
          <input v-model.number="form.face_amount" type="number" />
          <label>Target Premium:</label>
          <input v-model.number="form.target_premium" type="number" />
        </div>

        <div class="form-row">
          <label>Initial Premium:</label>
          <input v-model.number="form.initial_premium" type="number" required />
        </div>

        <div class="form-row" v-if="form.product_type === 'annuity'">
          <label>Flex Premium:</label>
          <input v-model.number="form.flex_premium" type="number" />
        </div>

        <div class="form-row">
          <label>Commission From Carrier:</label>
          <input v-model.number="form.commission_from_carrier" type="number" required />
        </div>

        <button type="submit">Save Changes</button>
      </form>

      <div v-if="saved" class="success-msg">
        ✅ Changes saved successfully.
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from '@/config/axios.config';
import Sidebar from '@/components/Sidebar.vue';

const route = useRoute();
const router = useRouter();
const form = ref(null);
const saved = ref(false);

// 从路由参数获取 type 和 id（如：/admin/edit/life/123）
const type = route.params.type;
const id = route.params.id;

// ✅ 获取当前订单数据
onMounted(async () => {
  try {
    const res = await axios.get(`/admin/orders/${type}/${id}`);
    form.value = res.data;
  } catch (err) {
    console.error('Failed to load application', err);
  }
});

const submitEdit = async () => {
  try {
    await axios.put(`/admin/orders/${type}/${id}`, form.value);
    saved.value = true;
    setTimeout(() => {
      saved.value = false;
      router.back();
    }, 2000);
  } catch (err) {
    console.error('Update failed', err);
  }
};
</script>

<style scoped>
.dashboard {
  display: flex;
  overflow-y: scroll;
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
  max-width: 600px;
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
  border-radius: 4px;
}
button {
  margin-top: auto;
  background-color: #0055a4;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 20px;
  flex-shrink: 0;
}
.success-msg {
  margin-top: 20px;
  background: #e0ffe0;
  padding: 15px;
  border-radius: 5px;
  color: green;
}
</style>

