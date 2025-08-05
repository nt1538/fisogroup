<template>
  <div class="p-6 max-w-4xl mx-auto bg-white rounded shadow-md">
    <h2 class="text-2xl font-bold mb-6">Letter of Explanation</h2>

    <div v-for="(entry, index) in actions" :key="index" class="mb-8 border-b pb-4">
      <h3 class="text-lg font-semibold mb-2">Entry {{ index + 1 }}</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block font-medium mb-1">Date of Action:</label>
          <input type="date" v-model="entry.date" class="input" />
        </div>
        <div>
          <label class="block font-medium mb-1">Action:</label>
          <input type="text" v-model="entry.action" class="input" />
        </div>
        <div class="md:col-span-2">
          <label class="block font-medium mb-1">Reason:</label>
          <input type="text" v-model="entry.reason" class="input" />
        </div>
        <div class="md:col-span-2">
          <label class="block font-medium mb-1">Explanation:</label>
          <textarea v-model="entry.explanation" rows="3" class="input"></textarea>
        </div>
      </div>
    </div>

    <button @click="addEntry" class="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
      + Add Another Entry
    </button>

    <div class="mb-4">
      <label class="block font-medium mb-1">Signature:</label>
      <input type="text" v-model="signature" class="input" />
    </div>
    <div class="mb-6">
      <label class="block font-medium mb-1">Date:</label>
      <input type="date" v-model="signedDate" class="input" />
    </div>

    <p class="text-sm text-gray-700 mb-6">
      I attest that the information I have provided is true to the best of my knowledge.
      I acknowledge that if any information changes, I will notify my agency office within 5 days of such change.
      Further, I understand that my agency may contact me when I need to answer carrier specific questions.
    </p>

    <button @click="submitForm" class="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">
      Submit
    </button>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'

const actions = reactive([
  { date: '', action: '', reason: '', explanation: '' },
  { date: '', action: '', reason: '', explanation: '' },
  { date: '', action: '', reason: '', explanation: '' },
])

const signature = ref('')
const signedDate = ref('')

function addEntry() {
  actions.push({ date: '', action: '', reason: '', explanation: '' })
}

function submitForm() {
  console.log('Form submitted with:', {
    actions,
    signature: signature.value,
    signedDate: signedDate.value
  })
  // send to backend via axios or API handler here
}
</script>

<style scoped>
.input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  outline: none;
  transition: border-color 0.2s;
}
.input:focus {
  border-color: #3b82f6;
}
</style>
