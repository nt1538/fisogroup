<template>
  <section class="fs-contact">
    <div class="fs-contact__content">
      <div class="txt">
        <h4 class="txt-title">{{ render.title }}</h4>
        <ul class="txt-list">
          <li v-for="item in render.items" :key="item.v">
            <div class="icon" v-if="item.key == 'phone'">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M20.7488 16.0829L20.4697 15.7136L20.4595 15.7024C20.3684 15.6039 20.1099 15.3331 19.6871 14.9592C19.1817 14.5112 18.2798 13.8506 18.2086 13.8017L16.9468 13.0169C16.7152 12.8973 16.4696 12.8722 16.3041 12.8722C16.1245 12.8722 15.9474 12.902 15.7928 12.9581C15.247 13.1543 14.7376 14.0402 14.5959 14.3077C14.5304 14.4313 14.4586 14.5793 14.397 14.7094L14.3771 14.7504C14.3001 14.9083 14.2142 15.0853 14.1231 15.2578C14.0332 15.4242 13.8409 15.5934 13.6458 15.5934C13.5856 15.5934 13.5291 15.5782 13.4746 15.5465C12.6291 15.0463 11.6278 14.399 10.6066 13.3855C9.45453 12.2413 8.7707 11.3369 8.39225 10.4543C8.36917 10.3939 8.37173 10.12 8.52182 10.0437C8.72902 9.93737 8.89772 9.86769 9.04653 9.80558L9.08118 9.79005C9.29543 9.70054 9.49877 9.61596 9.73033 9.47064C9.83038 9.40425 9.88364 9.37386 9.92919 9.34742L9.95227 9.33324C10.0357 9.28666 10.1139 9.24205 10.3538 9.0756C10.3641 9.06798 10.4077 9.03099 10.4539 8.99037L10.6078 8.84698C11.01 8.44765 11.1422 7.85999 10.944 7.35133L10.8747 7.14556C10.8734 7.14025 10.6181 6.52851 10.2089 5.80151C10.01 5.44972 9.7085 4.98197 9.44164 4.61072C8.72066 3.60952 8.05354 3.28944 8.05033 3.28816C8.04327 3.28418 7.87008 3.18938 7.76361 3.13952C7.32869 2.94792 6.8373 2.95483 6.39856 3.15304C5.74299 3.40673 5.34078 3.75288 4.91293 4.12088L4.81926 4.20343C3.54915 5.29547 2.86119 6.72011 3.02347 7.92343C3.26692 9.74316 5.30804 13.4575 7.95731 16.0869C10.6053 18.7142 14.3341 20.7337 16.1552 20.9722C16.2932 20.9908 16.4349 21 16.5767 21C17.8923 21 18.9187 20.1735 19.6647 19.4534C20.0367 19.0941 20.5281 18.5014 20.7898 17.9148C21.0208 17.3995 21.1311 16.6491 20.7488 16.0829ZM7.16573 11.0095C7.61988 12.0675 8.39478 13.1074 9.67644 14.3785C10.7964 15.4916 11.8876 16.1992 12.8081 16.7442C13.0723 16.8994 13.3552 16.978 13.6465 16.978C14.3957 16.978 15.0141 16.4495 15.2963 15.9256C15.4022 15.7268 15.4958 15.5332 15.5984 15.3205L15.6408 15.2307C15.6882 15.1349 15.7312 15.0457 15.7703 14.9697C15.9827 14.5753 16.1847 14.3368 16.2726 14.2549C16.297 14.2536 16.3316 14.2543 16.3515 14.2563L17.4722 14.9539L17.4907 14.9671C17.7627 15.1672 18.4356 15.67 18.8128 16.0049C19.1419 16.2956 19.3542 16.5117 19.4235 16.5817C19.4357 16.5948 19.4434 16.6035 19.4511 16.6087L19.6563 16.8796C19.6711 16.9364 19.6563 17.1491 19.5729 17.3374C19.3914 17.7431 19.0161 18.1883 18.7493 18.446C17.8936 19.2704 17.2489 19.6212 16.5921 19.6212C16.5055 19.6212 16.4156 19.6153 16.3252 19.6027C14.9332 19.4211 11.4302 17.6168 8.88613 15.0926C6.35043 12.5756 4.53574 9.11059 4.35099 7.73483C4.2535 7.00944 4.77436 6.03967 5.67755 5.26273L5.77441 5.18048C6.16699 4.84059 6.42679 4.61631 6.90211 4.43132C6.98421 4.39566 7.05026 4.3775 7.10544 4.3775C7.14457 4.3775 7.18627 4.38606 7.22219 4.40162C7.26966 4.42473 7.34921 4.46731 7.39795 4.49441L7.44029 4.51655C7.44478 4.51888 7.87265 4.7494 8.364 5.43249C8.60903 5.77076 8.87717 6.18759 9.04906 6.49282C9.23766 6.82976 9.42562 7.20234 9.60714 7.60069C9.61421 7.61559 9.61998 7.62846 9.62511 7.63871L9.68413 7.82136C9.68863 7.83226 9.68989 7.83822 9.69118 7.83822C9.6886 7.8415 9.68155 7.84909 9.66937 7.86134L9.63024 7.90129C9.61358 7.91749 9.59561 7.935 9.58534 7.94654C9.41536 8.06215 9.35697 8.09517 9.29668 8.1312C9.23766 8.16424 9.16582 8.20489 9.02341 8.29766C8.89126 8.38091 8.75848 8.43641 8.5699 8.5147C8.38323 8.59197 8.17927 8.67855 7.92779 8.80636C7.02463 9.26615 6.904 10.4015 7.16573 11.0095Z"
                  fill="#231F20"
                />
              </svg>
            </div>
            <div class="icon" v-if="item.key == 'email'">
              <svg t="1679886752082" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2985" width="24" height="24">
                <path
                  d="M876.557442 210.565089H144.379094c-44.805222 0-81.256563 36.450318-81.256564 81.256563v514.471659c0 44.805222 36.450318 81.256563 81.256564 81.256563h732.178348c44.805222 0 81.256563-36.450318 81.256563-81.256563v-514.471659c0-44.806246-36.450318-81.256563-81.256563-81.256563z m0 55.918473c4.118067 0 8.004735 0.993169 11.44499 2.741965l-377.534164 272.261346-377.53826-272.255203a25.159934 25.159934 0 0 1 11.450109-2.748108h732.177325z m0 565.147839H144.379094c-13.965796 0-25.33809-11.372294-25.338091-25.33809V328.15627l391.427265 282.272898 391.427264-282.282112v478.146255c0 13.965796-11.35796 25.33809-25.33809 25.33809z"
                  fill="#3E3A39"
                  p-id="2986"
                ></path>
              </svg>
            </div>
            <div class="icon wechat" v-if="item.key == 'wechat'">
              <svg t="1680228076019" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2776" width="24" height="24"><path d="M664.250054 368.541681c10.015098 0 19.892049 0.732687 29.67281 1.795902-26.647917-122.810047-159.358451-214.077703-310.826188-214.077703-169.353083 0-308.085774 114.232694-308.085774 259.274068 0 83.708494 46.165436 152.460344 123.281791 205.78483l-30.80868 91.730191 107.688651-53.455469c38.558178 7.53665 69.459978 15.308661 107.924012 15.308661 9.66308 0 19.230993-0.470721 28.752858-1.225921-6.025227-20.36584-9.521864-41.723264-9.521864-63.862493C402.328693 476.632491 517.908058 368.541681 664.250054 368.541681zM498.62897 285.87389c23.200398 0 38.557154 15.120372 38.557154 38.061874 0 22.846334-15.356756 38.156018-38.557154 38.156018-23.107277 0-46.260603-15.309684-46.260603-38.156018C452.368366 300.994262 475.522716 285.87389 498.62897 285.87389zM283.016307 362.090758c-23.107277 0-46.402843-15.309684-46.402843-38.156018 0-22.941502 23.295566-38.061874 46.402843-38.061874 23.081695 0 38.46301 15.120372 38.46301 38.061874C321.479317 346.782098 306.098002 362.090758 283.016307 362.090758zM945.448458 606.151333c0-121.888048-123.258255-221.236753-261.683954-221.236753-146.57838 0-262.015505 99.348706-262.015505 221.236753 0 122.06508 115.437126 221.200938 262.015505 221.200938 30.66644 0 61.617359-7.609305 92.423993-15.262612l84.513836 45.786813-23.178909-76.17082C899.379213 735.776599 945.448458 674.90216 945.448458 606.151333zM598.803483 567.994292c-15.332197 0-30.807656-15.096836-30.807656-30.501688 0-15.190981 15.47546-30.477129 30.807656-30.477129 23.295566 0 38.558178 15.286148 38.558178 30.477129C637.361661 552.897456 622.099049 567.994292 598.803483 567.994292zM768.25071 567.994292c-15.213493 0-30.594809-15.096836-30.594809-30.501688 0-15.190981 15.381315-30.477129 30.594809-30.477129 23.107277 0 38.558178 15.286148 38.558178 30.477129C806.808888 552.897456 791.357987 567.994292 768.25071 567.994292z" fill="#fff" p-id="2777"></path></svg>
            </div>
            <p>{{ item.v }}</p>
          </li>
        </ul>
      </div>
      <div class="info clearfix">
        <el-form v-if="lang === 'en'" label-position="left">
          <el-form-item class="no-bottom">
            <el-row :gutter="20" class="no-border">
              <el-col :span="12">
                <el-input v-model="form.firstName" maxlength="20" :placeholder="render.input.name[0]">
                  <template #prefix>
                    <div class="icon">
                      <svg width="19" height="20" viewBox="0 0 19 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M5.51003 11.4756H13.1835C13.9976 11.4756 14.7783 11.799 15.3539 12.3746C15.9295 12.9503 16.2529 13.731 16.2529 14.545V16.8471H2.44063V14.545C2.44063 13.731 2.76401 12.9503 3.33964 12.3746C3.91526 11.799 4.69598 11.4756 5.51003 11.4756ZM14.7182 15.3124V14.545C14.7182 13.6987 14.0299 13.0103 13.1835 13.0103H5.51003C4.66364 13.0103 3.97533 13.6987 3.97533 14.545V15.3124H14.7182ZM9.34678 3.03479C9.85068 3.03484 10.3496 3.13414 10.8152 3.32702C11.2807 3.5199 11.7037 3.80259 12.0599 4.15893C12.4162 4.51528 12.6988 4.93831 12.8916 5.40387C13.0844 5.86943 13.1836 6.36841 13.1835 6.87231C13.1835 7.37621 13.0842 7.87516 12.8913 8.34068C12.6984 8.80621 12.4157 9.22918 12.0594 9.58546C11.703 9.94173 11.28 10.2243 10.8145 10.4171C10.3489 10.6099 9.84991 10.7091 9.34601 10.7091C8.32834 10.709 7.35239 10.3046 6.63286 9.58491C5.91333 8.86524 5.50916 7.88921 5.50926 6.87154C5.50937 5.85387 5.91373 4.87792 6.63341 4.15839C7.35308 3.43886 8.32911 3.03469 9.34678 3.03479ZM9.34678 9.17359C10.616 9.17359 11.6488 8.14074 11.6488 6.87154C11.6488 5.60234 10.616 4.56949 9.34678 4.56949C8.07758 4.56949 7.04473 5.60234 7.04473 6.87154C7.04473 8.14074 8.07758 9.17359 9.34678 9.17359Z"
                          fill="#666666"
                        />
                      </svg>
                    </div>
                  </template>
                </el-input>
              </el-col>
              <el-col :span="12">
                <el-input v-model="form.lastName" :placeholder="render.input.name[1]" />
              </el-col>
            </el-row>
          </el-form-item>
          <el-form-item class="no-border">
            <el-input v-model="form.email" maxlength="50" :placeholder="render.input.email">
              <template #prefix>
                <div class="icon">
                  <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clip-path="url(#clip0_0_726)">
                      <path
                        d="M17.2765 15.748L17.1878 15.6509L17.2765 15.748C17.0262 15.9768 16.6891 16.1035 16.3397 16.1035H4.34632C3.99697 16.1035 3.65982 15.9768 3.40951 15.748C3.15881 15.5188 3.01544 15.2053 3.01544 14.8757V5.00896C3.01544 4.67931 3.15881 4.36583 3.40951 4.13666C3.65982 3.90786 3.99697 3.78111 4.34632 3.78111H16.3397C16.6891 3.78111 17.0262 3.90786 17.2765 4.13666C17.5272 4.36583 17.6706 4.67931 17.6706 5.00896V14.8757C17.6706 15.2053 17.5272 15.5188 17.2765 15.748ZM9.78212 11.0781L9.77155 11.0746L9.76171 11.0695L4.47787 8.28088V14.7441H16.2082V8.45409L10.8494 11.2821L10.8132 11.3012L10.7725 11.2964C10.4349 11.2564 10.1028 11.1833 9.78212 11.0781ZM10.4842 9.88628L10.4908 9.88978L10.497 9.89401C10.5 9.89606 10.503 9.89814 10.506 9.90024L16.2082 6.89039V5.14051H4.47787V6.71716L10.4842 9.88628Z"
                        fill="#666666"
                        stroke="#666666"
                        stroke-width="0.263091"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_0_726">
                        <rect width="14.3909" height="13.1546" fill="white" transform="matrix(-1 0 0 1 17.5383 3.89404)" />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item class="no-border">
            <el-input v-model="form.con" :rows="3" maxlength="110" type="textarea" :placeholder="render.input.content" />
          </el-form-item>
        </el-form>

        <el-form v-else label-position="left">
          <el-form-item class="no-border">
            <el-input v-model="form.name" maxlength="20" :placeholder="render.input.name[0]">
              <template #prefix>
                <div class="icon">
                  <svg width="19" height="20" viewBox="0 0 19 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M5.51003 11.4756H13.1835C13.9976 11.4756 14.7783 11.799 15.3539 12.3746C15.9295 12.9503 16.2529 13.731 16.2529 14.545V16.8471H2.44063V14.545C2.44063 13.731 2.76401 12.9503 3.33964 12.3746C3.91526 11.799 4.69598 11.4756 5.51003 11.4756ZM14.7182 15.3124V14.545C14.7182 13.6987 14.0299 13.0103 13.1835 13.0103H5.51003C4.66364 13.0103 3.97533 13.6987 3.97533 14.545V15.3124H14.7182ZM9.34678 3.03479C9.85068 3.03484 10.3496 3.13414 10.8152 3.32702C11.2807 3.5199 11.7037 3.80259 12.0599 4.15893C12.4162 4.51528 12.6988 4.93831 12.8916 5.40387C13.0844 5.86943 13.1836 6.36841 13.1835 6.87231C13.1835 7.37621 13.0842 7.87516 12.8913 8.34068C12.6984 8.80621 12.4157 9.22918 12.0594 9.58546C11.703 9.94173 11.28 10.2243 10.8145 10.4171C10.3489 10.6099 9.84991 10.7091 9.34601 10.7091C8.32834 10.709 7.35239 10.3046 6.63286 9.58491C5.91333 8.86524 5.50916 7.88921 5.50926 6.87154C5.50937 5.85387 5.91373 4.87792 6.63341 4.15839C7.35308 3.43886 8.32911 3.03469 9.34678 3.03479ZM9.34678 9.17359C10.616 9.17359 11.6488 8.14074 11.6488 6.87154C11.6488 5.60234 10.616 4.56949 9.34678 4.56949C8.07758 4.56949 7.04473 5.60234 7.04473 6.87154C7.04473 8.14074 8.07758 9.17359 9.34678 9.17359Z"
                      fill="#666666"
                    />
                  </svg>
                </div>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item class="no-border">
            <el-input v-model="form.email" maxlength="50" :placeholder="render.input.email">
              <template #prefix>
                <div class="icon">
                  <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clip-path="url(#clip0_0_726)">
                      <path
                        d="M17.2765 15.748L17.1878 15.6509L17.2765 15.748C17.0262 15.9768 16.6891 16.1035 16.3397 16.1035H4.34632C3.99697 16.1035 3.65982 15.9768 3.40951 15.748C3.15881 15.5188 3.01544 15.2053 3.01544 14.8757V5.00896C3.01544 4.67931 3.15881 4.36583 3.40951 4.13666C3.65982 3.90786 3.99697 3.78111 4.34632 3.78111H16.3397C16.6891 3.78111 17.0262 3.90786 17.2765 4.13666C17.5272 4.36583 17.6706 4.67931 17.6706 5.00896V14.8757C17.6706 15.2053 17.5272 15.5188 17.2765 15.748ZM9.78212 11.0781L9.77155 11.0746L9.76171 11.0695L4.47787 8.28088V14.7441H16.2082V8.45409L10.8494 11.2821L10.8132 11.3012L10.7725 11.2964C10.4349 11.2564 10.1028 11.1833 9.78212 11.0781ZM10.4842 9.88628L10.4908 9.88978L10.497 9.89401C10.5 9.89606 10.503 9.89814 10.506 9.90024L16.2082 6.89039V5.14051H4.47787V6.71716L10.4842 9.88628Z"
                        fill="#666666"
                        stroke="#666666"
                        stroke-width="0.263091"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_0_726">
                        <rect width="14.3909" height="13.1546" fill="white" transform="matrix(-1 0 0 1 17.5383 3.89404)" />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item class="no-border">
            <el-input v-model="form.con" :rows="3" maxlength="110" type="textarea" :placeholder="render.input.content" />
          </el-form-item>
        </el-form>
        <el-button color="#626aef" type="primary" @click="sendEmail">{{ render.input.btn }}</el-button>
      </div>
    </div>
    <div class="fs-contact__address">
      <h4 class="address-title">{{ render.address.title }}</h4>
      <p class="address-desc">{{ render.address.desc }}</p>
      <div class="address-bg"><img :src="render.address.path" alt="map" srcset=""></div>
    </div>
    <fs-copyright />

    <!-- <fsFooter></fsFooter> -->
  </section>
