<template>
  <AdminLayout>
    <div class="admin-products">
    <h1>Products (Admin)</h1>

    <div class="filters">
      <label>Table:</label>
      <select v-model="mode" @change="load">
        <option value="life">Life</option>
        <option value="annuity">Annuity</option>
      </select>

      <label>Carrier (optional):</label>
      <input v-model="carrierFilter" placeholder="Filter by carrier" />
      <button @click="load">Refresh</button>
      <button @click="addNew">Add New</button>
    </div>

    <table class="grid">
      <thead>
        <tr>
          <th>Carrier</th>
          <th>Product</th>
          <th v-if="mode==='life'">Life Type</th>
          <th v-else>Age Bracket</th>
          <th>Rate</th>
          <th>FISO</th>
          <th>Excess</th>
          <th>Renewals</th>
          <th style="width:140px;">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="rowKey(row)">
          <td><input v-model="row.carrier_name" /></td>
          <td><input v-model="row.product_name" /></td>

          <td v-if="mode==='life'">
            <input v-model="row.life_product_type" placeholder="IUL/Term/UL/..." />
          </td>
          <td v-else>
            <input v-model="row.age_bracket" placeholder="Ages 0-70 or leave blank" />
          </td>

          <td><input v-model.number="row.product_rate" type="number" step="0.01" /></td>
          <td><input v-model.number="row.fiso_rate" type="number" step="0.01" /></td>
          <td><input v-model.number="row.excess_rate" type="number" step="0.01" /></td>
          <td><input v-model.number="row.renewal_rate" type="number" step="0.01" /></td>
          <td>
            <button @click="save(row)">Save</button>
            <button class="danger" @click="remove(row)">Delete</button>
          </td>
        </tr>

        <tr v-if="!rows.length">
          <td :colspan="mode==='life' ? 9 : 9" style="text-align:center; padding:16px;">No products</td>
        </tr>
      </tbody>
    </table>
  </div>
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/config/axios.config'
import AdminLayout from '@/layout/src/AdminLayout.vue'

const mode = ref('life') // 'life' | 'annuity'
const carrierFilter = ref('')
const rows = ref([])

function rowKey(r) {
  return mode.value === 'life'
    ? `${r.carrier_name}||${r.product_name}`
    : `${r.carrier_name}||${r.product_name}||${r.age_bracket || ''}`
}

async function load() {
  const base = mode.value === 'life' ? '/api/admin/product-life' : '/api/admin/product-annuity'
  const { data } = await axios.get(base, {
    params: { carrier: carrierFilter.value || undefined }
  })
  // keep a copy of original natural keys for safe updates
  rows.value = data.map(r => ({
    ...r,
    orig_carrier_name: r.carrier_name,
    orig_product_name: r.product_name,
    ...(mode.value === 'annuity' ? { orig_age_bracket: r.age_bracket ?? null } : {})
  }))
}

function addNew() {
  rows.value.unshift(
    mode.value === 'life'
      ? {
          carrier_name: '', product_name: '', life_product_type: null,
          product_rate: null, fiso_rate: null, excess_rate: null, renewal_rate: null,
          orig_carrier_name: null, orig_product_name: null
        }
      : {
          carrier_name: '', product_name: '', age_bracket: null,
          product_rate: null, fiso_rate: null, excess_rate: null, renewal_rate: null,
          orig_carrier_name: null, orig_product_name: null, orig_age_bracket: null
        }
  )
}

async function save(row) {
  const base = mode.value === 'life' ? '/api/admin/product-life' : '/api/admin/product-annuity'
  if (!row.carrier_name || !row.product_name) {
    alert('Carrier and Product are required'); return
  }
  const isNew = !row.orig_carrier_name && !row.orig_product_name

  if (mode.value === 'life') {
    const payload = {
      carrier_name: row.carrier_name,
      product_name: row.product_name,
      life_product_type: row.life_product_type ?? null,
      product_rate: row.product_rate ?? null,
      fiso_rate: row.fiso_rate ?? null,
      excess_rate: row.excess_rate ?? null,
      renewal_rate: row.renewal_rate ?? null,
      orig_carrier_name: row.orig_carrier_name,
      orig_product_name: row.orig_product_name,
    }
    if (isNew) {
      await axios.post(base, payload)
    } else {
      await axios.put(base, payload)
    }
  } else {
    const payload = {
      carrier_name: row.carrier_name,
      product_name: row.product_name,
      age_bracket: row.age_bracket ?? null,
      product_rate: row.product_rate ?? null,
      fiso_rate: row.fiso_rate ?? null,
      excess_rate: row.excess_rate ?? null,
      renewal_rate: row.renewal_rate ?? null,
      orig_carrier_name: row.orig_carrier_name,
      orig_product_name: row.orig_product_name,
      orig_age_bracket: row.orig_age_bracket ?? null
    }
    if (isNew) {
      await axios.post(base, payload)
    } else {
      await axios.put(base, payload)
    }
  }

  await load() // refresh and reset orig_* keys
}

async function remove(row) {
  const base = mode.value === 'life' ? '/api/admin/product-life' : '/api/admin/product-annuity'
  if (!confirm('Delete this product?')) return

  if (mode.value === 'life') {
    await axios.delete(base, {
      params: {
        carrier_name: row.orig_carrier_name || row.carrier_name,
        product_name: row.orig_product_name || row.product_name
      }
    })
  } else {
    await axios.delete(base, {
      params: {
        carrier_name: row.orig_carrier_name || row.carrier_name,
        product_name: row.orig_product_name || row.product_name,
        age_bracket:  row.orig_age_bracket  ?? row.age_bracket ?? null
      }
    })
  }

  await load()
}

onMounted(load)
</script>

<style scoped>
.admin-products { padding: 24px; }
.filters { display:flex; gap:12px; align-items:center; margin-bottom:12px; }
.grid { width:100%; border-collapse: collapse; }
.grid th, .grid td { border:1px solid #ddd; padding:8px; }
.grid input, .grid select { width:100%; box-sizing:border-box; }
button { padding:6px 10px; border-radius:6px; border:none; background:#0055a4; color:#fff; cursor:pointer; }
button.danger { background:#d33; }
</style>
