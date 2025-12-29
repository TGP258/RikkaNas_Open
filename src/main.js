import './assets/main.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 确保导入了router
import { createPinia } from 'pinia';
const app = createApp(App)

app.use(createPinia());
app.use(router) // 确保使用了router插件
app.mount('#app')

