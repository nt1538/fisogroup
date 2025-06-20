<template>
  <header class="fs-header">
    <div class="fs-header__logo" :class="stateLang"></div>
    <div class="fs-header__content">
      <!-- 移动端导航 -->
      <div class="fs-header__nav" v-if="isMClient && !isInEmployeePage">
        <div @click="onNav">
          <svg class="icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="30" height="30">
            <path
              d="M170.666667 298.666667h682.666666v42.666666H170.666667V298.666667z m0 426.666666h682.666666v42.666667H170.666667v-42.666667z m0-213.333333h682.666666v42.666667H170.666667v-42.666667z"
              fill="#444444"
            />
          </svg>
        </div>
        <div class="wrapper" v-if="!isShowAnimate" @click="onNav">
          <div class="circle"></div>
          <div class="finger"></div>
        </div>
        <el-drawer
          custom-class="navcon"
          v-model="navShow"
          :with-header="false"
          direction="ttb"
          :before-close="onNavClose"
        >
          <ul class="m_nav">
            <router-link v-for="(item, i) in render.nav" :key="i" :to="item.path">
              <li @click="onNavClose">{{ item.title }}</li>
            </router-link>
          </ul>
        </el-drawer>
      </div>

      <!-- 桌面端导航 -->
      <ul v-else-if="!isMClient && !isInEmployeePage" class="fs-header__nav">
        <router-link v-for="(item, i) in render.nav" :key="i" :to="item.path">
          <li>{{ item.title }}</li>
        </router-link>
      </ul>

      <!-- 语言切换 -->
      <el-dropdown @command="onCommand" v-if="!isInEmployeePage">
        <div class="fs-header__language" @click="onNavClose">
          <div class="icon"></div>
          <div class="arrow"></div>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="zh">中文</el-dropdown-item>
            <el-dropdown-item command="en">English</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { useStore } from 'vuex'
import { useRoute } from 'vue-router'

const store = useStore()
const route = useRoute()

const isMClient = computed(() => store.state.common.isM)
const isShowAnimate = computed(() => store.state.common.showAnimate)
const stateLang = computed(() => store.state.common.lang)

// ✅ 判断当前路径是否是 /employee 开头
const isInEmployeePage = computed(() => route.path.startsWith('/employee'))

const navShow = ref(false)
const onNav = () => {
  navShow.value = !navShow.value
  store.commit('updateShowAnimate', true)
}
const onNavClose = () => {
  navShow.value = false
}
const onCommand = (command) => {
  store.commit('updateLang', command)
}

const content = {
  en: {
    nav: [
      { title: 'Home', path: '/' },
      { title: 'Solutions', path: '/service' },
      { title: 'Oppotunities', path: '/interact' },
      { title: 'Founder', path: '/founder' },
      { title: 'Contact', path: '/contact' },
      { title: 'Agency Login', path: '/login' }
    ]
  },
  zh: {
    nav: [
      { title: '关于方胜', path: '/' },
      { title: '服务项目', path: '/service' },
      { title: '机遇与合作', path: '/interact' },
      { title: '创始人', path: '/founder' },
      { title: '联系与咨询', path: '/contact' },
      { title: '代理登录', path: '/login' }
    ]
  }
}

const render = ref({ nav: [] })
watch(
  stateLang,
  (newVal) => {
    render.value = content[newVal]
  },
  { immediate: true }
)
</script>

<style lang="scss">
  @include b(header) {
    max-width: 1440px;
    min-width: 1200px;
    width: 100%;
    height: 100px;
    margin: auto;
    background: #fff;
    padding: 0 100px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 0 1 auto;

    @include e(logo) {
      flex: 0 0 auto;
      width: 150px;
      height: 50px;
      background: url('@/assets/img/logo.png') no-repeat center;
      background-size: contain;
      &.en {
        background: url('@/assets/img/logo-en.png') no-repeat center;
        background-size: contain;
      }
    }

    @include e(content) {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      flex: 0 1 auto;
    }

    @include e(nav) {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      flex: 0 1 auto;

      a {
        // display: block;
        color: #000;
        margin: 0 25px;

        &.router-link-exact-active {
          li {
            color: #001290;

            &::after {
              content: '';
              position: absolute;
              bottom: -6px;
              left: 0;
              width: 100%;
              height: 2px;
              background: #001290;
            }
          }
        }
      }

      li {
        font-size: 16px;
        position: relative;
        cursor: pointer;
      }
    }

    @include e(language) {
      cursor: pointer;
      width: 50px;
      height: 24px;
      margin-left: 25px;
      background: #001290;
      padding: 8px 0 0 18px;
      display: flex;
      justify-content: flex-start;

      .icon {
        width: 16px;
        height: 18px;
        margin-right: 3px;
        background: url('@/assets/img/language.png') no-repeat center;
        background-size: contain;
      }

      .arrow {
        width: 18px;
        height: 18px;
        background: url('@/assets/img/arrow.png') no-repeat center;
        background-size: contain;
      }
    }
  }

  .m {
    .fs-header {
      position: relative;
      max-width: 100%;
      min-width: 100%;
      width: 100%;
      height: 45px;
      padding: 0 10px;
      z-index: 999999;
      .fs-header__logo {
        width: 80px;
      }

      .fs-header__nav {
        position: relative;
        .navcon {
          width: 100% !important;
          height: 41vh !important;
          // background: rgba(255, 255, 255, 0.5);
        }
        .m_nav {
          box-sizing: border-box;
          padding: 10px 20px;
          li {
            padding: 10px 0;
          }
          // display: none;
        }
      }
    }
    .el-overlay {
      top: 45px;
    }

    .wrapper {
      position: absolute;
      top: 0px;
      left: -5px;
      width: 60px;
      height: 60px;
      z-index: 1;
    }

    .circle {
      width: 30px;
      height: 30px;
      background: url('@/assets/img/ss.png') no-repeat center;
      background-size: contain;
      position: absolute;
      top: 0px;
      left: 7px;
      opacity: 0.5;
      animation: circleHide 1s ease infinite both;
    }

    .finger {
      background: url('@/assets/img/xs.png') center no-repeat;
      background-size: contain;
      width: 60px;
      height: 60px;
      position: absolute;
      top: 10px;
      left: 3px;
      opacity: 0.5;
      animation: fingerHandle 1s ease infinite both;
    }

    @keyframes fingerHandle {
      0% {
        transform: none;
      }

      70% {
        transform: scale3d(0.8, 0.8, 0.8);
      }

      100% {
        transform: none;
      }
    }

    @keyframes circleHide {
      0% {
        transform: scale3d(1, 1, 1);
      }

      70% {
        transform: scale3d(1.2, 1.2, 1.2);
      }

      100% {
        transform: scale3d(1, 1, 1);
      }
    }
  }
</style>
