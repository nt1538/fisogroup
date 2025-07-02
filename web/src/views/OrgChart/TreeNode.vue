<template>
  <div class="node">
    <div class="node-info">
      {{ node.name }} - {{ node.hierarchy_level }}
    </div>

    <!-- 子节点递归 -->
    <div class="children" v-if="node.children && node.children.length">
      <TreeNode v-for="child in node.children" :key="child.id" :node="child" />
    </div>
  </div>
</template>

<script setup>
import { defineProps, ref } from 'vue'

const props = defineProps({ node: Object })

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
.children {
  padding-left: 20px;
}
</style>
