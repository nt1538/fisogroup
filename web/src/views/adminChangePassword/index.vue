<template>
  <AdminLayout>
    <h2>Change Password for #{{ userId }}</h2>

    <div class="card">
      <div class="row">
        <label>New Password</label>
        <input v-model="pw1" :type="show ? 'text' : 'password'" />
      </div>

      <div class="row">
        <label>Confirm Password</label>
        <input v-model="pw2" :type="show ? 'text' : 'password'" />
      </div>

      <div class="row">
        <label class="chk">
          <input type="checkbox" v-model="show" /> Show
        </label>
      </div>

      <p v-if="msg" :class="ok ? 'ok' : 'err'">{{ msg }}</p>

      <div class="actions">
        <button class="btn" :disabled="busy" @click="save">
          <span v-if="busy">Saving…</span>
          <span v-else>Update Password</span>
        </button>
        <router-link class="btn secondary" :to="`/admin/adminEmployeeEdit/${userId}`">Back</router-link>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import axios from '@/config/axios.config'
import AdminLayout from '@/layout/src/AdminLayout.vue'

// If you prefer sending SHA-256 like your registration page, reuse this helper.
// The backend also accepts raw text and will SHA-256 it, so this is optional.
async function toSha256(text) {
  const buffer = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

const route = useRoute()
const userId = route.params.id

const pw1 = ref('')
const pw2 = ref('')
const show = ref(false)
const busy = ref(false)
const msg = ref('')
const ok = ref(false)

async function save() {
  msg.value = ''
  ok.value = false

  if (!pw1.value || pw1.value.length < 6) {
    msg.value = 'Password must be at least 6 characters.'
    return
  }
  if (pw1.value !== pw2.value) {
    msg.value = 'Passwords do not match.'
    return
  }

  try {
    busy.value = true
    // Option A (send SHA-256 to match your standard):
    const sha = await toSha256(pw1.value)
    await axios.put(`/admin/employees/${userId}/password`, { new_password: sha })

    // Option B (send raw): await axios.put(`/admin/employees/${userId}/password`, { new_password: pw1.value })
    // Backend route supports either.

    ok.value = true
    msg.value = 'Password updated.'
    pw1.value = ''
    pw2.value = ''
  } catch (e) {
    console.error(e)
    msg.value = e?.response?.data?.error || 'Failed to update password.'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.card { background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 16px; max-width: 460px; }
.row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.row input { padding: 8px; border: 1px solid #ccc; border-radius: 6px; }
.chk { font-weight: 600; }
.actions { display: flex; gap: 10px; margin-top: 8px; }
.btn { background: #0055a4; color: #fff; padding: 8px 12px; border: 0; border-radius: 6px; cursor: pointer; }
.btn:hover { background: #003f82; }
.btn.secondary { background: #777; }
.ok { color: #1a7f37; font-weight: 600; }
.err { color: #b42318; font-weight: 600; }
</style>
