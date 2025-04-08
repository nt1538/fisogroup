import NProgress from 'nprogress'
import { store } from '@/store'
import { Router } from 'vue-router'
import utils from '@/utils'
/**
 * @export
 * @param {any} router 路由
 * @param {any} store vuex store
 */
const ruleFlag = false
export default function LoadingConfig(router: Router) {
  router.beforeEach(async (to, from, next) => {
    NProgress.start()
    const mClientFlag = !!navigator.userAgent.match(/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i)
    // console.log(mClientFlag, 222);
    if (mClientFlag) {
      store.commit('updateClient', mClientFlag)
    }
    next()
  })

  router.afterEach(() => {
    setTimeout(() => {
      NProgress.done()
    }, 50)
  })
}
