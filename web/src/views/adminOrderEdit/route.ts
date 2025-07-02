export default {
    tabs: [
      {
        name: 'adminOrderEdit',
        path: '/admin/adminOrderEdit/:table_type/:id',
        component: () => import('./index.vue')
      }
    ]
  }
  