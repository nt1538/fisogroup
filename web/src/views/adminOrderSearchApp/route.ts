export default {
    tabs: [
      {
        name: 'adminOrderSearchApp',
        path: '/admin/adminOrderSearchApp/:table_type',
        component: () => import('./index.vue')
      }
    ]
  }
  