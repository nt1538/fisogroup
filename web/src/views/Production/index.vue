<template>
  <div class="dashboard">
    <Sidebar />
    <div class="page">
      <h1>My Team Production</h1>

      <div class="filter-controls">
        <div class="filter-buttons">
          <button :class="{active: range==='all'}" @click="setRange('all')">All</button>
          <button :class="{active: range==='ytd'}" @click="setRange('ytd')">YTD</button>
          <button :class="{active: range==='rolling_3'}" @click="setRange('rolling_3')">Rolling 3 Months</button>
          <button :class="{active: range==='rolling_12'}" @click="setRange('rolling_12')">Rolling 12 Months</button>
        </div>
      </div>

      <div class="totals">
        <div class="card">
          <div class="label">Team Life</div>
          <div class="value">${{ formatMoney(totals.totalLife) }}</div>
        </div>
        <div class="card">
          <div class="label">Team Annuity</div>
          <div class="value">${{ formatMoney(totals.totalAnnuity) }}</div>
        </div>
        <div class="card grand">
          <div class="label">Grand Total</div>
          <div class="value">${{ formatMoney(totals.grandTotal) }}</div>
        </div>
      </div>

      <div v-if="tree" class="tree">
        <TreeNode
          :node="tree"
          :range="range"
          @fetch-details="fetchDetails"
        />
      </div>
      <div v-else class="empty">No data.</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, defineAsyncComponent } from 'vue';
import axios from '@/config/axios.config';
import Sidebar from '@/components/Sidebar.vue';

// lazy load child component below
import TreeNode from './TreeNode.vue' // 组件见下方

const range = ref('all');
const tree = ref(null);
const totals = ref({ totalLife: 0, totalAnnuity: 0, grandTotal: 0 });

async function loadTree() {
  const { data } = await axios.get(`/reports/my-team-production`, { params: { range: range.value } });
  tree.value = data.tree || null;
  totals.value = data.totals || { totalLife: 0, totalAnnuity: 0, grandTotal: 0 };
}

function setRange(r) {
  range.value = r;
  loadTree();
}

async function fetchDetails(userId) {
  const { data } = await axios.get(`/reports/user-production-details`, {
    params: { id: userId, range: range.value }
  });
  return data; // { life: [...], annuity: [...] }
}

function formatMoney(n) {
  const num = Number(n) || 0;
  return num.toFixed(2);
}

onMounted(loadTree);
</script>

<style scoped>
.dashboard { display: flex; }
.page {
  flex: 1;
  padding: 32px;
  background: #f4f4f4;
  min-height: 100vh;
  margin-left: 280px;
}
.filter-controls { margin-bottom: 16px; }
.filter-buttons button {
  margin-right: 8px;
  padding: 6px 12px;
  border: none;
  background: #0055a4;
  color: white;
  border-radius: 6px;
  cursor: pointer;
}
.filter-buttons button.active,
.filter-buttons button:hover {
  background: #003f82;
}
.totals { display: flex; gap: 12px; margin: 16px 0 24px; flex-wrap: wrap; }
.card {
  background: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,.06);
  min-width: 180px;
}
.card .label { font-size: 12px; color: #666; }
.card .value { font-size: 18px; font-weight: 700; }
.card.grand { background: #002b5b; color: #fff; }
.empty { margin-top: 24px; color: #666; }
</style>
