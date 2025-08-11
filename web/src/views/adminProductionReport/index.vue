<template>
  <AdminLayout>
    <h2>Production Report</h2>

    <!-- Filter buttons -->
    <div class="filters">
      <div class="range">
        <button @click="load('all')">All</button>
        <button @click="load('ytd')">YTD</button>
        <button @click="load('rolling_3')">Rolling 3 Months</button>
        <button @click="load('rolling_12')">Rolling 12 Months</button>
      </div>
      <div class="sort">
        <span>Sort by:</span>
        <button @click="sortBy('personal_production')">Personal Production</button>
        <button @click="sortBy('personal_commission')">Personal Commission</button>
        <button @click="sortBy('team_production')">Team Production</button>
        <button @click="sortBy('team_commission')">Team Commission</button>
        <button @click="toggleDir">{{ dir.toUpperCase() }}</button>
      </div>
    </div>

    <table v-if="rows.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Level</th>
          <th style="text-align:right;">Personal Production</th>
          <th style="text-align:right;">Personal Commission</th>
          <th style="text-align:right;">Team Production</th>
          <th style="text-align:right;">Team Commission</th>
          <th>Direct Introducer</th>
          <th>Top Introducer</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.id">
          <td>{{ r.id }}</td>
          <td>{{ r.name }}</td>
          <td>{{ r.hierarchy_level }}</td>
          <td style="text-align:right;">${{ money(r.personal_production) }}</td>
          <td style="text-align:right;">${{ money(r.personal_commission) }}</td>
          <td style="text-align:right;">${{ money(r.team_production) }}</td>
          <td style="text-align:right;">${{ money(r.team_commission) }}</td>
          <td>{{ r.direct_introducer || '-' }}</td>
          <td>{{ r.top_introducer || '-' }}</td>
        </tr>
      </tbody>
    </table>

    <div v-else>No data</div>
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/config/axios.config'
import AdminLayout from '@/layout/src/AdminLayout.vue'

const rows = ref([])
const range = ref('all')
const sort = ref('')
const dir = ref('desc') // 'asc' | 'desc'

onMounted(() => load('all'))

async function load(r) {
  if (r) range.value = r
  const res = await axios.get('/admin/reports/production', {
    params: { range: range.value, sort: sort.value, dir: dir.value }
  })
  rows.value = res.data || []
}

function sortBy(field) {
  if (sort.value === field) {
    // toggle dir if same field clicked again
    dir.value = dir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sort.value = field
    dir.value = 'desc'
  }
  load()
}
function toggleDir() {
  dir.value = dir.value === 'asc' ? 'desc' : 'asc'
  load()
}

function money(v) {
  const n = Number(v) || 0
  return n.toFixed(2)
}
</script>

<style scoped>
.filters {
  display: flex; justify-content: space-between; align-items: center;
  gap: 16px; margin: 10px 0 16px; flex-wrap: wrap;
}
.range button, .sort button {
  margin-right: 8px; padding: 6px 12px; border: none; background: #0055a4; color: #fff; border-radius: 5px; cursor: pointer;
}
.range button:hover, .sort button:hover { background: #003f82; }
table { width: 100%; background: #fff; border-collapse: collapse; }
th, td { padding: 10px; border: 1px solid #ddd; }
thead th { position: sticky; top: 0; background-color: #f8f8f8; z-index: 2; }
</style>
