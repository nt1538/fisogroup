import { RouteRecordRaw} from 'vue-router'
const routeFile = import.meta.globEager('../views/**/route.ts')

let GlobalRouter:Array<RouteRecordRaw> = []

let ChildRouter:Array<RouteRecordRaw> = []


Object.values(routeFile).map((file) => {
  const RouterRule = file.default
  if (RouterRule.global) {
    GlobalRouter.push(RouterRule.global)
  }
  if (RouterRule.tabs) {
    ChildRouter.push(RouterRule.tabs)
  }
})

function handleRouter(routers:any) {
  return routers
    .reduce((pre:any, next:any) => pre.concat(next),[])
    .map((router:any) => {
      if (!router.component) {
        router.component = {
          template: '<router-view></router-view>'
        }
      }
      return router
    })
}

export default {
  Tabs: handleRouter(ChildRouter),
  Global: handleRouter(GlobalRouter)
}
