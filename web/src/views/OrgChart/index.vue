<template>
  <div>
    <h2>Hierarchy Level</h2>
    <ul v-if="treeData.length">
      <TreeNode v-for="node in treeData" :key="node.id" :node="node" />
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import TreeNode from './TreeNode.vue';

const treeData = ref([]);

onMounted(async () => {
  try {
    const res = await axios.get('/users/org-chart'); // 后端返回组织结构树
    treeData.value = res.data;
  } catch (err) {
    console.error('Failed to fetch org chart:', err);
  }
});
</script>
