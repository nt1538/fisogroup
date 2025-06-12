\<template>
  <section class="fs-login">
    <div class="fs-login__content">
      <div class="txt">
        <h4 class="txt-title">{{ render.title }}</h4>
      </div>
      <div class="info clearfix">
        <el-form label-position="left" @submit.prevent="login">
          <!-- Email Input -->
          <el-form-item class="no-border">
            <el-input v-model="email" maxlength="50" placeholder="Enter your email">
              <template #prefix>
                <div class="icon">📧</div>
              </template>
            </el-input>
          </el-form-item>

          <!-- Password Input -->
          <el-form-item class="no-border">
            <el-input v-model="password" type="password" maxlength="50" placeholder="Enter your password">
              <template #prefix>
                <div class="icon">🔒</div>
              </template>
            </el-input>
          </el-form-item>

          <!-- Styled Error Message -->
          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

          <!-- Login Button -->
          <el-button color="#626aef" type="primary" @click="login">Login</el-button>
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
const email = ref('');
const password = ref('');
const errorMessage = ref('');

const render = ref({ title: 'Agent Login' });

onMounted(() => {
  document.title = "Login - Agent Portal";
});

// Login function
const login = async () => {
  if (!email.value || !password.value) {
    errorMessage.value = "⚠️ Please enter your email and password.";
    return;
  }

  try {
    const response = await axios.post('/login', {
      email: email.value,
      password: password.value,
    });

    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));

    if (response.data.user.is_admin) {
      router.push('/adminDashboard');  // ✅ Redirects admin to Admin Dashboard
    } else {
      router.push('/dashboard');  // ✅ Redirects employees to Employee Dashboard
    }
  } catch (error) {
    errorMessage.value = "❌ Invalid email or password. Please try again.";
  }
};
</script>

<style lang="scss" scoped>
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
  color: #d8000c;
  border: 1px solid #d8000c;
  padding: 8px;
  border-radius: 5px;
  font-size: 14px;
  margin-bottom: 10px;
  text-align: center;
}
</style>

