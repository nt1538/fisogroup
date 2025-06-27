<template>
  <section class="fs-founder">
    <div class="fs-founder__content">
      <div v-for="(item, i) in render" :key="item.name" class="item" :class="`item${i + 1}`">
        <div class="pic" :class="[`pic${i + 1}`, { pc: i === 1 && !isMClient }]" v-if="isMClient || i !== 1">
          <img :src="getImageUrl(i + 1)" alt="创始人" />
        </div>
        <div class="txt">
          <h3 class="name" :class="lang">{{ item.name }}</h3>
          <p class="desc" :class="lang">{{ item.desc }}</p>
        </div>
        <!-- Optional alternative for second pic position on PC -->
        <div class="pic pic2 pc" v-if="i == 1 && !isMClient">
          <img :src="getImageUrl(i + 1)" alt="创始人" />
        </div>
      </div>
    </div>
    <fsFooter></fsFooter>
  </section>
</template>

<script setup lang="ts">
  import { computed, watch, ref } from 'vue'
  import { useStore } from 'vuex'

  const getImageUrl = (idx) => {
    return new URL(`../../assets/img/founder/${idx}.png`, import.meta.url).href
  }
  const content = {
    zh: [
      {
        name: '张琴',
        desc: '张琴女士是美国理财规划师，中国注册会计师，国际注册内部审计师，高级经济师，中央财经大学金融本科，伊州州立大学工商管理硕士。她曾先后任职多个大型金融公司，有着20多年大型金融公司高级财务管理、风险管理、资产管理经验，有多年家庭理财规划经验，领域涉及股票、债券、基金、信托、保险、房地产投资、金融衍生品投资、风险投资等。她是方胜集团创始人，并兼任多个非盈利机构会长、理事等职位服务社会。'
      },
      {
        name: '徐永升',
        desc: '徐永升毕业于明尼苏达州卡尔森商学院，美国金融行业19年从业经验, 曾先后就职于US Bank，Wells Fargo，JP Morgan Chase，CITI等世界知名金融机构，熟悉世界各国资本市场, 特别是美国和中国的资本市场。他是Sun Global LLC的创始人。SGC可以交易所有的金融产品，也可以做私募股权投资和风险投资，为客户提供全方位的服务。'
      }
    ],
    en: [
      {
        name: 'Joyce Zhang',
        desc: "Joyce Zhang is a Chinese Certified Public Accountant, and an International Certified Internal Auditor, she received a CUFE Bachelor's degree in Finance, MBA from UIC, and a certificate in financial planning from North Western University. With more than 20 years of experience in senior financial management, risk management, and asset management in large financial companies, she focus on family financial planning, including funds and real estate investment, Education planning, Retirement planning, Estate Planning, Insurance, and Tax Planning etc.. She is the founder of FISO Group, and concurrently held a number of social positions to serve non-profit organizations"
      },
      {
        name: 'Mark Xu',
        desc: 'Mark Xu received MBA from the Carlson School of Management, University of Minnesota. 19 years in the financial service industry and worked for US Bank, Wells Fargo, JP Morgan Chase, and CITI. He is knowledgeable about the capital markets around the world, especially the United States and China. He is the founder of Sun Global LLC. SGC is licensed to invest in all financial products, including private equity and venture capital, and provides customers with a full range of services.'
      }
    ]
  }
  const lang = ref('')
  const store = useStore()
  const isMClient = computed(() => store.state.common.isM)
  // 渲染数据
  const render = ref([{ name: '', desc: '' }])
  const stateLang = computed(() => store.state.common.lang)
  watch(
    stateLang,
    (newVal) => {
      lang.value = newVal
      render.value = content[newVal]
    },
    { immediate: true, deep: true }
  )
</script>

<style lang="scss">
  @include b(founder) {
    @include e(content) {
      background: #fff url('@/assets/img/founder/bg.jpg') no-repeat top;
      background-size: cover;
      // height: 700px;
      padding-top: 100px;

      .item {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding-bottom: 80px;
        &.item2 {
          padding-bottom: 60px;
        }

        .pic {
          width: 187px;
          flex: 0 0 auto;
          &.pic1 {
            height: 231px;
            margin-right: 38px;
          }
          &.pic2 {
            height: 231px;
            float: right !important;
          }
          &.pc {
            margin-left: 38px;
          }

          img {
            display: block;
            width: 100%;
            height: 100%;
          }
        }

        .txt {
          width: 600px;
          .name {
            font-weight: 500;
            font-size: 32px;
            line-height: 48px;
            color: #000000;
            margin-bottom: 20px;
          }

          .desc {
            font-size: 16px;
            color: #000000;
            &.en {
              line-height: 24px;
            }
            &.zh {
              line-height: 32px;
            }
          }
        }
      }
    }
  }
  .m {
    .fs-founder {
      .fs-founder__content {
        padding-top: 50px;

        .pic2 {
          height: 153px;
          float: none !important;
        }

        .item {
          display: block;
          width: 90%;
          margin: auto;
          padding-bottom: 40px;
          &.item1 {
            padding-bottom: 70px;
          }
          .pic {
            margin: auto;
          }
          .txt {
            width: auto;
            text-align: left;
            .name {
              font-size: 24px;
              line-height: 1.5;
              margin-bottom: 10px;
              text-align: center;
            }
            .desc {
              font-size: 14px;
              line-height: 1.5;
            }
          }
        }
      }
    }
  }
</style>
