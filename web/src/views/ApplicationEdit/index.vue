<template>
  <div class="dashboard">
    <Sidebar />
    <div class="upload-page">
      <h1>Edit Application</h1>

      <form @submit.prevent="updateOrder" class="upload-form" v-if="form">
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
          <label>Insured Name:</label>
          <input v-model="form.insured_name" required />
        </div>

        <div class="form-row">
          <label>Application Date:</label>
          <input type="date" v-model="formatDate" required />
        </div>

        <div class="form-row">
          <label>Policy Number:</label>
          <input v-model="form.policy_number" type="text" required />
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
          <label>Base Premium:</label>
          <input v-model.number="form.flex_premium" type="number" />
        </div>

        <div class="form-row">
          <label>Split ID</label>
          <input v-model="form.split_with_id" type="text" required />
        </div>

        <div class="form-row">
          <label>Split Percentage</label>
          <input v-model.number="form.split_percent" type="number" required />
        </div>

        <div class="form-row">
          <label>Explanation</label>
          <input v-model="form.explanation" type="text" required />
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
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from '@/config/axios.config';

const route = useRoute();
const router = useRouter();
const form = ref({});
const { type, id } = route.params;

onMounted(async () => {
  try {
    const res = await axios.get(`/orders/application/${type}`);
    const order = res.data.find(o => o.id === Number(id));
    if (order) {
      form.value = order;
    } else {
      alert("Order not found");
      router.back();
    }
  } catch (err) {
    console.error('Error fetching order:', err);
  }
});

async function updateOrder() {
  try {
    const res = await axios.put(`/orders/application/${type}/${id}`, form.value);
    alert("✅ Order updated!");
    router.back();
  } catch (err) {
    console.error("Error updating order:", err);
    alert("❌ Failed to update order.");
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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
