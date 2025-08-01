<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">📈 Organization Chart</h1>
    <div v-if="rootNodes.length">
      <TreeNode
        v-for="node in rootNodes"
        :key="node.id"
        :node="node"
      />
    </div>
    <div v-else>Loading chart...</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/config/axios.config';
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
      rootNodes.value.push(user) // 顶层员工
    }
  })
}
</script>