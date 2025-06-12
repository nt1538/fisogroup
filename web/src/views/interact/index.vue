<template>
  <section class="fs-interact">
    <div class="fs-interact__content">
      <h2 class="title">{{ render.title }}</h2>
      <p class="desc">{{ render.desc }}</p>
      <div class="banner"><img :src="render.pic" alt="banner" /></div>
      <ul class="items">
        <li class="items-con" v-for="(item, i) in render.list" :key="i">
          <div class="info">
            <div class="pic l" v-if="i == 0"><img :src="item.pic" alt="图片" /></div>
            <div class="info-t">
              <h4>{{ item.title }}</h4>
              <p class="items_desc">{{ item.desc }}</p>
              <ul class="item-list">
                <li v-for="v in item.items" :key="v">· {{ v }}</li>
              </ul>
            </div>
            <div class="pic r" v-if="i == 1"><img :src="item.pic" alt="图片" /></div>
          </div>
          <div class="hr" v-if="i == 0"></div>
        </li>
      </ul>
      <div class="cooperate">
        <div class="pic"><img :src="render.cooperate.pic" alt="图片" srcset="" /></div>
        <div class="con">
          <h5 class="cooperate-title">{{ render.cooperate.title }}</h5>
          <p class="cooperate-desc">{{ render.cooperate.desc }}</p>
          <el-form v-if="lang === 'en'" label-position="left">
            <el-form-item>
              <el-row :gutter="20" class="no-border">
                <el-col :span="12">
                  <el-input v-model="form.firstName" :placeholder="render.cooperate.inputname[0]">
                    <template #prefix>
                      <div class="icon">
                        <svg width="11" height="12" viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M2.59173 7.16667H8.42506C9.0439 7.16667 9.63739 7.4125 10.075 7.85008C10.5126 8.28767 10.7584 8.88116 10.7584 9.5V11.25H0.258392V9.5C0.258392 8.88116 0.504225 8.28767 0.94181 7.85008C1.37939 7.4125 1.97289 7.16667 2.59173 7.16667ZM9.59173 10.0833V9.5C9.59173 8.85658 9.06848 8.33333 8.42506 8.33333H2.59173C1.94831 8.33333 1.42506 8.85658 1.42506 9.5V10.0833H9.59173ZM5.50839 0.75C5.89145 0.750038 6.27075 0.825526 6.62464 0.972152C6.97853 1.11878 7.30007 1.33367 7.57091 1.60456C7.84175 1.87546 8.05657 2.19704 8.20313 2.55096C8.34969 2.90487 8.4251 3.28419 8.42506 3.66725C8.42502 4.05031 8.34953 4.42961 8.20291 4.7835C8.05628 5.13739 7.84139 5.45893 7.5705 5.72977C7.2996 6.0006 6.97802 6.21543 6.6241 6.36199C6.27019 6.50854 5.89087 6.58396 5.50781 6.58392C4.73418 6.58384 3.99227 6.27644 3.44529 5.72935C2.89831 5.18226 2.59107 4.44029 2.59114 3.66667C2.59122 2.89304 2.89862 2.15113 3.44571 1.60415C3.9928 1.05717 4.73477 0.749923 5.50839 0.75ZM5.50839 5.41667C6.47323 5.41667 7.25839 4.6315 7.25839 3.66667C7.25839 2.70183 6.47323 1.91667 5.50839 1.91667C4.54356 1.91667 3.75839 2.70183 3.75839 3.66667C3.75839 4.6315 4.54356 5.41667 5.50839 5.41667Z"
                            fill="white"
                          />
                        </svg>
                      </div>
                    </template>
                  </el-input>
                </el-col>
                <el-col :span="12">
                  <el-input v-model="form.lastName" :placeholder="render.cooperate.inputname[1]">
                    <template #prefix>
                      <div class="icon-s">
                        <svg width="2" height="16" viewBox="0 0 2 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 0V16" stroke="white" stroke-width="1.5" />
                        </svg>
                      </div>
                    </template>
                  </el-input>
                </el-col>
              </el-row>
            </el-form-item>
            <el-form-item>
              <el-input v-model="form.email" :placeholder="render.cooperate.inputemail">
                <template #prefix>
                  <div class="icon">
                    <svg width="10" height="11" viewBox="0 0 10 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M4.60496 6.159L4.5965 6.15596L4.58872 6.15147L0.933 4.04081V8.94678H9.06701V4.17249L5.3592 6.31315L5.3299 6.33007L5.29635 6.32572C5.06056 6.29518 4.82876 6.23928 4.60496 6.159ZM5.10542 5.2557L5.10577 5.25509L5.11429 5.26146L9.06701 2.97898V1.64617H0.933V2.84729L5.10542 5.2557ZM9.16701 9.98018H0.832999C0.585445 9.98018 0.348032 9.88184 0.172986 9.70679C-0.00206184 9.53175 -0.100403 9.29433 -0.100403 9.04678V1.54617C-0.100403 1.29862 -0.00206184 1.0612 0.172985 0.886155C0.348032 0.711109 0.585445 0.612769 0.832999 0.612769H9.16701C9.41456 0.612769 9.65198 0.711109 9.82703 0.886155C10.0021 1.0612 10.1004 1.29862 10.1004 1.54617V9.04678C10.1004 9.29433 10.0021 9.53175 9.82703 9.70679C9.65198 9.88184 9.41456 9.98018 9.16701 9.98018Z"
                        fill="white"
                        stroke="#666666"
                        stroke-width="0.2"
                      />
                    </svg>
                  </div>
                </template>
              </el-input>
            </el-form-item>
          </el-form>

          <el-form v-else label-position="left">
            <el-form-item>
              <el-input v-model="form.name" :placeholder="render.cooperate.inputname[0]">
                <template #prefix>
                  <div class="icon">
                    <svg width="11" height="12" viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M2.59173 7.16667H8.42506C9.0439 7.16667 9.63739 7.4125 10.075 7.85008C10.5126 8.28767 10.7584 8.88116 10.7584 9.5V11.25H0.258392V9.5C0.258392 8.88116 0.504225 8.28767 0.94181 7.85008C1.37939 7.4125 1.97289 7.16667 2.59173 7.16667ZM9.59173 10.0833V9.5C9.59173 8.85658 9.06848 8.33333 8.42506 8.33333H2.59173C1.94831 8.33333 1.42506 8.85658 1.42506 9.5V10.0833H9.59173ZM5.50839 0.75C5.89145 0.750038 6.27075 0.825526 6.62464 0.972152C6.97853 1.11878 7.30007 1.33367 7.57091 1.60456C7.84175 1.87546 8.05657 2.19704 8.20313 2.55096C8.34969 2.90487 8.4251 3.28419 8.42506 3.66725C8.42502 4.05031 8.34953 4.42961 8.20291 4.7835C8.05628 5.13739 7.84139 5.45893 7.5705 5.72977C7.2996 6.0006 6.97802 6.21543 6.6241 6.36199C6.27019 6.50854 5.89087 6.58396 5.50781 6.58392C4.73418 6.58384 3.99227 6.27644 3.44529 5.72935C2.89831 5.18226 2.59107 4.44029 2.59114 3.66667C2.59122 2.89304 2.89862 2.15113 3.44571 1.60415C3.9928 1.05717 4.73477 0.749923 5.50839 0.75ZM5.50839 5.41667C6.47323 5.41667 7.25839 4.6315 7.25839 3.66667C7.25839 2.70183 6.47323 1.91667 5.50839 1.91667C4.54356 1.91667 3.75839 2.70183 3.75839 3.66667C3.75839 4.6315 4.54356 5.41667 5.50839 5.41667Z"
                        fill="white"
                      />
                    </svg>
                  </div>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item>
              <el-input v-model="form.email" :placeholder="render.cooperate.inputemail">
                <template #prefix>
                  <div class="icon">
                    <svg width="10" height="11" viewBox="0 0 10 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M4.60496 6.159L4.5965 6.15596L4.58872 6.15147L0.933 4.04081V8.94678H9.06701V4.17249L5.3592 6.31315L5.3299 6.33007L5.29635 6.32572C5.06056 6.29518 4.82876 6.23928 4.60496 6.159ZM5.10542 5.2557L5.10577 5.25509L5.11429 5.26146L9.06701 2.97898V1.64617H0.933V2.84729L5.10542 5.2557ZM9.16701 9.98018H0.832999C0.585445 9.98018 0.348032 9.88184 0.172986 9.70679C-0.00206184 9.53175 -0.100403 9.29433 -0.100403 9.04678V1.54617C-0.100403 1.29862 -0.00206184 1.0612 0.172985 0.886155C0.348032 0.711109 0.585445 0.612769 0.832999 0.612769H9.16701C9.41456 0.612769 9.65198 0.711109 9.82703 0.886155C10.0021 1.0612 10.1004 1.29862 10.1004 1.54617V9.04678C10.1004 9.29433 10.0021 9.53175 9.82703 9.70679C9.65198 9.88184 9.41456 9.98018 9.16701 9.98018Z"
                        fill="white"
                        stroke="#666666"
                        stroke-width="0.2"
                      />
                    </svg>
                  </div>
                </template>
              </el-input>
            </el-form-item>
          </el-form>
          <el-button @click="sendEmail">{{ render.cooperate.btn }}</el-button>
        </div>
      </div>
    </div>
    <fsFooter></fsFooter>
  </section>
