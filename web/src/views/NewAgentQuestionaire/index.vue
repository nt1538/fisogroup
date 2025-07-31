<template>
  <div class="dashboard">
    <Sidebar />
    <div class="form-page">
      <h1 class="text-2xl font-bold mb-6">FISO Agent Information Form</h1>

      <form @submit.prevent="submitForm" class="form-grid">
        <div class="form-section">
          <h2>General Info</h2>
          <label>
            Full Legal Name:
            <input v-model="form.fullName" type="text" required />
          </label>
          <label>
            SSN:
            <input v-model="form.ssn" type="text" required />
          </label>
          <label>
            Date of Birth:
            <input v-model="form.dob" type="date" required />
          </label>
          <label>
            Phone Number:
            <input v-model="form.phone" type="tel" required />
          </label>
          <label>
            Email Address:
            <input v-model="form.email" type="email" required />
          </label>
        </div>

        <div class="form-section">
          <h2>Address</h2>
          <label>
            Residential Address:
            <input v-model="form.address" type="text" required />
          </label>
          <label>
            City:
            <input v-model="form.city" type="text" required />
          </label>
          <label>
            State:
            <input v-model="form.state" type="text" required />
          </label>
          <label>
            ZIP Code:
            <input v-model="form.zip" type="text" required />
          </label>
        </div>

        <div class="form-section">
          <h2>Contract Type</h2>
          <label>
            Contract As:
            <select v-model="form.contractType" required>
              <option value="individual">Individual</option>
              <option value="solicitor">Solicitor/LOA</option>
              <option value="business">Business Entity</option>
            </select>
          </label>

          <div v-if="form.contractType === 'solicitor'">
            <label>
              Upline Name:
              <input v-model="form.uplineName" type="text" required />
            </label>
            <label>
              Upline NPN:
              <input v-model="form.uplineNPN" type="text" required />
            </label>
          </div>

          <div v-if="form.contractType === 'business'">
            <label>
              Business Name:
              <input v-model="form.businessName" type="text" required />
            </label>
            <label>
              EIN:
              <input v-model="form.ein" type="text" required />
            </label>
          </div>
        </div>

        <div class="form-section">
          <h2>Licensing</h2>
          <label>
            Resident State License:
            <input v-model="form.residentLicense" type="text" required />
          </label>
          <label>
            NPN:
            <input v-model="form.npn" type="text" required />
          </label>
        </div>

        <div class="form-section">
          <h2>EO Coverage</h2>
          <label>
            Do you have E&O Insurance?
            <select v-model="form.eoCoverage" required>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
        </div>

        <div class="form-section">
          <button type="submit" class="submit-btn">Submit</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Sidebar from '@/components/Sidebar.vue';

const form = ref({
  fullName: '',
  ssn: '',
  dob: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  contractType: 'individual',
  uplineName: '',
  uplineNPN: '',
  businessName: '',
  ein: '',
  residentLicense: '',
  npn: '',
  eoCoverage: 'yes'
});

const submitForm = async () => {
  try {
    console.log('Submitting:', form.value);
    // send to backend later
  } catch (err) {
    console.error('Submit error:', err);
  }
};
</script>

<style scoped>
.dashboard {
  display: flex;
}
.form-page {
  flex: 1;
  padding: 40px;
  background-color: #f9f9f9;
  margin-left: 280px;
  min-height: 100vh;
}
.form-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.form-section {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}
.form-section h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}
label {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 500;
}
input, select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
}
.submit-btn {
  background: #0055a4;
  color: white;
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
}
.submit-btn:hover {
  background: #003f82;
}
</style>
