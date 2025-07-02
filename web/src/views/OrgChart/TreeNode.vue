<template>
  <li>
    <div class="node">
      {{ node.full_name }}（{{ node.hierarchy_level }}）
    </div>
    <ul v-if="node.children && node.children.length">
      <TreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
      />
    </ul>
  </li>
</template>

<script setup>
defineProps({
  node: Object
});
</script>

<style scoped>
.node {
  font-weight: 500;
  margin: 4px 0;
}
</style>