</template>

<script setup lang="ts">
  import { ElNotification } from 'element-plus'
  import axios from '@/config/axios.config'
  import bg1 from '@/assets/img/interact/1.jpg'
  import bg2 from '@/assets/img/interact/2.jpg'
  import bg3 from '@/assets/img/interact/3.jpg'
  import bg4 from '@/assets/img/interact/4.jpg'
  import { computed, watch, ref, reactive } from 'vue'
  import { useStore } from 'vuex'
  const content = {
    en: {
      title: 'FIT IN STAND OUT!',
      desc: 'We welcome interested talents worldwide with open arms. \r We help you to grow your business!',
      pic: bg1,
      list: [
        {
          title: 'Business Model',
          desc: 'Simple and easy duplicate system. Fit for everyone.',
          items: ['High beginning commission', 'No Job Risk (Part-time)', 'Flexible Schedule', 'Unlimited Territory', 'Exponential growth opportunity'],
          pic: bg2
        },
        {
          title: 'Training & Support',
          desc: 'You’ll be guided one on one, step by step, from ZERO to HERO. English and Chinese.',
          items: [
            'Regular online training every week',
            'Regular onsite training every week',
            'One on one field training',
            'Home Office team back-end support',
            'Team building and Events',
            'Videos of Recorded training'
          ],
          pic: bg3
        }
      ],
      cooperate: {
        title: 'Partner With Us',
        desc: 'Achieve with you.',
        inputname: ['FIST NAME', 'LAST NAME'],
        inputemail: 'EMAIL ADDRESS',
        pic: bg4,
        btn: 'SUBMIT'
      }
    },
    zh: {
      title: '融入胜出',
      desc: '我们张开双臂欢迎四方人才。 我们帮助您发展业务！',
      pic: bg1,
      list: [
        {
          title: '商业合作',
          desc: '简单易用的可复制系统。 适合所有人。',
          items: ['高起点佣金', '兼职或全职，没有职业风险', '时间自由', '无地域限制、线上操作', '巨大发展空间'],
          pic: bg2
        },
        {
          title: '培训与支持',
          desc: '您将得到一对一的指导，循序渐进。双语。',
          items: ['每周定期在线培训 ', '每周定期现场培训', '一对一实地培训', '团队后端支持', '团队建设和大型会议活动', '录制的培训视频'],
          pic: bg3
        }
      ],
      cooperate: {
        title: '与我们合作',
        desc: '期待与您高效沟通，一起成就。',
        inputname: ['请输入您的名字'],
        inputemail: '请输入您的邮箱',
        pic: bg4,
        btn: '提交'
      }
    }
  }

  const store = useStore()
  const lang = ref('')
  // 渲染数据
  const render = ref({ title: '', desc: '', pic: '', list: [{ pic: '', title: '', desc: '', items: [] }], cooperate: { title: '', desc: '', inputname: [], inputemail: '', pic: '', btn: '' } })
  const stateLang = computed(() => store.state.common.lang)
  watch(
    stateLang,
    (newVal) => {
      lang.value = newVal
      render.value = content[newVal]
    },
    { immediate: true, deep: true }
  )

  const form = reactive({
    firstName: '',
    lastName: '',
    name: '',
    email: ''
  })

  const postInfo = (form) => {
    let html = ''
    let subject = ''
    if (stateLang.value === 'en') {
      subject = 'This message comes from a website -- Oppotunities'
      html = `<h1>HI!</h1><p>My name is <strong>${form.firstName} ${form.lastName}</strong></p><p>My email address is ${form.email}</p>`
    } else {
      subject = '此消息来自于网站 -- 机遇与合作'
      html = `<h1>HI!</h1><p>我的名字是： <strong>${form.name}</strong></p><p>我的邮箱是： ${form.email}</p></p>`
    }
    return new Promise((resove, reject) => {
      axios
        .post(
          'http://127.0.0.1/api/email/send',
          {
            email: 'wealthmanagementjw@gmail.com',
            content: {
              subject: subject,
              html: html
            }
          },
          {
            headers: { 'content-type': 'application/json' }
          }
        )
        .then(
          (res) => {
            resove(res)
          },
          (err) => {
            reject(err)
          }
        )
    })
  }
  const sendEmail = async () => {
    if (stateLang.value === 'en') {
      if (!form.firstName || !form.lastName || !form.email) {
        ElNotification({
          type: 'warning',
          title: 'Tips',
          message: 'Please enter FirstName LastName Email'
        })
        return false
      }
    } else {
      if (!form.name || !form.email) {
        ElNotification({
          type: 'warning',
          title: '提示',
          message: '请输入您的名字和邮箱'
        })
        return false
      }
    }
    if (!/^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/.test(form.email)) {
      ElNotification({
        type: 'warning',
        title: stateLang.value === 'en' ? 'Tips' : '提示',
        message: stateLang.value === 'en' ? 'Please enter the correct email address' : '请输入正确的邮箱地址'
      })
      return false
    }
    try {
      const { data } = (await postInfo(form)) as any
      if (data.status != 0) {
        ElNotification({
          type: 'warning',
          title: stateLang.value === 'en' ? 'Tips' : '提示',
          message: stateLang.value === 'en' ? 'Submission failed. Please try again later' : '提交失败，请稍后重试'
        })
        return false
      }
      ElNotification({
          type: 'success',
          title: stateLang.value === 'en' ? 'Tips' : '提示',
          message: stateLang.value === 'en' ? 'Submitted successfully' : '提交成功'
        })
    } catch (error) {
      ElNotification({
          type: 'warning',
          title: stateLang.value === 'en' ? 'Tips' : '提示',
          message: stateLang.value === 'en' ? 'Submission failed. Please try again later' : '提交失败，请稍后重试'
        })
    }
  }
