<template>
  <div class="dashboard">
    <Sidebar />
    <div class="form-container">
      <h1>Legal Questions for Contracting and Appointment Requests</h1>
      <p>
        Please answer the following questions. If you answer <strong>YES</strong> to any question, be sure to provide a
        full, detailed Letter of Explanation including specific dates.
      </p>

      <form @submit.prevent="submitForm" class="form-grid">
        <div
          v-for="(question, index) in questions"
          :key="index"
          class="question-block"
        >
          <label class="question-label">
            {{ index + 1 }}. {{ question.text }}
          </label>

          <div class="radio-group">
            <label>
              <input
                type="radio"
                :name="'q' + index"
                value="Yes"
                v-model="answers[index]"
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                :name="'q' + index"
                value="No"
                v-model="answers[index]"
              />
              No
            </label>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit">Submit</button>
          <button type="button" @click="skipToNextPage" style="margin-left: 10px;">Skip Validation</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const questions = ref([
  { text: 'Have you ever been charged or convicted of or plead guilty or no contest to any Felony, Misdemeanor, federal/state insurance and/or securities or investments regulations and statutes? Have you ever been on probation?' },
  { text: 'Have you ever been or are you currently being investigated, have any pending indictments, lawsuits, or have you ever been in lawsuit with insurance company?' },
  { text: 'Have you ever been alleged to have engaged in any fraud?' },
  { text: 'Have you ever been found to have engaged in any fraud?' },
  { text: 'Has any insurance or financial services company, or broker-dealer terminated your contract or appointment or permitted you to resign for reason other than lack of sales?' },
  { text: 'Have you ever had an appointment with any insurance company terminated for cause or been denied an appointment?' },
  { text: 'Does any insurer, insured, or other person claim any commission chargeback or other indebtedness from you as a result of any insurance transactions or business?' },
  { text: 'Has any lawsuit or claim ever been made against your surety company, or errors and omissions insurer, arising out of your sales or practices, or, have you been refused surety bonding or E&O coverage?' },
  { text: 'Have you ever had an insurance or securities license denied, suspended, cancelled or revoked?' },
  { text: 'Has any state or federal regulatory body found you to have been a cause of an investment OR insurance-related business having its authorization to do business denied, suspended, revoked, or restricted?' },
  { text: 'Has any state or federal regulatory agency revoked or suspended your license as an attorney, accountant, or federal contractor?' },
  { text: 'Has any state or federal regulatory agency found you to have made a false statement or omission or been dishonest, unfair, or unethical?' },
  { text: 'Have you ever had any interruptions in licensing?' },
  { text: 'Has any state, federal or self-regulatory agency filed a complaint against you, fined, sanctioned, censured, penalized or otherwise disciplined you for a violation of their regulations or state or federal statutes? Have you ever been the subject of a consumer initiated complaint?' },
  { text: 'Have you personally or any insurance or securities brokerage firm with whom you have been associated filed a bankruptcy petition or declared bankruptcy?' },
  { text: 'Have you ever had any judgments, garnishments, or liens against you?' },
  { text: 'Are you connected in any way with a bank, savings & loan association, or other lending or financial institution?' },
  { text: 'Have you ever used any other names or aliases?' },
  { text: 'Do you have any unresolved matters pending with the Internal Revenue Service or other taxing authority?' },
])

const answers = ref(Array(questions.value.length).fill(''))

function skipToNextPage() {
  // 保存表单空数据（或当前已有数据）
  localStorage.setItem('newAgentPage4', JSON.stringify(form.value))
  router.push('/employee/form5')
}

function submitForm() {
  localStorage.setItem('legalQuestions', JSON.stringify(answers.value))
  alert('Answers saved successfully.')
  // router.push('/employee/form6')
}
</script>

<style scoped>
.dashboard {
  display: flex;
  height: 100vh; /* ✅ 固定整页高度 */
}
.form-container {
  flex-grow: 1;
  padding: 40px;
  background-color: #f4f4f4;
  min-height: 100vh;
  margin-left: 280px;
  overflow-y: auto;
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
}

.question-label {
  font-weight: 600;
  font-size: 15px;
}

.radio-group {
  display: flex;
  gap: 20px;
  font-size: 14px;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 6px;
}

input[type='radio'] {
  accent-color: #0055a4;
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
