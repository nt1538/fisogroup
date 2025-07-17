export default {
    tabs: [
      {
        name: 'adminOrderEditApp',
        path: '/admin/adminOrderEditApp/:table_type/:id',
        component: () => import('./index.vue')
      }
    ]
  }
  