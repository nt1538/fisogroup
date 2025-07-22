<template>
  <div class="edit-page">
    <h1>Edit Application Order</h1>
    <form @submit.prevent="updateOrder">
      <div class="form-group">
        <label>Policy Number</label>
        <input v-model="form.policy_number" />
      </div>
      <div class="form-group">
        <label>Initial Premium</label>
        <input type="number" v-model="form.initial_premium" />
      </div>
      <div class="form-group">
        <label>Face Amount</label>
        <input type="number" v-model="form.face_amount" />
      </div>
      <div class="form-group">
        <label>Target Premium</label>
        <input type="number" v-model="form.target_premium" />
      </div>
      <div class="form-group">
        <label>Carrier</label>
        <input v-model="form.carrier_name" />
      </div>
      <div class="form-group">
        <label>Product</label>
        <input v-model="form.product_name" />
      </div>
      <div class="form-group">
        <label>Application Date</label>
        <input type="date" v-model="form.application_date" />
      </div>
      <div class="form-group">
        <label>MRA Status</label>
        <input v-model="form.mra_status" />
      </div>
      <div class="form-group">
        <label>Explanation</label>
        <textarea v-model="form.explanation"></textarea>
      </div>
      <button type="submit">💾 Save Changes</button>
    </form>
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
      router.push("/user/userDashboard");
    }
  } catch (err) {
    console.error('Error fetching order:', err);
  }
});

async function updateOrder() {
  try {
    const res = await axios.put(`/user/application/${type}/${id}`, form.value);
    alert("✅ Order updated!");
    router.push("/user/userDashboard");
  } catch (err) {
    console.error("Error updating order:", err);
    alert("❌ Failed to update order.");
  }
}
</script>

<style scoped>
.edit-page {
  max-width: 600px;
  margin: 40px auto;
  padding: 30px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.form-group {
  margin-bottom: 20px;
}
input, textarea {
  width: 100%;
  padding: 8px;
}
button {
  padding: 10px 20px;
  background: #0055a4;
  color: white;
  border: none;
  border-radius: 4px;
}
</style>
