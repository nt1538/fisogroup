<template>
  <section class="fs-login">
    <div class="fs-login__content">
      <div class="txt">
        <h4 class="txt-title">Create Your Account</h4>
      </div>
      <div class="info clearfix">
        <el-form @submit.prevent="register">
          <el-form-item class="no-border">
            <el-input v-model="name" placeholder="Full Name" />
          </el-form-item>

          <el-form-item class="no-border">
            <el-input v-model="email" placeholder="Email" />
          </el-form-item>

          <el-form-item class="no-border">
            <el-input v-model="password" type="password" placeholder="Password" />
          </el-form-item>

          <el-form-item class="no-border">
            <el-input v-model="state" placeholder="State (e.g., NY, CA)" />
          </el-form-item>

          <el-form-item class="no-border">
            <el-input v-model.number="level_percent" placeholder="Commission Level %" />
          </el-form-item>

          <el-form-item class="no-border">
            <el-input v-model.number="introducer_id" placeholder="Introducer ID (optional)" />
          </el-form-item>

          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
          <el-button type="primary" @click="register">Register</el-button>
        </el-form>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/config/axios.config';

const router = useRouter();
const name = ref('');
const email = ref('');
const password = ref('');
const state = ref('');
const introducer_id = ref('');
const level_percent = ref(70);
const errorMessage = ref('');

const toSha256 = async (text) => {
  const buffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const register = async () => {
  if (!name.value || !email.value || !password.value || !state.value) {
    errorMessage.value = '⚠️ All required fields must be filled.';
    return;
  }

  const hashedPassword = await toSha256(password.value);

  try {
    await axios.post('/register', {
      name: name.value,
      email: email.value,
      password: hashedPassword,
      state: state.value.toUpperCase(),
      introducer_id: introducer_id.value || null,
      level_percent: level_percent.value || 70
    });

    router.push('/login');
  } catch (error) {
    errorMessage.value = error.response?.data?.error || 'Registration failed';
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
}
.error-message {
  background: rgba(255, 0, 0, 0.1);
  color: #d8000c;
  border: 1px solid #d8000c;
  padding: 8px;
  border-radius: 5px;
  font-size: 14px;
  margin-bottom: 10px;
  text-align: center;
}
</style>