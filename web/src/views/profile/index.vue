<template>
  <div class="dashboard">
    <Sidebar />

    <div class="profile-page">
      <h1 class="title">My Profile</h1>

      <div class="profile-container">
        <!-- Personal Info -->
        <div class="profile-section">
          <h2>Personal Information</h2>
          <div class="info-grid">
            <div><strong>Name:</strong> {{ user.name }}</div>
            <div><strong>Email:</strong> {{ user.email }}</div>
            <div><strong>User ID:</strong> {{ user.id }}</div>
            <div><strong>Introducer ID:</strong> {{ user.introducer_id || "N/A" }}</div>
            <div><strong>Total Earnings:</strong> ${{ user.total_earnings || 0 }}</div>
            <div><strong>Team Production:</strong> ${{ user.team_profit || 0 }}</div>
          </div>

          <!-- ✅ Change Password Button -->
          <button class="change-password-btn" @click="showChangePassword = true">
            Change Password
          </button>
        </div>

        <!-- Earnings Overview -->
        <div class="earnings-section">
          <h2>Earnings Overview</h2>
          <p><strong>Year-To-Date (YTD) Earnings:</strong> ${{ ytdEarnings }}</p>
          <p><strong>Rolling 12-Month Earnings:</strong> ${{ rollingEarnings }}</p>
        </div>

        <!-- Term Earnings -->
        <div class="term-earnings">
          <h3>Term Earnings (Last 4 Terms)</h3>
          <table>
            <thead>
              <tr>
                <th>Period Start</th>
                <th>Period End</th>
                <th>Earnings</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="term in termEarnings" :key="term.period_start">
                <td>{{ formatDate(term.period_start) }}</td>
                <td>{{ formatDate(term.period_end) }}</td>
                <td>${{ term.total }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ✅ Change Password Modal -->
      <div v-if="showChangePassword" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <h2>Change Password</h2>
          <label>Current Password</label>
          <input type="password" v-model="currentPassword" placeholder="Enter current password" />
          <label>New Password</label>
          <input type="password" v-model="newPassword" placeholder="Enter new password" />
          <label>Confirm New Password</label>
          <input type="password" v-model="confirmPassword" placeholder="Confirm new password" />

          <div class="modal-actions">
            <button @click="updatePassword" class="save-btn">Save</button>
            <button @click="closeModal" class="cancel-btn">Cancel</button>
          </div>
          <p v-if="message" class="status">{{ message }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "@/config/axios.config";
import Sidebar from "@/components/Sidebar.vue";

const user = ref({});
const ytdEarnings = ref(0);
const termEarnings = ref([]);
const rollingEarnings = ref(0);

const showChangePassword = ref(false);
const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const message = ref("");

const fetchUserData = async () => {
  try {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");
    if (!storedUser || !storedUser.id || !token) {
      console.error("Missing user or token in localStorage.");
      return;
    }

    const userId = storedUser.id;
    const { data } = await axios.get(`/users/me/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    user.value = data.user;
    ytdEarnings.value = data.ytdEarnings;
    rollingEarnings.value = data.rollingEarnings;
    termEarnings.value = data.termEarnings;
  } catch (error) {
    console.error("Error fetching user data:", error);
  }
};

const updatePassword = async () => {
  if (newPassword.value !== confirmPassword.value) {
    message.value = "New passwords do not match.";
    return;
  }

  try {
    const token = localStorage.getItem("token");
    await axios.post(
      "/users/change-password",
      {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    message.value = "✅ Password changed successfully!";
    setTimeout(closeModal, 1500);
  } catch (error) {
    console.error("Error changing password:", error);
    message.value = "❌ Failed to change password.";
  }
};

const closeModal = () => {
  showChangePassword.value = false;
  currentPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
  message.value = "";
};

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

onMounted(fetchUserData);
</script>

<style scoped>
.dashboard {
  display: flex;
  overflow-y: scroll;
}

.profile-page {
  flex-grow: 1;
  padding: 40px;
  margin-left: 280px;
  background: #f4f4f4;
  min-height: 100vh;
}

.title {
  font-size: 28px;
  font-weight: bold;
  color: #003366;
  margin-bottom: 20px;
}

.profile-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.profile-section,
.earnings-section,
.term-earnings {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
}

.change-password-btn {
  margin-top: 20px;
  background-color: #003366;
  color: white;
  padding: 10px 18px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.3s ease;
}

.change-password-btn:hover {
  background-color: #0055aa;
}

/* ✅ Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 30px;
  border-radius: 8px;
  width: 400px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.modal h2 {
  margin-bottom: 15px;
  color: #003366;
}

.modal input {
  width: 100%;
  padding: 10px;
  margin-bottom: 12px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.modal-actions {
  display: flex;
  justify-content: space-between;
}

.save-btn {
  background-color: #003366;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.cancel-btn {
  background-color: #888;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.status {
  margin-top: 10px;
  text-align: center;
  font-weight: bold;
}

@media (max-width: 768px) {
  .dashboard {
    flex-direction: column;
  }

  .profile-page {
    margin-left: 0;
    padding: 20px;
  }

  .title {
    font-size: 22px;
    text-align: center;
  }

  .modal {
    width: 90%;
  }
}
</style>
