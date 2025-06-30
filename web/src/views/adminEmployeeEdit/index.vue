<template>
  <AdminLayout>
    <h2>编辑员工 #{{ userId }}</h2>
    <div v-if="user">
      <div class="form-group">
        <label>姓名</label>
        <input v-model="user.name" type="text" />
      </div>
      <div class="form-group">
        <label>邮箱</label>
        <input v-model="user.email" type="email" />
      </div>
      <div class="form-group">
        <label>角色</label>
        <select v-model="user.role">
          <option value="employee">员工</option>
          <option value="admin">管理员</option>
        </select>
      </div>
      <button @click="saveUser">保存</button>
    </div>
    <div v-else>加载中...</div>
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