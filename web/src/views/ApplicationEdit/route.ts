export default {
    tabs: [
      {
        name: 'Application Edit',
        path: '/employee/reports/app-edit/:type/:id',
        component: () => import('./index.vue')
      }
    ]
  }
  