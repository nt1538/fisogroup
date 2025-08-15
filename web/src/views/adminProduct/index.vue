<template>
  <div class="admin-products">
    <h1>Products (Admin)</h1>

    <div class="filters">
      <label>Product Line:</label>
      <select v-model="filters.product_line">
        <option value="life">Life</option>
        <option value="annuity">Annuity</option>
      </select>

      <label>Carrier (optional):</label>
      <input v-model="filters.carrier" placeholder="Filter by carrier" />

      <button @click="load">Refresh</button>
      <button @click="addNew">Add New Product</button>
    </div>

    <table class="grid">
      <thead>
        <tr>
          <th>Line</th>
          <th>Carrier</th>
          <th>Product Name</th>
          <th>Life Type</th>
          <th>Age Bracket</th>
          <th>Rate</th>
          <th>From Carrier</th>
          <th>Excess</th>
          <th>Renewals</th>
          <th>Active</th>
          <th style="width:140px;">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td>
            <select v-model="row.product_line">
              <option value="life">life</option>
              <option value="annuity">annuity</option>
            </select>
          </td>
          <td><input v-model="row.carrier_name" /></td>
          <td><input v-model="row.product_name" /></td>
          <td><input v-model="row.life_product_type" placeholder="IUL/Term/..." /></td>
          <td><input v-model="row.age_bracket_text" placeholder="Ages 0-70" /></td>
          <td><input v-model.number="row.product_rate" type="number" step="0.01" /></td>
          <td><input v-model.number="row.from_carrier_rate" type="number" step="0.01" /></td>
          <td><input v-model.number="row.excess" type="number" step="0.01" /></td>
          <td><input v-model.number="row.renewals" type="number" step="0.01" /></td>
          <td>
            <input type="checkbox" v-model="row.is_active" />
          </td>
          <td>
            <button @click="save(row)">Save</button>
            <button class="danger" @click="remove(row)">Delete</button>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td colspan="11" style="text-align:center; padding:16px;">No products</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/config/axios.config'

const filters = ref({ product_line: 'life', carrier: '' })
const rows = ref([])

async function load() {
  const { data } = await axios.get('/admin/products', { params: filters.value })
  rows.value = data
}

function addNew() {
  rows.value.unshift({
    id: null,
    product_line: filters.value.product_line,
    carrier_name: '',
    product_name: '',
    life_product_type: null,
    age_bracket_text: null,
    product_rate: null,
    from_carrier_rate: null,
    excess: null,
    renewals: null,
    is_active: true,
  })
}

async function save(row) {
  if (!row.product_line || !row.carrier_name || !row.product_name) {
    alert('Line, Carrier, and Product Name are required')
    return
  }
  if (row.id) {
    await axios.put(`/admin/products/${row.id}`, row)
  } else {
    const { data } = await axios.post('/admin/products', row)
    row.id = data.id
  }
  await load()
}

async function remove(row) {
  if (!row.id) {
    rows.value = rows.value.filter(r => r !== row)
    return
  }
  if (confirm('Delete this product?')) {
    await axios.delete(`/admin/products/${row.id}`)
    await load()
  }
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
