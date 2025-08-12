<template>
  <div class="node">
    <div class="row">
      <button class="toggle" @click="toggle">
        <span v-if="expanded">▼</span><span v-else>▶</span>
      </button>
      <div class="who">
        <div class="name">{{ node.name }}</div>
        <div class="meta">
          ID: {{ node.id }} • Level: {{ node.hierarchy_level }}
        </div>
        <!-- Optional: show personal subtotals smaller -->
        <!-- <div class="meta">Personal — Life: ${{ formatMoney(node.personal_life_sum) }}, Annuity: ${{ formatMoney(node.personal_annuity_sum) }}</div> -->
      </div>
      <div class="sums">
        <div class="sum">
          <div class="label">Team Life</div>
          <div class="value">${{ formatMoney(node.life_sum) }}</div>
        </div>
        <div class="sum">
          <div class="label">Team Annuity</div>
          <div class="value">${{ formatMoney(node.annuity_sum) }}</div>
        </div>
        <div class="sum total">
          <div class="label">Team Total</div>
          <div class="value">${{ formatMoney(node.total_sum) }}</div>
        </div>
      </div>
    </div>

    <div v-if="expanded" class="details">
      <div v-if="loading" class="loading">Loading...</div>

      <template v-else>
        <div class="section">
          <div class="section-title">Life Orders ({{ details.life.length }})</div>
          <table class="tbl" v-if="details.life.length">
            <thead>
              <tr>
                <th>Policy #</th><th>Product</th><th>Carrier</th><th>App Date</th>
                <th>Insured</th><th>Writing Agent</th><th>Face</th><th>Target</th>
                <th>Rate %</th><th>Commission %</th><th>Commission $</th><th>Type</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in details.life" :key="r.id">
                <td>{{ r.policy_number }}</td>
                <td>{{ r.product_name }}</td>
                <td>{{ r.carrier_name }}</td>
                <td>{{ fmtDate(r.application_date) }}</td>
                <td>{{ r.insured_name }}</td>
                <td>{{ r.writing_agent }}</td>
                <td>{{ r.face_amount }}</td>
                <td>{{ r.target_premium }}</td>
                <td>{{ r.product_rate }}</td>
                <td>{{ formatPercent(r.commission_percent) }}%</td>
                <td>${{ formatMoney(r.commission_amount) }}</td>
                <td>{{ r.order_type }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-mini">No life orders.</div>
        </div>

        <div class="section">
          <div class="section-title">Annuity Orders ({{ details.annuity.length }})</div>
          <table class="tbl" v-if="details.annuity.length">
            <thead>
              <tr>
                <th>Policy #</th><th>Product</th><th>Carrier</th><th>App Date</th>
                <th>Insured</th><th>Writing Agent</th><th>Initial Premium</th><th>Flex Premium</th>
                <th>Rate %</th><th>Commission %</th><th>Commission $</th><th>Type</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in details.annuity" :key="r.id">
                <td>{{ r.policy_number }}</td>
                <td>{{ r.product_name }}</td>
                <td>{{ r.carrier_name }}</td>
                <td>{{ fmtDate(r.application_date) }}</td>
                <td>{{ r.insured_name }}</td>
                <td>{{ r.writing_agent }}</td>
                <td>{{ r.initial_premium }}</td>
                <td>{{ r.flex_premium }}</td>
                <td>{{ r.product_rate }}</td>
                <td>{{ formatPercent(r.commission_percent) }}%</td>
                <td>${{ formatMoney(r.commission_amount) }}</td>
                <td>{{ r.order_type }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-mini">No annuity orders.</div>
        </div>

        <div v-if="node.children && node.children.length" class="children">
          <TreeNode
            v-for="child in node.children"
            :key="child.id"
            :node="child"
            :range="range"
            :fetch-details="fetchDetails" 
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  node: { type: Object, required: true },
  range: { type: String, default: 'all' },
  fetchDetails: { type: Function, required: true }  // <-- accept function
});

const expanded = ref(false);
const loading = ref(false);
const details = ref({ life: [], annuity: [] });
let loadedOnce = false;

function formatMoney(n){ return (Number(n)||0).toFixed(2); }
function formatPercent(n){ return (Number(n)||0).toFixed(2); }
function fmtDate(s){ if(!s) return ''; const d=new Date(s); if(isNaN(d)) return ''; const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; }

async function toggle() {
  expanded.value = !expanded.value;
  if (expanded.value && !loadedOnce) {
    loading.value = true;
    try {
      const res = await props.fetchDetails(props.node.id); // <-- call prop
      details.value = res || { life: [], annuity: [] };
      loadedOnce = true;
    } finally {
      loading.value = false;
    }
  }
}
</script>

<style scoped>
.node { background: #fff; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,.06); margin-bottom: 12px; }
.row { display: flex; align-items: center; padding: 10px 12px; border-bottom: 1px solid #eee; }
.toggle {
  width: 28px; height: 28px; border-radius: 6px; border: 1px solid #ccc; background: #fafafa; cursor: pointer; margin-right: 10px;
}
.who { flex: 1; }
.name { font-weight: 700; }
.meta { font-size: 12px; color: #666; }
.sums { display: flex; gap: 16px; }
.sum .label { font-size: 11px; color: #666; }
.sum .value { font-weight: 700; }
.sum.total .value { color: #0b6; }

.details { padding: 12px; }
.loading { color: #666; padding: 8px 0; }
.section { margin: 12px 0; overflow-y: scroll;}
.section-title { font-weight: 700; margin-bottom: 6px; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th, .tbl td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
.children { margin-left: 36px; margin-top: 8px; }
.empty-mini { color: #666; font-size: 13px; }
</style>
