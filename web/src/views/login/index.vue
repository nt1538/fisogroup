<template>
  <section class="fs-login">
    <div class="fs-login__content">
      <div class="txt">
        <h4 class="txt-title">{{ render.title }}</h4>
      </div>
      <div class="info clearfix">
        <el-form label-position="left" @submit.prevent="login">
          <el-form-item class="no-border">
            <el-input v-model="email" maxlength="50" placeholder="Enter your email">
              <template #prefix>
                <div class="icon">📧</div>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item class="no-border">
            <el-input v-model="password" type="password" maxlength="50" placeholder="Enter your password">
              <template #prefix>
                <div class="icon">🔒</div>
              </template>
            </el-input>
          </el-form-item>

          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

          <div class="button-group">
            <el-button color="#626aef" type="primary" @click="login">Login</el-button>
            <el-button color="#626aef" type="primary" @click="goToRegister">Create an account</el-button>
          </div>
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

const toSha256 = async (text) => {
  const buffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const goToRegister = () => {
  router.push('/register');
};

const login = async () => {
  if (!email.value || !password.value) {
    errorMessage.value = "⚠️ Please enter your email and password.";
    return;
  }

  errorMessage.value = "";

  try {
    const hashedPassword = await toSha256(password.value);

    const response = await axios.post('/login', {
      email: email.value,
      password: hashedPassword, // Send hashed version
    });

    if (response.data?.token && response.data?.user) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      router.push(response.data.user.is_admin ? '/employee/adminDashboard' : '/employee/dashboard');
    } else {
      errorMessage.value = "⚠️ Login failed: Invalid server response.";
    }
  } catch (error) {
    if (error.response?.status === 401) {
      errorMessage.value = "❌ Invalid email or password. Please try again.";
    } else {
      errorMessage.value = "❌ Server error. Please try again later.";
      console.error("Login error:", error);
    }
  }
};
</script>

.fs-login {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 80px); // 去掉 Header 高度
  background: #f2f2f2;
}

.fs-login__content {
  width: 400px;
  background: #fff;
  padding: 30px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.08);
}

.txt-title {
  font-size: 24px;
  margin-bottom: 20px;
}

.no-border {
  margin-bottom: 20px;
}

.button-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 20px;

  .el-button {
    width: 200px;
    font-size: 16px;
    background-color: #626aef;
    color: white;

    &:hover {
      background-color: #5058c9;
    }
  }
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
