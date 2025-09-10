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
        <div v-if="loading" class="loader">Loading team & prefetching orders…</div>
      </div>

      <div class="totals" v-if="totals">
        <div class="card">
          <div class="label">Team Life</div>
          <div class="value">${{ fmtMoney(totals.totalLife) }}</div>
        </div>
        <div class="card">
          <div class="label">Team Annuity</div>
          <div class="value">${{ fmtMoney(totals.totalAnnuity) }}</div>
        </div>
        <div class="card grand">
          <div class="label">Grand Total</div>
          <div class="value">${{ fmtMoney(totals.totalLife + totals.totalAnnuity) }}</div>
        </div>
      </div>

      <div v-if="tree" class="tree">
        <TreeNode
          :node="tree"
          :range="range"
          :details-map="detailsMap"
        />
      </div>

      <div v-else class="empty">No data.</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '@/config/axios.config';
import Sidebar from '@/components/Sidebar.vue';
import TreeNode from './TreeNode.vue';

const range = ref('all');
const tree = ref(null);
const totals = ref({ totalLife: 0, totalAnnuity: 0 });
const loading = ref(false);

// userId -> { life: [], annuity: [] }
const detailsMap = ref({});

function fmtMoney(n) { return (Number(n)||0).toFixed(2); }

function collectIds(root) {
  const ids = [];
  const stack = [root];
  const seen = new Set();
  while (stack.length) {
    const n = stack.pop();
    if (!n || seen.has(n.id)) continue;
    seen.add(n.id);
    ids.push(n.id);
    if (n.children?.length) stack.push(...n.children);
  }
  return ids;
}

async function fetchAll(ids, fetcher, concurrency = 6) {
  const map = {};
  let i = 0;
  async function worker() {
    while (i < ids.length) {
      const idx = i++;
      const id = ids[idx];
      try {
        const data = await fetcher(id);
        map[id] = {
          life: Array.isArray(data?.life) ? data.life : [],
          annuity: Array.isArray(data?.annuity) ? data.annuity : [],
        };
      } catch (e) {
        console.error('Prefetch failed for', id, e);
        map[id] = { life: [], annuity: [] };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));
  return map;
}

async function loadAll() {
  loading.value = true;
  try {
    // 1) Load tree + team totals
    const { data } = await axios.get('/reports/my-team-production', {
      params: { range: range.value }
    });
    tree.value = data.tree || null;
    totals.value = data.totals || { totalLife: 0, totalAnnuity: 0 };

    // 2) Prefetch all members' orders (Personal Commission only)
    if (!tree.value) {
      detailsMap.value = {};
      return;
    }
    const ids = collectIds(tree.value);
    const map = await fetchAll(ids, (id) =>
      axios.get('/reports/user-production-details', {
        params: { id, range: range.value, personalOnly: 1 }
      }).then(r => r.data)
    );
    detailsMap.value = map;
  } finally {
    loading.value = false;
  }
}

function setRange(r) {
  if (range.value === r) return;
  range.value = r;
  loadAll();
}

onMounted(loadAll);
</script>

<style scoped>
.dashboard { display: flex; }
.page {
  flex: 1; padding: 32px; background: #f4f4f4;
  min-height: 100vh; margin-left: 280px;
  overflow-y: scroll;
}
.filter-controls { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.filter-buttons button {
  margin-right: 8px; padding: 6px 12px; border: none;
  background: #0055a4; color: white; border-radius: 6px; cursor: pointer;
}
.filter-buttons button.active,
.filter-buttons button:hover { background: #003f82; }
.loader { color: #555; font-size: 14px; }
.totals { display: flex; gap: 12px; margin: 16px 0 24px; flex-wrap: wrap; }
.card {
  background: #fff; padding: 12px 16px; border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,.06); min-width: 180px;
}
.card .label { font-size: 12px; color: #666; }
.card .value { font-size: 18px; font-weight: 700; }
.card.grand { background: #002b5b; color: #fff; }
.empty { margin-top: 24px; color: #666; }
.tree { display: block; }
</style>