</template>

<script setup lang="ts">
  import address from '@/assets/img/contact/address.jpg'
  import { computed, watch, ref, reactive } from 'vue'
  import { useStore } from 'vuex'
  import { ElNotification } from 'element-plus'
  import axios from '@/config/axios.config';

  const content = {
    en: {
      title: 'Please Contact',
      items: [
        {
          key: 'phone',
          v: '+1 872-222-0555'
        },
        {
          key: 'email',
          v: 'wealthmanagementjw@gmail.com'
        },
        {
          key: 'wechat',
          v: 'W8722220555'
        }
      ],
      input: {
        name: ['FIRST NAME', 'LAST NAME'],
        email: 'EMAIL ADDRESS',
        content: 'CONTENTS OF CONSULTATION',
        btn: 'SUBMIT'
      },
      address: {
        title: 'Office address',
        desc: '200 E Randolph ST, Suite 5100,Chicago, 60601',
        path: address
      }
    },
    zh: {
      title: '欢迎咨询',
      items: [
        {
          key: 'phone',
          v: '电话: +1 872-222-0555'
        },
        {
          key: 'email',
          v: '邮箱: wealthmanagementjw@gmail.com'
        },
        {
          key: 'wechat',
          v: '微信: W8722220555'
        }
      ],
      input: {
        name: ['请输入您的名字'],
        email: '请输入您的邮箱',
        content: '请输入您咨询的内容',
        btn: '提交'
      },
      address: {
        title: '办公室地址',
        desc: '200 E Randolph ST, Suite 5100,Chicago, 60601',
        path: address
      }
    }
  }

  const store = useStore()
  const lang = ref('')
  // 渲染数据
  const render = ref({ title: '', items: [{ key: '', v: '' }], address: { title: '', desc: '', path: '' }, input: { name: [], email: '', content: '', btn: '' } })
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
    email: '',
    con: ''
  })

  const postInfo = (form) => {
    let html = ''
    let subject = ''
    if (stateLang.value === 'en') {
      subject = 'This message comes from a website -- contact'
      html = `<h1>HI!</h1><p>My name is <strong>${form.firstName} ${form.lastName}</strong></p><p>My email address is ${form.email}</p><p>The question I asked is: ${form.con || '-'}</p>`
    } else {
      subject = '此消息来自于网站 -- 联系与咨询'
      html = `<h1>HI!</h1><p>我的名字是： <strong>${form.name}</strong></p><p>我的邮箱是： ${form.email}</p><p>我想咨询的问题是: ${form.con || '-'}</p>`
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

<style lang="scss" scoped>
  // ::v-deep.el-textarea__inner,
  // ::v-deep .el-input__inner,
  // ::v-deep .el-textarea__inner {
  //   background: transparent !important;
  //   border: 1px solid #8591db;
  // }
  .no-bottom {
    ::v-deep &.el-form-item {
      margin-bottom: 0;
    }
  }
  .no-border {
    border-bottom: 1px solid rgba(0, 0, 0, 0.2);
    margin: 0 !important;
    ::v-deep .el-col {
      padding: 0 !important;
    }
    ::v-deep .el-textarea__inner,
    ::v-deep .el-input__inner,
    ::v-deep .el-textarea__inner {
      background: transparent !important;
      border: 0;
      font-family: Arial;

      &::placeholder {
        font-family: Arial;
        // color: red;
        // font-size: 1.5em;
      }
    }
  }
  ::v-deep .el-button {
    width: 175px;
    color: #fff;
    // background: #011993;
    // border: 1px solid #011993;
    float: right;
  }

  ::v-deep .el-input--prefix .el-input__inner {
    padding-left: 35px;
    color: #000;
  }
  @include b(contact) {
    background: #fff;
    @include e(content) {
      background: url('@/assets/img/contact/bg.jpg') no-repeat top;
      background-size: cover;
      display: flex;
      justify-content: center;
      padding: 180px 0 200px;

      .txt {
        width: 370px;
        margin-right: 50px;
        .txt-title {
          font-size: 36px;
          line-height: 54px;
          color: #000000;
          margin-bottom: 60px;
        }
        .txt-list {
          li {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            margin-bottom: 25px;

            p {
              font-size: 18px;
              line-height: 24px;
              height: 24px;
              color: #000000;
            }
            .icon {
              box-sizing: border-box;
              height: 100%;
              padding-top: 1px;
              margin-right: 10px;
              &.wechat {
                background: #5db936;
                border-radius: 3px;
              }
            }
          }
        }
      }

      .info {
        width: 525px;
        padding-top: 100px;
        .icon {
          height: 100%;
          box-sizing: border-box;
          padding-top: 6px;
        }
        .no-border {
          margin-bottom: 30px !important;
        }
      }
    }

    @include e(address) {
      width: 90%;
      margin: auto;
      box-sizing: border-box;
      padding: 60px 0 50px;
      .address-title {
        font-weight: 500;
        font-size: 20px;
        line-height: 22px;
        color: #000000;
      }
      .address-bg {
        width: 100%;
        // height: 264px;
        margin: auto;
        img {
          display: block;
          width: 100%;
        }
        // background: url('@/assets/img/contact/address.jpg') no-repeat center;
        // background-size: cover;
      }
      .address-desc {
        font-size: 18px;
        line-height: 27px;
        color: #000000;
        padding: 15px 0;
      }
    }
  }
  .m {
    .fs-contact {
      .fs-contact__content {
        display: block;
        padding: 10px 10px 20px;
        .txt {
          width: 100%;
          margin: 0;
          .txt-title {
            font-size: 20px;
            line-height: 1.5;
            margin-bottom: 10px;
          }
          .txt-list {
            width: 95%;
            margin: auto;
            li {
              margin-bottom: 5px;
              p {
                font-size: 14px;
              }
            }
          }
        }

        .info {
          width: 95%;
          margin: auto;
          padding-top: 15px;
        }
      }
    }
    .fs-contact__address {
      width: 90%;
      margin: auto;
      padding: 20px 0 15px;
      .address-title {
        font-size: 18px;
        line-height: 1.5;
      }
      .address-desc {
        font-size: 14px;
        line-height: 1.5;
        padding: 6px 0;
      }
    }
  }
</style>
