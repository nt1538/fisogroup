import axios from 'axios'
import { ElNotification, ElLoading } from 'element-plus'
import router from '@/router'

const service = axios.create({
  baseURL: '/api',
  timeout: 5000,
  withCredentials: true
})

// 请求拦截器：自动附加 token
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

// 响应拦截器：统一错误提示
service.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status
    const message = error.response?.data?.msg || error.response?.data?.error || 'Unknown error'

    if (status === 401) {
      ElNotification.error({ message: '未授权或登录失效，请重新登录' })
      router.push('/login')
    } else {
      ElNotification.error({ message: `服务器出错：${message}` })
    }
    return Promise.reject(error)
  }
)

export default service;