<template>
  <div class="node">
    <div class="node-info" @click="goToUser(node.id)">
      {{ node.name }} - {{ node.role }} - ${{ node.total_earnings }}
    </div>
    <div class="children" v-if="node.children && node.children.length">
      <TreeNode v-for="child in node.children" :key="child.id" :node="child" />
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({ node: Object })
const router = useRouter()

function goToUser(id) {
  router.push(`/employee/${id}`)
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
}
.children {
  padding-left: 20px;
}
</style>
