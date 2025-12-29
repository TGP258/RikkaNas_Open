import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'  // 首页
import Login from '@/views/Login.vue'  // 登录页面
import Desktop from "@/views/Desktop.vue"; //桌面菜单
// 导入你的INI配置编辑器组件
import IniConfigEditor from '@/components/IniConfigEditor.vue';

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
    {
        path: '/ini-editor', // INI编辑器的路由路径（可自定义，如 /config/edit 等）
        name: 'IniConfigEditor', // 路由名称（唯一标识，用于编程式导航）
        component: IniConfigEditor, // 映射到INI编辑器组件
        meta: {
            title: '个性化配置编辑器' // 可选：页面标题，可全局拦截设置
        }
    }
    // 可以继续添加更多路由
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router