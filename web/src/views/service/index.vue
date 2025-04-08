<template>
  <section class="fs-sercice">
    <div class="fs-sercice__content">
      <div class="fs-sercice__txt">
        <h2 class="title">{{ render.title }}</h2>
        <p class="desc" :class="lang">{{ render.desc }}</p>
        <ul v-if="isMClient">
          <li @click="onChangeCarousel(i)" class="item" v-for="(item, i) in render.list" :key="i" :class="{ active: i == carouselIdx }">· {{ item }}</li>
        </ul>
        <ul v-else>
          <li class="item" v-for="(item, i) in render.list" :key="i" :class="{ active: i == carouselIdx }">· {{ item }}</li>
        </ul>
      </div>
      <div class="fs-sercice__carousel">
        <el-carousel v-if="isMClient" height="200px" trigger="click" arrow="never" :autoplay="false" @change="onCarousel" ref="mClientCarusel">
          <el-carousel-item v-for="(item, i) in 7" :key="item">
            <div class="pic">
              <img :src="getImageUrl(i)" :alt="'轮播图' + i" />
            </div>
          </el-carousel-item>
        </el-carousel>
        <el-carousel v-else height="380px" trigger="click" indicator-position="outside" arrow="always" @change="onCarousel">
          <el-carousel-item v-for="(item, i) in 7" :key="item">
            <div class="pic">
              <img :src="getImageUrl(i)" :alt="'轮播图' + i" />
            </div>
          </el-carousel-item>
        </el-carousel>
      </div>
    </div>
    <fsFooter></fsFooter>
  </section>
</template>

<script setup lang="ts">
  import { computed, watch, ref } from 'vue'
  import { useStore } from 'vuex'

  const getImageUrl = (idx) => {
    return new URL(`../../assets/img/service/${idx}.jpg`, import.meta.url).href
  }
  const content = {
    en: {
      title: 'Solutions',
      desc: 'We have years of experience helping clients prepare for the unknowns while meeting your financial goals and making you financially successful.',
      list: ['Family Financial Planning', 'Risk Management and Protection', 'Education Planning', 'Retirement Planning', 'Estate Planning', 'Tax Planning', 'Oversea Asset Allocation']
    },
    zh: {
      title: '服务项目',
      desc: '我们拥有多年的经验，可以帮助客户为未知的风险做好准备，同时实现您的财务目标并使您在财务上取得成功。',
      list: ['家庭财务配置规划', '风险管理和保护', '教育规划', '退休计划', '遗产规划', '税务筹划', '海外资产配置']
    }
  }
  const carouselH = ref('380px')

  const store = useStore()
  const isMClient = computed(() => store.state.common.isM)
  watch(
    isMClient,
    (val) => {
      if (val) carouselH.value = '180px'
      // console.log(val, 22)
    },
    { immediate: true, deep: true }
  )
  const lang = ref('')
  // 渲染数据
  const render = ref({ title: '', desc: '', list: [] })
  const stateLang = computed(() => store.state.common.lang)
  watch(
    stateLang,
    (newVal) => {
      lang.value = newVal
      render.value = content[newVal]
    },
    { immediate: true, deep: true }
  )
  const carouselIdx = ref(0)
  const onCarousel = (idx) => {
    carouselIdx.value = idx
  }
  const mClientCarusel = ref('')
  const onChangeCarousel = (idx) => {
    // onCarousel(6)
    mClientCarusel.value?.setActiveItem(idx)
  }
</script>

<style lang="scss">
  .el-carousel__indicators--outside {
    text-align: left;
    .el-carousel__button {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 1px solid #333;
      overflow: hidden;
    }
    .is-active {
      .el-carousel__button {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        overflow: hidden;
        background: #333;
      }
    }
  }
  @include b(sercice) {
    background: #fff;
    @include e(content) {
      background: url('@/assets/img/service/bg.jpg') no-repeat top;
      background-size: cover;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      width: 100%;
      // height: 700px;
      padding: 160px 85px 130px;
      box-sizing: border-box;
      flex: 0 1 auto;
    }
    @include e(txt) {
      width: 486px;
      flex: 0 0 auto;
      .title {
        font-size: 36px;
        line-height: 54px;
        color: #000000;
      }
      .desc {
        padding: 15px 0 30px;
        font-size: 18px;
        color: #000000;
        width: 85%;
        &.en {
          line-height: 26px;
        }
        &.zh {
          line-height: 36px;
        }
      }

      .item {
        font-size: 16px;
        line-height: 27px;
        color: #000000;
        padding-bottom: 5px;
        &.active {
          font-size: 18px;
          font-weight: 500;
          color: #001290;
        }
      }
    }

    @include e(carousel) {
      width: 725px;
      height: 380px;
      flex: 0 0 auto;
      .pic {
        width: 100%;
        height: 380px;
        img {
          display: block;
          width: 100%;
          height: 100%;
        }
      }
    }
  }
  .m {
    .el-carousel__indicators {
      display: none;
    }
    .fs-sercice {
      .fs-sercice__content {
        display: block;
        padding: 20px 15px 0px;
        position: relative;
        .fs-sercice__txt {
          width: 100%;
          position: relative;
          z-index: 10;
          ul {
            display: inline-block;
            position: relative;
            padding: 0 5px;
            &::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              filter: blur(1px);
              background: rgba(255, 255, 255, 0.6);
              z-index: -1;
            }
          }
          .title {
            font-size: 24px;
            line-height: 1.5;
          }
          .desc {
            font-size: 16px;
            line-height: 1.5;
            width: 95%;
          }
          .item {
            font-size: 14px;
            line-height: 1.5;
          }
        }
        .fs-sercice__carousel {
          width: 100%;
          position: absolute;
          bottom: 0;
          left: 0;
          overflow: hidden;
          height: 200px;
          .pic {
            height: auto;
          }
        }
      }
    }
  }
</style>
