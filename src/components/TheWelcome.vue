<template>
  <!-- 在您的template中添加这个按钮 -->
  <button class="next-page-btn" @click="goToNextPage">
    下一步 →
  </button>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'

const router = useRouter()

// 检查路由对象是否可用（在组件挂载时执行）
onMounted(() => {
  if (router) {
    console.log('路由对象可用:', router)
  } else {
    console.error('路由对象不可用')
  }
})

// 跳转方法
const goToNextPage = () => {
  console.log('按钮被点击了')

  // 使用命名路由（推荐）
  router.push({ name: 'Login' })

  // 或者使用路径跳转（确保路由配置中的路径正确）
  // router.push('/next-page')
}
</script>

<style scoped>
/* 您的样式保持不变 */
.next-page-btn {
  position: fixed;
  right: 20px;
  bottom: 20px;
  padding: 12px 24px;
  background: #40007a;
  color: white;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
  transition: all 0.3s ease;
  z-index: 1000;
}

.next-page-btn:hover {
  background: #6800c1;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(52, 152, 219, 0.4);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .next-page-btn {
    place-items: center;
    right: 10px;
    bottom: 10px;
    padding: 10px 20px;
    font-size: 14px;
  }
}
</style>