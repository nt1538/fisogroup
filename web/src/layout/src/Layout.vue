<template>
  <div>
    <!-- Header 永远在顶 -->
    <Header />

    <!-- 员工页面 -->
    <div v-if="isEmployeePage" class="employee-layout">
      <Sidebar />
      <div class="main"><router-view /></div>
    </div>

    <!-- 非员工页面（如 login） -->
    <div v-else class="basic-page">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { ref, watchEffect } from 'vue'
import Header from '@/layout/src/components/Header.vue'
import Sidebar from '@/components/Sidebar.vue'

const route = useRoute()
const isEmployeePage = ref(false)

watchEffect(() => {
  isEmployeePage.value = route.path.startsWith('/employee')
})
</script>

<style scoped>
.employee-layout {
  display: flex;
  height: calc(100vh - 80px); /* 减去 Header */
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.basic-page {
  min-height: calc(100vh - 80px); /* 也减去 Header */
}
</style>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

.sidebar {
  width: 200px;
  background: #f5f5f5;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  height: 80px;
  flex-shrink: 0;
  background-color: #fff;
  z-index: 100;
}

router-view {
  flex: 1;
  overflow: auto;
}
</style>

