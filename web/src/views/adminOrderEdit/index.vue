<template>
  <AdminLayout>
    <h2>编辑订单 #{{ orderId }}</h2>
    <div v-if="order">
      <div class="form-group">
        <label>订单状态</label>
        <select v-model="order.application_status">
          <option value="in_progress">进行中</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>
      <div class="form-group">
        <label>初始保费</label>
        <input type="number" v-model="order.initial_premium" />
      </div>
      <div class="form-group">
        <label>佣金比例 (%)</label>
        <input type="number" v-model="order.commission_percent" />
      </div>
      <button @click="saveOrder">保存</button>
    </div>
    <div v-else>加载中...</div>
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import AdminLayout from '@/Layout/AdminLayout.vue';

const route = useRoute();
const orderId = route.params.id;
const tableType = route.params.type;
const order = ref(null);

onMounted(async () => {
  const res = await axios.get(`/api/admin/orders/${tableType}/${orderId}`);
  order.value = res.data;
});

async function saveOrder() {
  await axios.put(`/api/admin/orders/${tableType}/${orderId}`, order.value);
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