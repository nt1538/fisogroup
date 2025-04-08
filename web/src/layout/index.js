import './src/index.scss'
import Layout from './src/Layout.vue'

Layout.install = function (Vue) {
  Vue.component(Layout.name, Layout)
}

export default Layout
