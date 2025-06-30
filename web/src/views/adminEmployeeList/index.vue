<template>
  <AdminLayout>
    <h2>Employee List</h2>
    <div class="filters">
      <input v-model="search" placeholder="Search For Employees by Name or Email" />
      <button @click="loadEmployees">Search</button>
    </div>
    <table v-if="employees.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Email</th>
          <th>Level</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="emp in employees" :key="emp.id">
          <td>{{ emp.id }}</td>
          <td>{{ emp.name }}</td>
          <td>{{ emp.email }}</td>
          <td>{{ emp.hierarchy_level }}</td>
          <td><router-link :to="`/admin/adminEmployeeEdit/${emp.id}`">Edit/Check</router-link></td>
        </tr>
      </tbody>
    </table>
    <div v-else>Nothing Found</div>
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '@/config/axios.config';
import AdminLayout from '@/layout/src/AdminLayout.vue';

const search = ref("");
const employees = ref([]);

async function loadEmployees() {
  const res = await axios.get('/admin/employees', {
    params: { query: search.value }
  });
  employees.value = res.data;
}

onMounted(() => {
  loadEmployees();
});
</script>

<style scoped>
.filters {
  margin: 15px 0;
  display: flex;
  gap: 10px;
}
input {
  padding: 8px;
  border: 1px solid #ccc;
}
button {
  padding: 8px 16px;
}
table {
  width: 100%;
  background: white;
  border-collapse: collapse;
}
th, td {
  padding: 10px;
  border: 1px solid #ddd;
}
</style>