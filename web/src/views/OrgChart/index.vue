<template>
  <div class="dashboard">
    <Sidebar />
    <div class="org-chart">
      <h1>Organization Chart</h1>
      <div v-if="tree.length" class="tree-container">
        <TreeNode :node="buildTree(rootUserId)" />
      </div>
      <div v-else>Loading...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/config/axios.config'
import Sidebar from '@/components/Sidebar.vue'
import TreeNode from './TreeNode.vue' // 组件见下方
const tree = ref([])
const rootUserId = JSON.parse(localStorage.getItem('user')).id

onMounted(async () => {
  const res = await axios.get(`/api/org-chart/${rootUserId}`)
  tree.value = res.data
})

function buildTree(userId) {
  const nodeMap = new Map()
  tree.value.forEach(user => nodeMap.set(user.id, { ...user, children: [] }))
  tree.value.forEach(user => {
    if (user.introducer_id && nodeMap.has(user.introducer_id)) {
      nodeMap.get(user.introducer_id).children.push(nodeMap.get(user.id))
    }
  })
  return nodeMap.get(userId)
}
</script>

<style scoped>
.org-chart {
  margin-left: 280px;
  padding: 40px;
}
.tree-container {
  padding-left: 20px;
  border-left: 3px solid #ccc;
}
</style>