</script>

<style lang="scss">
  @include b(interact) {
    @include e(content) {
      // background: #fff url('@/assets/img/home/bg.jpg') no-repeat top;
      // background-size: cover;
      .title {
        font-weight: 500;
        font-size: 40px;
        line-height: 72px;
        text-align: center;
        color: #001290;
        margin: 40px auto 8px;
      }

      .desc {
        width: 865px;
        margin: auto;
        text-align: center;
        font-weight: 500;
        font-size: 29px;
        line-height: 39px;
        color: #000000;
      }

      .banner {
        width: 100%;
        margin: 45px auto 100px;

        img {
          display: block;
          width: 100%;
          height: auto;
        }
      }

      .items {
        padding: 0 100px;
        box-sizing: border-box;
        margin: auto;

        .items-con {
          .hr {
            width: 100%;
            margin: 100px auto;
            height: 1px;
            background: #ccc;
          }

          .info {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;

            .pic {
              width: 713px;
              height: 400px;
              flex: 0 0 auto;

              &.l {
                margin-right: 75px;
              }
              &.r {
                margin-left: 20px;
              }

              img {
                display: block;
                width: 100%;
                height: 100%;
              }
            }

            .info-t {
              padding-right: 40px;
            }
            h4 {
              font-size: 36px;
              line-height: 54px;
              color: #000000;
            }

            .items_desc {
              font-size: 18px;
              line-height: 26px;
              color: #000000;
              margin: 15px 0 30px;
            }

            .item-list {
              li {
                font-size: 16px;
                line-height: 24px;
                color: #000000;
                margin-bottom: 8px;
              }
            }
          }
        }
      }

      .cooperate {
        margin-top: 100px;
        padding: 100px 75px;
        background: #2e48cd;
        display: flex;
        justify-content: space-between;

        .pic {
          width: 713px;
          height: 400px;

          img {
            display: block;
            width: 100%;
            height: 100%;
          }
        }

        .con {
          padding-top: 70px;
          width: 35%;

          .cooperate-title {
            font-size: 36px;
            line-height: 54px;
            color: #ffffff;
            text-align: left;
          }

          .cooperate-desc {
            font-size: 18px;
            line-height: 26px;
            color: #ffffff;
            margin: 15px 0 30px;
            text-align: left;
          }

          .icon {
            padding-top: 1px;
            height: 100%;
            box-sizing: border-box;
          }

          .icon-s {
            padding-top: 4px;
            height: 100%;
            box-sizing: border-box;
          }
        }
      }

      @media screen and (min-width: 750px) and (max-width: 1300px) {
        .items {
          padding: 0 40px;
        }

        .cooperate {
          padding: 100px 45px;

          .con {
            width: 355px;
          }
        }
      }
    }

    .el-textarea__inner,
    .el-input__inner {
      background: transparent !important;
      border: 1px solid #8591db;
    }

    .no-border {
      border: 1px solid #8591db;
      margin: 0 !important;

      .el-col {
        padding: 0 !important;
      }

      .el-textarea__inner,
      .el-input__inner {
        background: transparent !important;
        border: 0;
      }
    }

    .el-input--prefix .el-input__inner {
      padding-left: 25px;
      color: #fff;
    }
  }

  .m {
    .fs-interact {
      .fs-interact__content {
        .title {
          font-size: 24px;
          line-height: 1.5;
        }

        .desc {
          width: 95%;
          font-size: 18px;
          line-height: 1.5;
        }

        .banner {
          width: 100%;
          height: auto;
          margin: 10px auto 20px;
        }

        .items {
          padding: 0 10px;

          .info-t {
            width: 80%;
            box-sizing: border-box;
            padding-left: 10px;
            position: relative;
            z-index: 1;
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
            &:not(:first-child) {
              margin-top: -150px;

              h4 {
                padding-top: 0;
              }
            }
          }
        }

        .items-con {
          .hr {
            margin: 0 auto;
          }

          .info {
            display: block;

            h4 {
              font-size: 20px;
              line-height: 1.5;
              padding-top: 15px;
            }

            .items_desc {
              font-size: 14px;
              line-height: 1.5;
              margin: 8px 0 8px;
            }

            .item-list {
              margin-bottom: 20px;

              li {
                font-size: 12px;
                line-height: 1.5;
              }
            }

            .pic {
              width: 100%;
              height: auto;

              &.l {
                margin: 0;
              }
              &.r {
                margin-top: -160px;
              }
            }
          }
        }
      }
    }
    .fs-interact__content {
      .cooperate {
        margin-top: 20px;
        padding: 15px 10px;
        display: block;

        .pic {
          width: 100%;
          height: auto;
        }

        .con {
          width: 100%;
          padding-top: 10px;

          .cooperate-title {
            font-size: 20px;
            line-height: 1.5;
          }

          .cooperate-desc {
            font-size: 16px;
            line-height: 1.5;
            margin: 5px 0 10px;
          }
        }
      }
    }
  }
</style>
