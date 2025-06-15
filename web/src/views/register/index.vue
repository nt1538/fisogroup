<template>
  <section class="fs-login">
    <div class="fs-login__content">
      <div class="txt">
        <h4 class="txt-title">Create Account</h4>
      </div>
      <div class="info clearfix">
        <el-form label-position="left" @submit.prevent="register">
          <el-form-item class="no-border">
            <el-input v-model="name" placeholder="Enter your name">
              <template #prefix><div class="icon">👤</div></template>
            </el-input>
          </el-form-item>

          <el-form-item class="no-border">
            <el-input v-model="email" placeholder="Enter your email">
              <template #prefix><div class="icon">📧</div></template>
            </el-input>
          </el-form-item>

          <el-form-item class="no-border">
            <el-input v-model="password" type="password" placeholder="Create a password">
              <template #prefix><div class="icon">🔒</div></template>
            </el-input>
          </el-form-item>

          <el-form-item class="no-border">
            <el-input v-model="introducer_id" placeholder="Introducer ID (optional)">
              <template #prefix><div class="icon">🧬</div></template>
            </el-input>
          </el-form-item>

          <el-form-item class="no-border">
            <el-input v-model="access_code" placeholder="Access Code">
              <template #prefix><div class="icon">🆔</div></template>
            </el-input>
          </el-form-item>

          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
          <el-button color="#626aef" type="primary" @click="register">Register</el-button>
        </el-form>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/config/axios.config';

const router = useRouter();
const name = ref('');
const email = ref('');
const password = ref('');
const introducer_id = ref('');
const access_code = ref('');
const errorMessage = ref('');

onMounted(() => {
  document.title = "Register - Agent Portal";
});

const register = async () => {
  if (!name.value || !email.value || !password.value || !access_code.value) {
    errorMessage.value = "⚠️ Please fill in all required fields.";
    return;
  }

  try {
    await axios.post('/auth/register', {
      name: name.value,
      email: email.value,
      password: password.value,
      introducer_id: introducer_id.value || null,
      access_code: access_code.value,
    });

    router.push('/login');
  } catch (error) {
    errorMessage.value = error.response?.data?.error || '❌ Registration failed.';
    console.error("Register error:", error);
  }
};
</script>

<style scoped lang="scss">
.fs-login {
  background: #fff;
  display: flex;
  justify-content: center;
  padding: 100px 0;
}
.fs-login__content {
  width: 400px;
  background: #f9f9f9;
  padding: 30px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
}
.txt-title {
  font-size: 24px;
  margin-bottom: 20px;
}
.no-border {
  margin-bottom: 20px;
}
.el-button {
  width: 100%;
  font-size: 16px;
  background-color: #626aef;
  color: white;
}
.el-button:hover {
  background-color: #5058c9;
}
.icon {
  padding-right: 10px;
}
.error-message {
  background: rgba(255, 0, 0, 0.1);
  padding: 5px 10px;
  margin: 10px 0;
  color: red;
  border-radius: 4px;
}
</style>
