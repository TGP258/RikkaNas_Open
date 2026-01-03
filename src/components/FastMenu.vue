<template>
  <!-- 快捷操作容器（可自定义样式，与菜单样式区分或复用） -->
  <div class="quick-actions-container">
    <!-- 遍历快捷操作列表，生成导航/普通操作 -->
    <div v-for="action in quickActions" :key="action.id" class="quick-action-item">
      <!-- 有 route 属性时，使用 router-link 实现跳转（与菜单逻辑一致） -->
      <router-link
          v-if="action.route"
          :to="action.route"
          class="quick-action-link"
      >
        <span class="quick-action-icon">{{ action.icon }}</span>
        <span class="quick-action-label">{{ action.label }}</span>
      </router-link>

      <!-- 无 route 属性时，显示普通元素（可绑定点击事件，不跳转） -->
      <div
          v-else
          class="quick-action-btn"
          @click="handleQuickActionClick(action.id)"
      >
      <span class="quick-action-icon">{{ action.icon }}</span>
      <span class="quick-action-label">{{ action.label }}</span>
    </div>
  </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// 主页快捷操作数据
const quickActions = ref([
  { id: 'uploader', icon: '📤', label: '快速上传', route: '/fileuploader' },
  { id: 'backup', icon: '📦', label: '立即备份' },
  { id: 'scan', icon: '🔍', label: '病毒扫描' },
  { id: 'refresh', icon: '🔄', label: '刷新状态' }
]);

/**
 * 无路由的快捷操作点击事件（可选，根据业务需求编写逻辑）
 * @param {string} actionId 快捷操作ID
 */
const handleQuickActionClick = (actionId) => {
  switch (actionId) {
    case 'backup':
      alert('执行立即备份操作');
      // 添加实际的备份业务逻辑
      break;
    case 'scan':
      alert('执行病毒扫描操作');
      // 添加实际的病毒扫描业务逻辑
      break;
    case 'refresh':
      alert('执行刷新状态操作');
      // 添加实际的刷新状态业务逻辑
      break;
    default:
      break;
  }
};
</script>

<style scoped>
/* 快捷操作容器样式 */
.quick-actions-container {
  display: flex;
  gap: 12px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  flex-wrap: wrap; /* 自动换行，适配多元素 */
}

/* 单个快捷操作项样式 */
.quick-action-item {
  border-radius: 6px;
  overflow: hidden;
}

/* 有路由的快捷操作链接样式（复用菜单链接逻辑，去除默认a标签样式） */
.quick-action-link {
  display: flex;
  flex-direction: column; /* 图标在上，文字在下（可改为row横向排列） */
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  text-decoration: none;
  color: #333;
  transition: background-color 0.2s;
  min-width: 80px;
}

/*  hover 高亮效果 */
.quick-action-link:hover {
  background-color: #e9ecef;
}

/* 匹配当前路由时的激活样式（router-link自动添加的类） */
.quick-action-link.router-link-active {
  background-color: #0d6efd;
  color: white;
}

/* 无路由的快捷操作按钮样式 */
.quick-action-btn {
  display: flex;
  flex-direction: column; /* 图标在上，文字在下（可改为row横向排列） */
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  color: #333;
  cursor: pointer;
  transition: background-color 0.2s;
  min-width: 80px;
}

.quick-action-btn:hover {
  background-color: #e9ecef;
}

/* 图标样式 */
.quick-action-icon {
  font-size: 20px;
  margin-bottom: 6px; /* 纵向排列时，图标与文字的间距 */
  /* 横向排列时，注释上面的margin，添加：margin-right: 8px; */
}

/* 文字标签样式 */
.quick-action-label {
  font-size: 12px;
  text-align: center;
}
</style>