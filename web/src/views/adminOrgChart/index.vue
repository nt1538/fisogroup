<template>
  <AdminLayout>
  <div class="dashboard">
    <div class="org-chart">
      <h1 class="text-2xl font-bold mb-4">📈 Organization Chart</h1>
      <div v-if="rootNodes.length" class="tree-container">
        <TreeNode
          v-for="node in rootNodes"
          :key="node.id"
          :node="node"
        />
      </div>
      <div v-else class="text-gray-500">Loading chart...</div>
    </div>
  </div>
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/config/axios.config' // adjust path as needed
import AdminLayout from '@/layout/src/AdminLayout.vue'
import TreeNode from './TreeNode.vue'

const orgData = ref([])
const rootNodes = ref([])

onMounted(async () => {
  try {
    const res = await axios.get('/admin/org-chart')
    orgData.value = res.data
    rootNodes.value = []
    buildTree()
  } catch (err) {
    console.error('[ERROR] Failed to load org chart:', err)
  }
})

function buildTree() {
  const map = new Map()
  orgData.value.forEach(user => {
    user.children = []
    map.set(user.id, user)
  })

  orgData.value.forEach(user => {
    if (user.introducer_id) {
      const parent = map.get(user.introducer_id)
      if (parent) parent.children.push(user)
    } else {
      rootNodes.value.push(user) // Top-level
    }
  })
}
</script>

<style scoped>
.dashboard {
  display: flex;
}

.org-chart {
  flex: 1;
  padding: 40px;
  background-color: #f9f9f9;
}

.tree-container {
  padding-left: 20px;
  border-left: 3px solid #ccc;
}
</style>
