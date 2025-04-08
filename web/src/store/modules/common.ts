// 当前登录用户的信息
import { Module } from 'vuex'
import RootStateTypes from '../interface'
import { localstorage } from '$utils'

export interface UserModuleTypes {
  lang: string,
  isM: boolean,
  showAnimate: boolean
}

const common: Module<UserModuleTypes, RootStateTypes> = {
  state() {
    return {
      lang: localstorage.get('language')|| 'en',
      isM: false,
      showAnimate: localstorage.get('showAnimate') || false,
    }
  },
  getters: {
    // 获取是否是手机端
    getMClient(state){
      console.log(1);
      return state.isM
    }
  },
  mutations: {
    // 更新语言
    updateLang(state, value) {
      state.lang = value
      localstorage.set('language', value)
    },
    updateClient(state, value) {
      state.isM = value
    },
    updateShowAnimate(state, value) {
      state.showAnimate = value
      localstorage.set('showAnimate', true)
    },
  },
  actions: {
    // 异步请求
  }
}

export default common
