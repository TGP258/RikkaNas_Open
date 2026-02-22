<script setup>
defineProps({
  msg: {
    type: String,
    required: true,
  },
})
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import HelloWorld from '../components/HelloWorld.vue'
import TheWelcome from '../components/TheWelcome.vue'
import axios from 'axios'

// 1. 获取路由实例（用于跳转）
const router = useRouter()

// 2. 核心逻辑：检查是否有已注册用户，决定是否跳转
const checkUserStatus = async () => {
  try {
    // 调用后端新增的检查接口
    const res = await axios.get('http://localhost:3000/api/check-has-users')

    // 如果已有用户（不是新用户），跳转到注册页
    if (res.data.success && res.data.hasUsers) {
      router.push('/login') // 这里的 /register 是你注册页的路由路径，需和实际一致
    }
    // 如果无用户，正常显示欢迎页（无需操作）
  } catch (error) {
    console.error('检查用户状态失败：', error)
    // 接口请求失败时，默认跳转到注册页（兜底逻辑）
    router.push('/login')
  }
}

// 3. 页面挂载时执行检查逻辑
onMounted(() => {
  checkUserStatus()
})
</script>

<template>
  <div class="greetings">
    <h1 class="purple">{{ msg }}</h1>
    <h3>
      基于
      <a href="https://www.nodejs.org/" target="_blank" rel="noopener">Node.js</a>
<!--      <a href="https://www.docker.com/" target="_blank" rel="noopener">Docker</a>.-->
      的个人文件本地存储系统
    </h3>
  </div>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  position: relative;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
}

.greetings h1,
.greetings h3 {
  text-align: center;
}

@media (min-width: 1024px) {
  .greetings h1,
  .greetings h3 {
    text-align: left;
  }
}
</style>
