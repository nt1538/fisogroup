<template>
  <div class="node">
    <div class="node-info" @click="toggleExpand">
      {{ node.name }} - {{ node.hierarchy_level }} - ${{ node.total_earnings }}
      <span class="dropdown-arrow">{{ expanded ? '▼' : '▶' }}</span>
    </div>

    <!-- 订单下拉 -->
    <div v-if="expanded" class="orders">
      <div v-if="loading">Loading orders...</div>
      <div v-else-if="orders.length === 0">No orders found.</div>
      <ul v-else>
        <table class="commission-table">
          <thead>
            <tr>
              <th>Policy Number</th><th>Initial Premium</th><th>Commission Pecentage</th><th>Order Status</th><th>Created At</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order.id">
              <td>{{ order.policy_number }}</td><td>${{ order.initial_premium }}</td><td>{{ order.commission_percent }}%</td>
              <td>{{ order.status }}</td><td>{{ formatDate(order.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </ul>
    </div>

    <!-- 子节点递归 -->
    <div class="children" v-if="node.children && node.children.length">
      <TreeNode v-for="child in node.children" :key="child.id" :node="child" />
    </div>
  </div>
</template>

<script setup>
import { defineProps, ref } from 'vue'
import axios from '@/config/axios.config'
import TreeNode from './TreeNode.vue'

const props = defineProps({ node: Object })

const expanded = ref(false)
const orders = ref([])
const loading = ref(false)

const toggleExpand = async () => {
  expanded.value = !expanded.value
  if (expanded.value && orders.value.length === 0) {
    loading.value = true
    try {
      const res = await axios.get(`/orders/by-user/${props.node.id}`)
      orders.value = res.data
    } catch (err) {
      orders.value = []
    }
    loading.value = false
  }
}

function formatDate(date) {
    return new Date(date).toLocaleDateString();
}
</script>

<style scoped>
.node {
  margin: 10px 0;
}
.node-info {
  padding: 8px 12px;
  background: #f0f8ff;
  border-left: 3px solid #0055a4;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
}
.dropdown-arrow {
  font-size: 12px;
  color: #333;
}
.orders {
  padding: 8px 16px;
  background: #fdfdfd;
  border-left: 2px dashed #ccc;
  margin-top: 4px;
}
.orders ul {
  margin: 0;
  padding-left: 16px;
}
.orders li {
  font-size: 14px;
  padding: 4px 0;
}
.children {
  padding-left: 20px;
}
.commission-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}
.commission-table th, .commission-table td {
    padding: 8px;
    border: 1px solid #ccc;
    text-align: left;
}
  
.commission-table th {
    background-color: #0055a4;
    color: white;
}
</style>
