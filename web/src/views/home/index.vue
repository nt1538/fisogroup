<template>
  <section class="fs-home">
    <div class="content">
      <h3 class="fs-home__title animate__bounceIn">{{ render.title }}</h3>
      <div class="fs-home__txt">
        <p class="animate__fadeInLeft">{{ render.desc1 }}</p>
        <p class="home-blur">{{ render.desc2 }}</p>
        <p class="home-blur" v-html="render.desc3"></p>
      </div>
    </div>
    <fsFooter></fsFooter>
  </section>
</template>

<script setup lang="ts">
  import { computed, watch, ref } from 'vue'
  import { useStore } from 'vuex'
  const content = {
    en: {
      title: 'FISO WEALTH MANAGEMENT',
      desc1: 'FIT IN STAND OUT',
      desc2: '',
      desc3: `FISO WEALTH is an international financial marketing company. We have years of experience providing one-stop financial services that focuses on your needs, wants and long-term goals. Once you become our client, you will always have our attention because we are committed to serve for your financial needs for life.`
    },
    zh: {
      title: '方胜财富管理',
      desc1: '融入胜出',
      desc2: '财富四方，人才四方',
      desc3: `方胜财富致力于传播财商教育、爱和正能量，打造一站式的金融服务平台，帮助更多的家庭获得更好的保障和财富自由，帮助更多的人找到一个提升自我、实现梦想的平台。<br /><br />量身定制私人理财计划，使财富管理成为人生最轻松的体验!<br /><br />简单易复制的金融加盟系统，帮您成就辉煌事业！`
    }
  }

  const store = useStore()
  // 渲染数据
  const render = ref({ title: '', desc1: '', desc2: '', desc3: '' })
  const stateLang = computed(() => store.state.common.lang)
  watch(
    stateLang,
    (newVal) => {
      render.value = content[newVal]
    },
    { immediate: true, deep: true }
  )

  import { useRouter } from 'vue-router';

  const router = useRouter();

  const goToLogin = () => {
  router.push('/login'); // Redirect to login page
};
</script>

<style lang="scss">
.home {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh; /* Make it take full viewport height */
  text-align: center;
}

  @include b(home) {
    .content {
      background: linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), url('@/assets/img/home/bg.jpg') no-repeat top;
      background-size: cover;
      height: 700px;
    }

    @include e(title) {
      padding-top: 80px;
      font-weight: 500;
      font-size: 40px;
      line-height: 60px;
      text-align: center;
      color: #001290;
    }

    @include e(txt) {
      text-align: center;
      position: relative;
      // z-index: 1;
      // &::before {
      //   content: '';
      //   position: absolute;
      //   top: 0;
      //   left: 0;
      //   right: 0;
      //   bottom: 0;
      //   filter: blur(1px);
      //   background: rgba(255, 255, 255, 0.6);
      //   z-index: -1;
      // }
      p {
        padding-top: 35px;
        color: #000000;
        font-weight: 350;
        font-size: 18px;
        line-height: 27px;
        color: #000000;

        &:nth-child(1),
        &:nth-child(2) {
          padding-top: 15px;
          font-size: 29px;
          font-weight: 500;
        }
        &:last-child {
          width: 970px;
          margin: auto;
          // text-align:left;
          // padding: 20px 10px 10px;
        }
      }
    }
  }
  .m {
    .fs-home {
      .content {
        height: 500px;
      }

      .fs-home__title {
        padding-top: 30px;
        font-size: 24px;
        line-height: 38px;
      }

      .fs-home__txt {
        p {
          padding-top: 20px;
          font-size: 14px;
          line-height: 20px;
          color: #000000;

          &:nth-child(1),
          &:nth-child(2) {
            padding-top: 10px;
            font-size: 18px;
          }
          &:last-child {
            width: 100%;
            box-sizing: border-box;
            text-align: left;
            padding: 20px 15px 10px;
          }
        }
      }
    }
  }
</style>
