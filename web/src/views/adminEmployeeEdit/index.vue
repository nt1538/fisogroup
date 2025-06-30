<template>
  <AdminLayout>
    <h2>Edit Employee #{{ userId }}</h2>
    <div v-if="user">
      <div class="form-group">
        <label>Name</label>
        <input v-model="user.name" type="text" />
      </div>

      <div class="form-group">
        <label>Email</label>
        <input v-model="user.email" type="email" />
      </div>

      <div class="form-group">
        <label>State</label>
        <input v-model="user.state" type="text" />
      </div>

      <div class="form-group">
        <label>Introducer ID</label>
        <input v-model="user.introducer_id" type="text" />
      </div>

      <div class="form-group">
        <label>Level Percentage</label>
        <input v-model="user.level_percent" type="number" />
      </div>

      <div class="form-group">
        <label>Total Earnings</label>
        <input v-model="user.total_earnings" type="number" />
      </div>

      <div class="form-group">
        <label>Commission</label>
        <input v-model="user.commission" type="number" />
      </div>

      <div class="form-group">
        <label>Profit</label>
        <input v-model="user.profit" type="number" />
      </div>

      <div class="form-group">
        <label>Hierarchy Level</label>
        <input v-model="user.hierarchy_level" type="number" />
      </div>

      <div class="form-group">
        <label>National Producer Number</label>
        <input v-model="user.national_producer_number" type="text" />
      </div>

      <button @click="saveUser">Save</button>
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
const userId = route.params.id;
const user = ref(null);

onMounted(async () => {
  const res = await axios.get(`/admin/employees/${userId}`);
  user.value = res.data;
});

async function saveUser() {
  await axios.put(`/admin/employees/${userId}`, user.value);
  alert('保存成功！');
}
</script>

<style scoped>
.form-group {
  margin-bottom: 20px;
}
input, select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
}
button {
  padding: 10px 20px;
}
</style>