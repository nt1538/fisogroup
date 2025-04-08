import { createApp } from 'vue'
import router from './router'
import { store } from './store'
import Components from './components'
import main from './main.vue'
import LoadingConfig from '@/config/loading.config'
import 'animate.css'
const app = createApp(main)

app.use(Components)

app.use(router)
app.use(store)

LoadingConfig(router)

app.mount('#fangsheng')
