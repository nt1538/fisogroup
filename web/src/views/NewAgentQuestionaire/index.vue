<template>
  <div class="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-md">
    <h1 class="text-2xl font-bold mb-6">New Agent Registration Form</h1>
    <form @submit.prevent="submitForm">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="font-semibold">Last Name</label>
          <input v-model="form.lastName" type="text" class="input" required />
        </div>

        <div>
          <label class="font-semibold">First Name</label>
          <input v-model="form.firstName" type="text" class="input" required />
        </div>

        <div>
          <label class="font-semibold">Social Security Number</label>
          <input v-model="form.ssn" type="text" class="input" required />
        </div>

        <div>
          <label class="font-semibold">Date of Birth</label>
          <input v-model="form.dob" type="date" class="input" required />
        </div>

        <div>
          <label class="font-semibold">Gender</label>
          <select v-model="form.gender" class="input" required>
            <option disabled value="">Select Gender</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>

        <div>
          <label class="font-semibold">Email</label>
          <input v-model="form.email" type="email" class="input" required />
        </div>

        <div>
          <label class="font-semibold">Phone</label>
          <input v-model="form.phone" type="tel" class="input" required />
        </div>

        <div>
          <label class="font-semibold">Driver’s License State</label>
          <input v-model="form.dlState" type="text" class="input" required />
        </div>

        <div>
          <label class="font-semibold">Driver’s License Number</label>
          <input v-model="form.dlNumber" type="text" class="input" required />
        </div>

        <div>
          <label class="font-semibold">Driver’s License Expiration Date</label>
          <input v-model="form.dlExpiration" type="date" class="input" required />
        </div>

        <div class="md:col-span-2">
          <label class="font-semibold">Resident Address</label>
          <input v-model="form.residentAddress" type="text" class="input" required />
        </div>

        <div class="md:col-span-2">
          <label class="font-semibold">Business Address</label>
          <input v-model="form.businessAddress" type="text" class="input" required />
        </div>

        <div class="md:col-span-2">
          <label class="font-semibold">Mailing Address</label>
          <input v-model="form.mailingAddress" type="text" class="input" required />
        </div>

        <div class="md:col-span-2">
          <label class="font-semibold">Are you a Registered Rep with FINRA?</label>
          <select v-model="form.isFinraRep" class="input" required>
            <option disabled value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </div>

        <template v-if="form.isFinraRep === 'Yes'">
          <div>
            <label class="font-semibold">Broker/Dealer Name</label>
            <input v-model="form.brokerDealer" type="text" class="input" />
          </div>

          <div>
            <label class="font-semibold">CRD #</label>
            <input v-model="form.crdNumber" type="text" class="input" />
          </div>
        </template>

        <div class="md:col-span-2">
          <label class="font-semibold">Honors</label>
          <input v-model="form.honors" type="text" class="input" />
        </div>

        <div class="md:col-span-2">
          <label class="font-semibold">If AML provider is LIMRA, date completed</label>
          <input v-model="form.amlDate" type="date" class="input" />
        </div>

        <div class="md:col-span-2">
          <label class="font-semibold">Doing Business As</label>
          <select v-model="form.doingBusinessAs" class="input" required>
            <option disabled value="">Select</option>
            <option>Individual</option>
            <option>Business Entity</option>
            <option>Solicitor/LOA</option>
          </select>
        </div>

        <template v-if="form.doingBusinessAs === 'Solicitor/LOA'">
          <div class="md:col-span-2">
            <label class="font-semibold">Who are you assigning commissions to?</label>
            <input v-model="form.assignTo" type="text" class="input" />
          </div>
        </template>

        <template v-if="form.doingBusinessAs === 'Business Entity'">
          <div>
            <label class="font-semibold">EIN</label>
            <input v-model="form.ein" type="text" class="input" />
          </div>
          <div>
            <label class="font-semibold">Business Name</label>
            <input v-model="form.businessName" type="text" class="input" />
          </div>
          <div>
            <label class="font-semibold">Website</label>
            <input v-model="form.website" type="text" class="input" />
          </div>
          <div>
            <label class="font-semibold">Your Title</label>
            <input v-model="form.title" type="text" class="input" />
          </div>
          <div>
            <label class="font-semibold">Phone</label>
            <input v-model="form.bizPhone" type="tel" class="input" />
          </div>
          <div>
            <label class="font-semibold">Principal Name</label>
            <input v-model="form.principalName" type="text" class="input" />
          </div>
          <div>
            <label class="font-semibold">Principal Title</label>
            <input v-model="form.principalTitle" type="text" class="input" />
          </div>
          <div>
            <label class="font-semibold">Principal Email</label>
            <input v-model="form.principalEmail" type="email" class="input" />
          </div>
          <div>
            <label class="font-semibold">Company Type</label>
            <select v-model="form.companyType" class="input">
              <option disabled value="">Select Type</option>
              <option>Corporation</option>
              <option>Partnership</option>
              <option>LLC</option>
              <option>LLP</option>
            </select>
          </div>
          <div>
            <label class="font-semibold">Company Address</label>
            <input v-model="form.companyAddress" type="text" class="input" />
          </div>
          <div>
            <label class="font-semibold">Start Date</label>
            <input v-model="form.bizStartDate" type="date" class="input" />
          </div>
        </template>
      </div>

      <button type="submit" class="mt-6 bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700">
        Submit
      </button>
    </form>
  </div>
</template>

<script setup>
import { reactive } from 'vue'

const form = reactive({
  lastName: '', firstName: '', ssn: '', dob: '', gender: '', email: '', phone: '',
  dlState: '', dlNumber: '', dlExpiration: '', residentAddress: '', businessAddress: '', mailingAddress: '',
  isFinraRep: '', brokerDealer: '', crdNumber: '', honors: '', amlDate: '', doingBusinessAs: '', assignTo: '',
  ein: '', businessName: '', website: '', title: '', bizPhone: '', principalName: '', principalTitle: '', principalEmail: '',
  companyType: '', companyAddress: '', bizStartDate: ''
})

function submitForm() {
  console.log('Submitted form:', form)
  // TODO: Send data to backend for PDF injection
}
</script>

<style scoped>
.input {
  @apply w-full mt-1 p-2 border border-gray-300 rounded;
}
</style>
