<template>
  <div class="dashboard">
    <Sidebar />
    <div class="form-container">
      <h1>Letter of Explanation</h1>
      <p>
        Please provide detailed explanations for any <strong>Yes</strong> answers in the previous form.
        You can enter multiple actions with full details below.
      </p>

      <form @submit.prevent="submitForm" class="form-grid">
        <div
          v-for="(entry, index) in explanations"
          :key="index"
          class="question-block"
        >
          <label class="question-label">Entry {{ index + 1 }}</label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="question-label">Date of Action:</label>
              <input type="date" v-model="entry.date" class="input" />
            </div>
            <div>
              <label class="question-label">Action:</label>
              <input type="text" v-model="entry.action" class="input" />
            </div>
            <div class="md:col-span-2">
              <label class="question-label">Reason:</label>
              <input type="text" v-model="entry.reason" class="input" />
            </div>
            <div class="md:col-span-2">
              <label class="question-label">Explanation:</label>
              <textarea v-model="entry.explanation" rows="3" class="input"></textarea>
            </div>
          </div>
        </div>

        <button type="button" @click="addEntry" style="margin-bottom: 20px">
          + Add Another Entry
        </button>

        <div class="form-actions">
          <button type="submit">Submit</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'

const router = useRouter()

const explanations = reactive([
  { date: '', action: '', reason: '', explanation: '' },
  { date: '', action: '', reason: '', explanation: '' },
  { date: '', action: '', reason: '', explanation: '' },
])

function addEntry() {
  explanations.push({ date: '', action: '', reason: '', explanation: '' })
}

function submitForm() {
  localStorage.setItem('newAgentPage5', JSON.stringify(explanations))
  alert('Letter(s) of Explanation saved.')
  router.push('/employee/form6')
}
</script>

<style scoped>
.dashboard {
  display: flex;
  padding: 40px 40px 100px;
  height: 100vh;
  overflow-y: scroll;
}
.form-container {
  flex-grow: 1;
  padding: 40px 40px 100px;
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
  display: flex;
  flex-direction: column;
  gap: 24px;
  background: #fff;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.question-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 20px;
}

.question-label {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
}

.input {
  width: 100%;
  padding: 10px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 6px;
  box-sizing: border-box;
}

.form-actions {
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
</style>
