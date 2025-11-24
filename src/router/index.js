import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'  // 首页
import Login from '@/views/Login.vue'  // 登录页面
import Desktop from "@/views/Desktop.vue"; //桌面菜单

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home
    },
    {
        path: '/login',
        name: 'Login',
        component: Login
    },
    {
        path: '/desktop',
        name: 'Desktop',
        component: Desktop
    },
    // 可以继续添加更多路由
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router