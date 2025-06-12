import router from '@/router'
import axios, { AxiosRequestConfig } from 'axios'
import { ElLoading, ElNotification } from 'element-plus'
// import 'element-plus/es/components/loading/style/css'
// import 'element-plus/es/components/notification/style/css'
interface AxiosRequestOptions extends AxiosRequestConfig {
  isLoading?: boolean
  isAutoMsg?: boolean
}

const service = axios.create({
  baseURL: '/api',
  timeout: 5000, // 请求超时时间
  withCredentials: true // 跨域
})
let ARR_LOADING: string[] = []
let IS_LOADING = false
let LOADING_INSTANCE:any = null

service.interceptors.request.use(
  (config: AxiosRequestOptions) => {
    if (config.isLoading) {
      ARR_LOADING.push(config.url ?? '')
      if (!IS_LOADING && !LOADING_INSTANCE) {
        IS_LOADING = true
        LOADING_INSTANCE = ElLoading.service({
          text: '努力加载中...'
        })
      }
    }
    config.headers.common['X-Requested-With'] = 'XMLHttpRequest'
    return config
  },
  (error) => {
    Promise.reject(error)
  }
)

service.interceptors.response.use(
  (response) => {
    let {
      data: { code },
      config
    } = response
    const errorMsg = response.data.msg || response.data.err_msg

    if ((config as AxiosRequestOptions).isLoading) {
      let index = ARR_LOADING.indexOf(config.url ?? '')
      ARR_LOADING.splice(index, 1)
      if (ARR_LOADING.length === 0 && LOADING_INSTANCE) {
        LOADING_INSTANCE.close()
        IS_LOADING = false
        LOADING_INSTANCE = null
      }
    }
    if (code && Number(code) !== 0) {
      if ((config as AxiosRequestOptions).isAutoMsg) {
        ElNotification.error?.({ message: errorMsg || '未知错误' })
      }
      if (code && Number(code) === 5001) {
        // 未登录
        router.push('/login')
      }
      return Promise.reject(response.data)
    }
    return response.data
  },
  (error) => {
    ARR_LOADING = []
    if (LOADING_INSTANCE) {
      LOADING_INSTANCE.close()
      LOADING_INSTANCE = null
    }
    IS_LOADING = false
    let response = error.response
    if (response === undefined) {
      ElNotification.error?.({ message: '网络异常, 请稍后重试' })
      return
    }
    let { status, data } = response
    const errMsg = data.err_msg || data.errMsg || data.error_msg || data.error
    console.log(444);
    if (status === 401) {
      // 处理认证信息
      return
    }

    if (errMsg !== undefined && status !== 401) {
      ElNotification.error?.({ message: `服务器出错：${errMsg}` })
    }
    return Promise.reject(error)
  }
)

service.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, error => {
  return Promise.reject(error)
})

// 可选：响应拦截处理 401 等错误
service.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      console.warn('未授权，可能需要重新登录')
      // 可选跳转：window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default service
