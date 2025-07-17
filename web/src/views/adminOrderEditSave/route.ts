export default {
    tabs: [
      {
        name: 'adminOrderEditSave',
        path: '/admin/adminOrderEditSave/:table_type/:id',
        component: () => import('./index.vue')
      }
    ]
  }
  