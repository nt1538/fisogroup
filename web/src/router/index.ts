import { RouteRecordRaw, createRouter, createWebHashHistory } from 'vue-router'
import Layout from '@/layout'
import RouterConfig from '@/config/pick.router'

// 根路由
let rootRouter: RouteRecordRaw = {
  name: 'App',
  path: '/',
  component: Layout,
  children: RouterConfig.Tabs || [],
}

// 总路由
let routes: Array<RouteRecordRaw> = [
  {
    path: '/:catchAll(.*)',
    redirect: () => {
      return { name: 'App' }
    }
  },
  ...RouterConfig.Global
]
routes.push(rootRouter)
// const path = process.env.NODE_ENV === 'production' ? '/fs' : '/'
console.log(process.env.NODE_ENV, 4444);

const router = createRouter({
  history: createWebHashHistory('/fsgroup/'), // : createWebHistory('/fs/'),
  routes,
  // base: '/fs',
})

export default router
