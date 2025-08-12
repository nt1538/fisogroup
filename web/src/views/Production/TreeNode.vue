<template>
  <div class="node">
    <div class="row">
      <button class="toggle" @click="expanded = !expanded">
        <span v-if="expanded">▼</span><span v-else>▶</span>
      </button>

      <div class="who">
        <div class="name">{{ node.name }}</div>
        <div class="meta">ID: {{ node.id }} • Level: {{ node.hierarchy_level }}</div>
        <!-- Optional personal subtotals (from backend), if you want: -->
        <!-- <div class="meta small">Personal — Life: ${{ fmt(node.personal_life_sum) }}, Annuity: ${{ fmt(node.personal_annuity_sum) }}</div> -->
      </div>

      <div class="sums">
        <div class="sum">
          <div class="label">Team Life</div>
          <div class="value">${{ fmt(node.life_sum) }}</div>
        </div>
        <div class="sum">
          <div class="label">Team Annuity</div>
          <div class="value">${{ fmt(node.annuity_sum) }}</div>
        </div>
        <div class="sum total">
          <div class="label">Team Total</div>
          <div class="value">${{ fmt(node.total_sum) }}</div>
        </div>
      </div>
    </div>

    <div v-if="expanded" class="details">
      <div class="section">
        <div class="section-title">Life Orders (Personal Commission)</div>
        <table class="tbl" v-if="my.life.length">
          <thead>
            <tr>
              <th>Policy #</th><th>Product</th><th>Carrier</th><th>App Date</th>
              <th>Insured</th><th>Writing Agent</th><th>Face</th><th>Target</th>
              <th>Rate %</th><th>Commission %</th><th>Commission $</th><th>Type</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in my.life" :key="r.id">
              <td>{{ r.policy_number }}</td>
              <td>{{ r.product_name }}</td>
              <td>{{ r.carrier_name }}</td>
              <td>{{ fmtDate(r.application_date) }}</td>
              <td>{{ r.insured_name }}</td>
              <td>{{ r.writing_agent }}</td>
              <td>{{ r.face_amount }}</td>
              <td>{{ r.target_premium }}</td>
              <td>{{ fmt(r.product_rate) }}</td>
              <td>{{ fmt(r.commission_percent) }}%</td>
              <td>${{ fmt(r.commission_amount) }}</td>
              <td>{{ r.order_type }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-mini">No life orders.</div>
      </div>

      <div class="section">
        <div class="section-title">Annuity Orders (Personal Commission)</div>
        <table class="tbl" v-if="my.annuity.length">
          <thead>
            <tr>
              <th>Policy #</th><th>Product</th><th>Carrier</th><th>App Date</th>
              <th>Insured</th><th>Writing Agent</th><th>Initial Premium</th><th>Flex Premium</th>
              <th>Rate %</th><th>Commission %</th><th>Commission $</th><th>Type</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in my.annuity" :key="r.id">
              <td>{{ r.policy_number }}</td>
              <td>{{ r.product_name }}</td>
              <td>{{ r.carrier_name }}</td>
              <td>{{ fmtDate(r.application_date) }}</td>
              <td>{{ r.insured_name }}</td>
              <td>{{ r.writing_agent }}</td>
              <td>{{ r.initial_premium }}</td>
              <td>{{ r.flex_premium }}</td>
              <td>{{ fmt(r.product_rate) }}</td>
              <td>{{ fmt(r.commission_percent) }}%</td>
              <td>${{ fmt(r.commission_amount) }}</td>
              <td>{{ r.order_type }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-mini">No annuity orders.</div>
      </div>

      <div v-if="node.children?.length" class="children">
        <TreeNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :range="range"
          :details-map="detailsMap"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  node: { type: Object, required: true },
  range: { type: String, default: 'all' },
  detailsMap: { type: Object, required: true }, // { [userId]: { life:[], annuity:[] } }
});

const expanded = ref(false);
const my = computed(() => props.detailsMap[props.node.id] || { life: [], annuity: [] });

function fmt(n) { return (Number(n) || 0).toFixed(2); }
function fmtDate(s) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d)) return '';
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
</script>

<style scoped>
.node { background:#fff; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,.06); margin-bottom:12px; }
.row { display:flex; align-items:center; padding:10px 12px; border-bottom:1px solid #eee; }
.toggle { margin-right:8px; border:none; background:transparent; cursor:pointer; font-size:14px; }
.who { flex:1; }
.name { font-weight:700; }
.meta { font-size:12px; color:#666; }
.meta.small { font-size:11px; }
.sums { display:flex; gap:16px; }
.sum .label { font-size:11px; color:#666; }
.sum .value { font-weight:700; }
.sum.total .value { color:#0b6; }

.details { padding:12px; }
.section { margin:12px 0; }
.section-title { font-weight:700; margin-bottom:6px; }
.tbl { width:100%; border-collapse:collapse; font-size:13px; }
.tbl th,.tbl td { border:1px solid #ddd; padding:6px 8px; text-align:left; }
.children { margin-left:36px; margin-top:8px; }
.empty-mini { color:#666; font-size:13px; }
</style>
