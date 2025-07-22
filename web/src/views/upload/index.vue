<template>
  <div class="dashboard">
    <Sidebar />
    <div class="upload-page">
      <h1>Submit New Application</h1>

      <form @submit.prevent="submitForm" class="upload-form">
        <div class="form-row">
          <label>Product Type:</label>
          <select v-model="form.product_type" required>
            <option disabled value="">Select</option>
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
          <input v-model.number="form.flex_premium" type="number" required />
        </div>

        <div class="form-row">
          <label>Commission From Carrier:</label>
          <input v-model.number="form.commission_from_carrier" type="number" required />
        </div>

        <button type="submit">Submit</button>
      </form>

      <div v-if="submitted" class="success-msg">
        ✅ Application successfully submitted.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from '@/config/axios.config';
import Sidebar from '@/components/Sidebar.vue';

const user = JSON.parse(localStorage.getItem('user'));
const submitted = ref(false);

// 表单中仅包含员工自己需要输入的内容（订单信息）
const form = ref({
  product_type: '',
  carrier_name: '',
  product_name: '',
  application_date: '',
  policy_number: '',
  face_amount: null,
  target_premium: null,
  initial_premium: null,
  flex_premium: null,
  commission_from_carrier: null,
});

const submitForm = async () => {
  try {
    const endpoint = form.value.product_type === 'life'
      ? '/orders/life'
      : '/orders/annuity';

    const payload = {
      ...form.value,
      user_id: user.id,
      full_name: user.name,
      national_producer_number: user.npn || '',
      license_number: user.license_number || '',
      hierarchy_level: user.hierarchy_level || '',
      commission_percent: user.level_percent || 70,
      split_percent: 100,
      application_status: 'in_progress',
      mra_status: 'none',
      order_type: 'Personal Commission'
    };

    await axios.post(endpoint, payload);

    submitted.value = true;
    setTimeout(() => submitted.value = false, 3000);
    form.value = {
      product_type: '',
      carrier_name: '',
      product_name: '',
      application_date: '',
      policy_number: '',
      face_amount: null,
      target_premium: null,
      initial_premium: null,
      commission_from_carrier: null,
    };
  } catch (err) {
    console.error('Submission failed', err);
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
  
