<template>
  <div class="container">
    <!-- 顶部头部 -->
    <div class="header">
      <div class="logo-section">
        <img class="logo" src="../assets/logo.svg" alt="RikkaNas Logo">
        <h1>RikkaNas 控制面板</h1>
      </div>
      <div class="user-info">
<!--        <div class="user-avatar">{{ userInitial }}</div>-->
        <span>{{ userName }}</span>
        <button class="action-btn logout-btn" @click="handleLogout">登出</button>
      </div>
    </div>

    <!-- 系统状态概览 -->
    <div class="stats-grid">
      <div class="stat-card" v-for="stat in stats" :key="stat.label">
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
      </div>
    </div>

    <!-- 功能菜单 -->
    <div class="dashboard">
      <div class="card" v-for="item in menuItems" :key="item.id" @click="navigateTo(item.route)">
        <div class="card-header">
          <div class="card-icon">{{ item.icon }}</div>
          <h2 class="card-title">{{ item.title }}</h2>
        </div>
        <div class="card-content">
          <p>{{ item.description }}</p>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions">
      <button class="action-btn" v-for="action in quickActions" :key="action.id" @click="quickAction(action.id)">
        {{ action.icon }} {{ action.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
import axios from 'axios';
import {ref, computed, onMounted} from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const userName = ref(''); // 初始化为空字符串，而不是'管理员'

const fetchAdminInfo = async () => {
  try {
    const response = await axios.get('http://localhost:3000/api/admin/info');
    // 假设 API 返回的数据结构是 { name: '实际管理员用户名' }
    userName.value = response.data.name;
  } catch (error) {
    console.error('获取管理员信息失败:', error);
    // 可以在这里设置一个默认值或者处理错误
    userName.value = 'Guest';
  }
  return userName.value;
};
onMounted(() => {
  fetchAdminInfo();
});
// 用户头像首字母
const userInitial = computed(() => userName.value.charAt(0))

// 系统统计数据
const stats = ref([
  { value: '2.5TB', label: '总存储空间' },
  { value: '1.2TB', label: '已使用空间' },
  { value: '48%', label: '使用率' },
  { value: '在线', label: '系统状态' }
])

// 菜单项配置（可扩展）
const menuItems = ref([
  { id: 1, icon: '📁', title: '文件管理', route: '/file-manager', description: '浏览、上传、下载和管理您的文件' },
  { id: 2, icon: '⚙️', title: '系统设置', route: '/settings', description: '配置系统参数和网络设置' },
  { id: 3, icon: '💾', title: '硬盘管理', route: '/storage', description: '查看硬盘健康状态和RAID配置' },
  { id: 4, icon: '🖥️', title: '设备信息', route: '/device-info', description: '查看硬件信息和系统状态' },
  { id: 5, icon: '📦', title: '备份与同步', route: '/backup', description: '设置自动备份任务和云同步' },
  { id: 6, icon: '📱', title: '应用中心', route: '/apps', description: '安装和管理NAS应用程序' },
  { id: 7, icon: '🐟', title: 'Docker管理', route: '/docker', description: '安装和管理Docker镜像' }
])

// 快捷操作
const quickActions = ref([
  { id: 'upload', icon: '📤', label: '快速上传' },
  { id: 'backup', icon: '📦', label: '立即备份' },
  { id: 'scan', icon: '🔍', label: '病毒扫描' },
  { id: 'refresh', icon: '🔄', label: '刷新状态' }
])

// 导航方法
const navigateTo = (route) => {
  router.push(route)
}

// 快捷操作方法
const quickAction = (action) => {
  const actions = {
    upload: () => alert('开始快速上传...'),
    backup: () => alert('启动立即备份...'),
    scan: () => alert('开始病毒扫描...'),
    refresh: () => location.reload()
  }
  actions[action]?.()
}

// 登出方法
const handleLogout = () => {
  if (confirm('确定要登出吗？')) {
    // 调用登出API，清除token等
    router.push('/login')
  }
}
</script>

<style scoped>
/* Flexbox平铺方案 */

/* 头部居中 */

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30px;
}

/* 功能块横向平铺 */
.dashboard {
  display: grid;
  grid-template-columns: repeat(3, 2fr);
  gap: 10px;
}

/* 响应式 */
@media (max-width: 1200px) {
  .dashboard { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 900px) {
  .dashboard { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .dashboard { grid-template-columns: 1fr; }
}
/* 基础圆角样式 */
.container {
  padding-left: 30px;
  border-radius: 15px;
}

.header {
  text-align: center;
  display: grid;
  flex-direction: column;
  align-items: center;
  padding-left: 30px;
  border-radius: 15px;
  border: 1px solid #e0e0e0;
}

.card {
  border-radius: 15px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  padding-left: 30px !important;
}

.stat-card {
  padding-left: 30px;
  border-radius: 15px;
  border: 1px solid #e0e0e0;
}

.action-btn {
  border-radius: 15px;
  border: 1px solid #40007a;
}

.user-avatar {
  border-radius: 50%;
  border: 1px solid #e0e0e0;
}



/* 悬停效果 */
.card:hover {
  border-color: #40007a;
  transform: translateY(-3px);
}


</style>