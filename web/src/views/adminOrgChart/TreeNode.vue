<template>
  <div class="tree-node">
    <div class="user-card">
      👤 {{ node.name }} ({{ node.id }}) - {{ node.hierarchy_level }}
    </div>
    <div v-if="node.children.length" class="children">
      <TreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
      />
    </div>
  </div>
</template>

<script setup>
defineProps({
  node: Object
})
</script>

<style scoped>
.tree-node {
  margin-bottom: 12px;
  padding-left: 16px;
  border-left: 1px dashed #bbb;
}

.user-card {
  background: #fff;
  padding: 10px 14px;
  margin-bottom: 6px;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 1px 1px 4px rgba(0,0,0,0.05);
  font-size: 15px;
  font-family: 'Segoe UI', sans-serif;
}

.children {
  margin-left: 12px;
}
</style>
