export default {
    tabs: [
      {
        name: 'AdminChangePassword',
        path: '/admin/employees/:id/change-password',
        component: () => import('./index.vue')
      }
    ]
  }