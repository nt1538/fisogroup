<template>
  <div class="dashboard">
    <Sidebar />
    <div class="form-container">
      <h1>Business Entity Information (DBA)</h1>
      <p>
        Complete the following only if you are Doing Business As (DBA) a Business Entity. Please
        ensure all required documents are uploaded and accurate.
      </p>

      <form @submit.prevent="submitForm" class="form-grid">
        <label>
          EIN
          <input type="text" v-model="form.ein" placeholder="XX-XXXXXXX" required />
        </label>

        <label>
          Business Name
          <input type="text" v-model="form.businessName" required />
        </label>

        <label>
          Website
          <input type="url" v-model="form.website" placeholder="https://example.com" />
        </label>

        <label>
          Your Title
          <input type="text" v-model="form.title" required />
        </label>

        <label>
          Phone
          <input type="tel" v-model="form.phone" placeholder="123-456-7890" required />
        </label>

        <label>
          Principal Name
          <input type="text" v-model="form.principalName" required />
        </label>

        <label>
          Principal Title
          <input type="text" v-model="form.principalTitle" />
        </label>

        <label>
          Principal Email
          <input type="email" v-model="form.principalEmail" required />
        </label>

        <label>
          Company Type
          <select v-model="form.companyType" required>
            <option disabled value="">Select</option>
            <option>Corporation</option>
            <option>Partnership</option>
            <option>LLC</option>
            <option>LLP</option>
          </select>
        </label>

        <label>
          Company Address (No PO Boxes)
          <textarea v-model="form.companyAddress" required></textarea>
        </label>

        <label>
          Start Date
          <input type="date" v-model="form.startDate" required />
        </label>

        <label>
          City
          <input type="text" v-model="form.city" required />
        </label>

        <label>
          State
          <input type="text" v-model="form.state" required />
        </label>

        <label>
          Zip Code
          <input type="text" v-model="form.zip" required />
        </label>

        <div class="form-actions">
          <button type="submit">Next Page</button>
        </div>
      </form>

      <div class="attachment-info">
        <p><strong>Please attach the following documents along with this form and send them to contracting@fisogroup.com:</strong></p>
        <ul>
          <li>1. Individual or Corporate Insurance License</li>
          <li>2. E&O (Errors and Omissions Insurance)</li>
          <li>3. Voided Check</li>
          <li>4. AML Certificate (if not with LIMRA)</li>
          <li>5. Insurance company you wish to contract with</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

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
  zip: ''
})

// 可以在 onMounted 中回显前一页数据
onMounted(() => {
  const saved = localStorage.getItem('newAgentPage2')
  if (saved) {
    form.value = JSON.parse(saved)
  }
})

function submitForm() {
  // 存储第二页数据
  localStorage.setItem('newAgentPage2', JSON.stringify(form.value))

  // 跳转下一页
  router.push('/employee/form3') // 可以预设第三页或提交完成页
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

.attachment-info {
  margin-top: 40px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  max-width: 800px;
}

.attachment-info ul {
  margin-top: 12px;
  padding-left: 18px;
  color: #444;
}
</style>
