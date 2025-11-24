import './assets/main.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 确保导入了router
const app = createApp(App)
app.use(router) // 确保使用了router插件
app.mount('#app')

