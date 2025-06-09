<template>
  <div>
    <!-- Mobile toggle button -->
    <button class="toggle-btn" @click="toggleSidebar">
      ☰
    </button>

    <!-- Sidebar -->
    <nav :class="['sidebar', { open: sidebarOpen }]">
      <h2 class="title">Dashboard</h2>
      <ul class="menu">
        <li @click="toggleSection('me')" :class="{ active: activeSection === 'me' }">
          👤 Me <span class="arrow">▼</span>
        </li>
        <transition name="fade">
          <ul v-if="activeSection === 'me'" class="submenu">
            <li @click="navigate('/me/profile')">Profile</li>
            <li @click="navigate('/me/Application')">Application Uploads</li>
            <li @click="navigate('/me/document')">My Fiso Document</li>
            <li class="logout" @click="logout">🚪 Logout</li>
          </ul>
        </transition>

        <li @click="toggleSection('reports')" :class="{ active: activeSection === 'reports' }">
          📊 Reports <span class="arrow">▼</span>
        </li>
        <transition name="fade">
          <ul v-if="activeSection === 'reports'" class="submenu">
            <li @click="navigate('/reports/org-chart')">Organization Chart</li>
            <li @click="navigate('/reports/app-reports')">Application Reports</li>
            <li @click="navigate('/reports/production')">Production Report</li>
            <li @click="navigate('/reports/commission')">Commission Statement</li>
          </ul>
        </transition>

        <li @click="navigate('/licensing')">📁 Licensing</li>
      </ul>
    </nav>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const activeSection = ref('');
const sidebarOpen = ref(true); // default visible on desktop

const toggleSection = (section) => {
  activeSection.value = activeSection.value === section ? '' : section;
};

const navigate = (path) => {
  activeSection.value = path.split('/')[1];
  router.push(path);
  // Auto-close sidebar on mobile after navigation
  if (window.innerWidth < 768) sidebarOpen.value = false;
};

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

const logout = () => {
  localStorage.removeItem('token');
  router.push('/login');
};
</script>

<style scoped>
.sidebar {
  width: 260px;
  height: 100vh;
  background: #01294e;
  color: white;
  padding: 20px;
  position: fixed;
  top: 0;
  left: 0;
  font-size: 16px;
  font-weight: bold;
  overflow-y: auto;
  z-index: 1000;
  transition: transform 0.3s ease;
}

.title {
  font-size: 22px;
  text-align: center;
  margin-bottom: 30px;
}

.menu {
  list-style: none;
  padding: 0;
}

.menu > li {
  padding: 12px 15px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 6px;
  transition: background 0.3s;
}

.menu > li:hover,
.menu > li.active {
  background-color: #0055a4;
}

.submenu {
  list-style: none;
  padding-left: 20px;
  margin-top: 5px;
  margin-bottom: 15px;
}

.submenu li {
  padding: 10px;
  font-size: 14px;
  border-radius: 4px;
  transition: background 0.3s;
}

.submenu li:hover {
  background-color: #003366;
}

.logout {
  color: #ff4d4f;
}

.arrow {
  font-size: 12px;
}

/* Toggle button for mobile */
.toggle-btn {
  display: none;
  position: fixed;
  top: 15px;
  left: 15px;
  background-color: #01294e;
  color: white;
  font-size: 20px;
  padding: 8px 12px;
  z-index: 1100;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .toggle-btn {
    display: block;
  }
}

/* Smooth slide-in */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
