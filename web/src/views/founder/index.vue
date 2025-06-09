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
        name: '尼克福瑞纳',
        desc: '福瑞纳先生毕业于著名的美国西北大学，拥有30多年的投资银行、公司管理和市场营销的经验。他曾经出任 Dresner Corporate Services公司总裁，Encyclopaedia Britannica大不列颠百科全书的副总裁和ShipNow公司的首席市场官以及全球知名的伟达公关公司的高级合伙人。尼克曾以其在金融通信领域的杰出贡献获得过最有影响力的Silver Anvils奖。他曾在芝加哥太阳报从事记者和编辑工作，还曾兼任报纸记者协会主席、芝加哥市财政部的高级顾问、Scotus 投资协会主席，并经常就创业、企业管理和企业家精神等发表演讲。福瑞纳先生是方胜的创始人之一。'
      },
      {
        name: '徐永升',
        desc: '徐永升毕业于明尼苏达州卡尔森商学院，美国金融行业19年从业经验, 曾先后就职于US Bank，Wells Fargo，JP Morgan Chase，CITI等世界知名金融机构，熟悉世界各国资本市场, 特别是美国和中国的资本市场。他是Sun Global LLC的创始人。SGC可以交易所有的金融产品，也可以做私募股权投资和风险投资，为客户提供全方位的服务。'
      }
    ],
    en: [
      {
        name: 'Joyce Zhang',
        desc: "Joyce Zhang is a Chinese Certified Public Accountant, and an International Certified Internal Auditor, she received a CUFE Bachelor's degree in Finance, MBA from UIC, and a CFP certificate from North Western University. With more than 20 years of experience in senior financial management, risk management, and asset management in large financial companies, she focus on family financial planning, including funds and real estate investment, Education planning, Retirement planning, Estate Planning, Insurance, and Tax Planning etc.. She is the founder of FISO Group, and concurrently held a number of social positions to serve non-profit organizations"
      },
      {
        name: 'Nick Farina Sr.',
        desc: 'During his career in management and marketing, Nick held many positions that gave him the experience to help Asian employees or potential employees in U.S. He was hiring officer for hundreds of candidates for up-scale companies and was responsible for employee evaluations. He also has been an adjunct professor and lecturer at Northwestern, University of Illinois, and other elite universities. Nick was graduated from Northwestern University with 30 years experences in investigation, management, and marketing. His career includes President of Dresner Corporate Services; vice president of Encyclopaedia Britannica; and CMO of ShipNow,an enterprise software company; Senior partner of Hill+Knowlton Strategies; advanced advisor of Chicago manicipal financial department; and Chairman of paperback media association.'
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
            height: 153px;
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
