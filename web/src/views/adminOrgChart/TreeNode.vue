<template>
  <div class="ml-4 mt-2 border-l pl-4">
    <div class="font-semibold cursor-pointer hover:text-blue-500" @click="goToEmployee">
      👤 {{ node.name }} ({{ node.id }}) - {{ node.hierarchy_level }}
    </div>
    <TreeNode v-for="child in node.children" :key="child.id" :node="child" />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const props = defineProps({ node: Object })
const router = useRouter()

function goToEmployee() {
  router.push(`/admin/adminEmployeeEdit/${props.node.id}`)
}
</script>
