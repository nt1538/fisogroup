<template>
  <AdminLayout>
    <h2>员工列表</h2>
    <div class="filters">
      <input v-model="search" placeholder="搜索员工姓名或邮箱" />
      <button @click="loadEmployees">搜索</button>
    </div>
    <table v-if="employees.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>姓名</th>
          <th>邮箱</th>
          <th>角色</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="emp in employees" :key="emp.id">
          <td>{{ emp.id }}</td>
          <td>{{ emp.name }}</td>
          <td>{{ emp.email }}</td>
          <td>{{ emp.role }}</td>
          <td><router-link :to="`/admin/employees/${emp.id}`">编辑</router-link></td>
        </tr>
      </tbody>
    </table>
    <div v-else>暂无员工</div>
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '@/config/axios.config';
import AdminLayout from '@/layout/src/AdminLayout.vue';

const search = ref("");
const employees = ref([]);

async function loadEmployees() {
  const res = await axios.get('/api/admin/employees', {
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