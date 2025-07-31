<template>
  <div class="space-y-6">
    <h2 class="text-xl font-bold text-gray-800 border-b pb-2">Business Entity Information (if applicable)</h2>

    <!-- EIN, Business Name, Website -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">EIN</label>
        <input v-model="form.ein" type="text" class="input" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Business Name</label>
        <input v-model="form.businessName" type="text" class="input" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Website</label>
        <input v-model="form.website" type="text" class="input" />
      </div>
    </div>

    <!-- Title, Phone -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Your Title</label>
        <input v-model="form.title" type="text" class="input" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Phone</label>
        <input v-model="form.phone" type="text" class="input" />
      </div>
    </div>

    <!-- Principal Info -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Principal Name</label>
        <input v-model="form.principalName" type="text" class="input" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Principal Title</label>
        <input v-model="form.principalTitle" type="text" class="input" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Principal Email</label>
        <input v-model="form.principalEmail" type="email" class="input" />
      </div>
    </div>

    <!-- Company Type Radio Group -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Company Type</label>
      <div class="space-y-2">
        <label class="flex items-center space-x-2">
          <input type="radio" value="Corporation" v-model="form.companyType" />
          <span>Corporation</span>
        </label>
        <label class="flex items-center space-x-2">
          <input type="radio" value="Partnership" v-model="form.companyType" />
          <span>Partnership</span>
        </label>
        <label class="flex items-center space-x-2">
          <input type="radio" value="LLC" v-model="form.companyType" />
          <span>LLC</span>
        </label>
        <label class="flex items-center space-x-2">
          <input type="radio" value="LLP" v-model="form.companyType" />
          <span>LLP</span>
        </label>
      </div>
    </div>

    <!-- Company Address -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Company Address (Line 1)</label>
        <input v-model="form.companyAddress" type="text" class="input" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Start Date</label>
        <input v-model="form.startDate" type="date" class="input" />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">City</label>
        <input v-model="form.city" type="text" class="input" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">State</label>
        <input v-model="form.state" type="text" class="input" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Zip Code</label>
        <input v-model="form.zip" type="text" class="input" />
      </div>
    </div>

    <!-- Upload Instructions -->
    <div class="mt-8">
      <h3 class="text-lg font-semibold text-gray-800 mb-2">Additional Instructions</h3>
      <ul class="list-disc pl-6 text-sm text-gray-600 space-y-1">
        <li>Attach a copy of your Individual or Corporate Insurance License</li>
        <li>Attach your E&O (Errors and Omissions Insurance)</li>
        <li>Attach a voided check</li>
        <li>Attach your AML Certificate (if not completed via LIMRA)</li>
        <li>List the name of the insurance company you wish to contract with</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const form = ref({
  ein: '',
  businessName: '',
  website: '',
  title: '',
  phone: '',
  principalName: '',
  principalTitle: '',
  principalEmail: '',
  companyType: '',
  companyAddress: '',
  startDate: '',
  city: '',
  state: '',
  zip: '',
})
</script>

<style scoped>
.input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
}
</style>

