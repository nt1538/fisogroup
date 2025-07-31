<template>
  <div class="dashboard">
    <Sidebar />
    <div class="form-container">
      <h1>New Agent Information Collection Form</h1>
      <p>This form is designed to collect the necessary information to assist new agents in completing
their contracting process. The information provided will only be used for this purpose. All the
information will be submitted through our online licensing system, SureLC. Signing and
submitting the information and Signature Page authorizes FISO GROUP LLC( FISO) to submit
your information through our online licensing program. Signing the EFT Authorization allows for
carriers and FISO to direct deposit your commissions. </p>
      <form @submit.prevent="submitForm" class="form-grid">

        <label>
          Last Name (as shown on Driver’s License)
          <input type="text" v-model="form.last_name" required />
        </label>

        <label>
          First Name (as shown on Driver’s License)
          <input type="text" v-model="form.first_name" required />
        </label>

        <label>
          Social Security Number (SSN)
          <input type="text" v-model="form.ssn" placeholder="XXX-XX-XXXX" required />
        </label>

        <label>
          Date of Birth (DOB)
          <input type="date" v-model="form.dob" required />
        </label>

        <label>
          Gender
          <select v-model="form.gender" required>
            <option disabled value="">Select</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </label>

        <label>
          Email Address
          <input type="email" v-model="form.email" required />
        </label>

        <label>
          Phone Number
          <input type="tel" v-model="form.phone" placeholder="123-456-7890" required />
        </label>

        <label>
          Driver’s License State
          <input type="text" v-model="form.dl_state" required />
        </label>

        <label>
          Driver’s License Number
          <input type="text" v-model="form.dl_number" required />
        </label>

        <label>
          Driver’s License Expiration Date
          <input type="date" v-model="form.dl_expiration" required />
        </label>

        <label>
          Resident Address
          <textarea v-model="form.resident_address" required></textarea>
        </label>

        <label>
          Business Address
          <textarea v-model="form.business_address"></textarea>
        </label>

        <label>
          Mailing Address
          <textarea v-model="form.mailing_address"></textarea>
        </label>

        <label>
          Are you a Registered Rep with FINRA?
          <select v-model="form.finra_registered" required>
            <option disabled value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </label>

        <template v-if="form.finra_registered === 'Yes'">
          <label>
            Broker/Dealer Name
            <input type="text" v-model="form.broker_dealer" />
          </label>

          <label>
            CRD #
            <input type="text" v-model="form.crd_number" />
          </label>
        </template>

        <label>
          Please list any Honors you currently hold
          <input type="text" v-model="form.honors" />
        </label>

        <label>
          If AML provider is LIMRA, date completed
          <input type="date" v-model="form.aml_date" />
        </label>

        <label>
          Doing Business As:
          <select v-model="form.dba" required>
            <option disabled value="">Select</option>
            <option>Individual</option>
            <option>Business Entity</option>
            <option>Solicitor/LOA</option>
          </select>
        </label>

        <template v-if="form.dba === 'Solicitor/LOA'">
          <label>
            Who are you assigning commissions to?
            <input type="text" v-model="form.assign_to" />
          </label>
        </template>

        <div class="form-actions">
          <button type="submit">Next Page</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Sidebar from '@/components/Sidebar.vue';

const form = ref({
  last_name: '',
  first_name: '',
  ssn: '',
  dob: '',
  gender: '',
  email: '',
  phone: '',
  dl_state: '',
  dl_number: '',
  dl_expiration: '',
  resident_address: '',
  business_address: '',
  mailing_address: '',
  finra_registered: '',
  broker_dealer: '',
  crd_number: '',
  honors: '',
  aml_date: '',
  dba: '',
  assign_to: ''
});

function submitForm() {
  console.log('Form submitted:', form.value);
  // TODO: 发送表单数据至后端 API，或进入下一页表单逻辑
}
</script>

<style scoped>
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

label {
  display: flex;
  flex-direction: column;
  font-weight: 600;
  font-size: 14px;
}

input,
textarea,
select {
  margin-top: 6px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
}

textarea {
  resize: vertical;
  min-height: 60px;
}

.form-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
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
