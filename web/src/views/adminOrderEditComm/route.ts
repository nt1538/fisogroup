export default {
    tabs: [
      {
        name: 'adminOrderEditComm',
        path: '/admin/adminOrderEditComm/:table_type/:id',
        component: () => import('./index.vue')
      }
    ]
  }
  