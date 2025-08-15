<template>
  <div class="dashboard">
    <Sidebar />
    <div class="form-container">
      <h1>Appointment Request Sheet</h1>
      <p>Please list the carriers that you have pending cases ready to submit (Attach more if needed).</p>

      <form @submit.prevent="submitForm" class="form-grid">
        <div v-for="(caseItem, index) in cases" :key="index" class="case-block">
          <h3>Carrier Case #{{ index + 1 }}</h3>

          <label>
            Carrier
            <input type="text" v-model="caseItem.carrier" />
          </label>

          <label>
            Client Last Name
            <input type="text" v-model="caseItem.last_name" />
          </label>

          <label>
            Client First Name
            <input type="text" v-model="caseItem.first_name" />
          </label>

          <label>
            SSN
            <input type="text" v-model="caseItem.ssn" />
          </label>

          <label>
            Date of Birth
            <input type="date" v-model="caseItem.dob" />
          </label>

          <label>
            Signed Date
            <input type="date" v-model="caseItem.signed_date" />
          </label>

          <label>
            State
            <input type="text" v-model="caseItem.state" />
          </label>

          <button
            v-if="cases.length > 1"
            type="button"
            class="remove-btn"
            @click="removeCase(index)"
          >
            Remove
          </button>

          <hr class="full-width-divider" />
        </div>

        <div class="form-actions">
          <button type="button" @click="addCase">Add New Case</button>
          <button type="submit">Submit</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const cases = ref([
  {
    carrier: '',
    last_name: '',
    first_name: '',
    ssn: '',
    dob: '',
    signed_date: '',
    state: '',
  },
])

function addCase() {
  cases.value.push({
    carrier: '',
    last_name: '',
    first_name: '',
    ssn: '',
    dob: '',
    signed_date: '',
    state: '',
  })
}

function removeCase(index) {
  cases.value.splice(index, 1)
}

function submitForm() {
  // 保存数据到 localStorage，或后端
  localStorage.setItem('newAgentPage3', JSON.stringify(cases.value))
  alert('Saved successfully.')
  router.push('/employee/form4')
  // router.push('/employee/form5') // 如有下一页
}
</script>

<style scoped>
.dashboard {
  display: flex;
  padding: 40px 40px 100px;
  height: 100vh; /* ✅ 固定整页高度 */
  overflow-y: scroll;
}
.form-container {
  flex-grow: 1;
  padding: 40px;
  background-color: #f4f4f4;
  min-height: 100vh;
  margin-left: 280px;
}

h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 12px;
}

p {
  font-size: 15px;
  line-height: 1.6;
  color: #555;
  max-width: 900px;
  margin-bottom: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  background: #fff;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.case-block {
  grid-column: 1 / -1;
  margin-bottom: 30px;
}

label {
  display: flex;
  flex-direction: column;
  font-weight: 600;
  font-size: 14px;
}

input {
  margin-top: 6px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
}

.form-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

button {
  background-color: #0055a4;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

button:hover {
  background-color: #003f82;
}

.remove-btn {
  margin-top: 10px;
  background-color: #c62828;
}

.full-width-divider {
  grid-column: 1 / -1;
  border: none;
  border-top: 1px solid #ccc;
  margin: 20px 0;
}
</style>
