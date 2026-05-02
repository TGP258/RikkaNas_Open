<template>
  <div class="container">
    <!-- 顶部头部 -->
    <div class="header">
      <div class="logo-section">
        <img class="logo" src="../assets/RkCloudLOGO.png" alt="RikkaNas Logo">
        <h1>RkCloud控制面板</h1>
      </div>
      <div class="user-info">
        <span>{{ userName }}</span>
        <button class="action-btn logout-btn" @click="handleLogout">登出</button>
      </div>
    </div>

    <!-- 系统状态概览 - 2x2网格 -->
    <div class="stats-grid">
      <div class="stat-card" v-for="stat in stats" :key="stat.label">
        <div class="stat-label">{{ stat.label }}</div>
        <div class="stat-value">{{ stat.value }}</div>
      </div>
    </div>

    <!-- 功能菜单 -->
    <div class="dashboard">
      <div class="card" v-for="item in menuItems" :key="item.id" @click="navigateTo(item.route)">
        <div class="card-header">
          <div class="card-icon">{{ item.iconText }}</div>
          <h2 class="card-title">{{ item.title }}</h2>
        </div>
        <div class="card-content">
          <p>{{ item.description }}</p>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
<!--    <div class="quick-actions">-->
<!--      <button class="action-btn" v-for="action in quickActions" :key="action.id" @click="quickAction(action.id)">-->
<!--        {{ action.iconText }} {{ action.label }}-->
<!--      </button>-->
<!--    </div>-->
    <AppFooter></AppFooter>
  </div>
</template>

<script setup>
import axios from 'axios';
import {ref, computed, onMounted} from 'vue'
import { useRouter } from 'vue-router'
import AppFooter from '../components/AppFooter.vue';

const router = useRouter()
const userName = ref('');

const fetchAdminInfo = async () => {
  try {
    const response = await axios.get('http://localhost:3000/api/admin/info');
    userName.value = response.data.name;
  } catch (error) {
    console.error('获取管理员信息失败:', error);
    userName.value = 'User';
  }
  return userName.value;
};

onMounted(() => {
  fetchAdminInfo();
});

// 系统统计数据
const stats = ref([
  { value: '加载中...', label: '总存储空间' },
  { value: '加载中...', label: '已使用空间' },
  { value: '加载中...', label: '使用率' },
  { value: '加载中...', label: '系统状态' }
]);

// 菜单项配置
const menuItems = ref([
  { id: 1, iconText: '文件', title: '文件管理', route: '/file-manager', description: '浏览、上传、下载和管理您的文件' },
  { id: 2, iconText: '设置', title: '系统设置', route: '/settings', description: '配置系统参数和网络设置' },
  { id: 4, iconText: '设备', title: '设备信息', route: '/device-info', description: '查看硬件信息和系统状态' },
  { id: 6, iconText: 'AI', title: 'AI查询', route: '/ai-search', description: '智能查询文件' },
  { id: 7, iconText: '个人', title: '个人中心', route: '/personal', description: '管理个人信息' }
])


// 导航方法
const navigateTo = (route) => {
  router.push(route)
}



// 登出方法
const handleLogout = () => {
  if (confirm('确定要登出吗？')) {
    router.push('/login')
  }
}

onMounted(async () => {
  try {
    const response = await axios.get('/api/system/stats');
    if (response.data.code === 200) {
      stats.value = response.data.data;
    }
  } catch (error) {
    console.error('调用系统信息接口失败：', error);
    stats.value = [
      { value: '获取失败', label: '总存储空间' },
      { value: '获取失败', label: '已使用空间' },
      { value: '获取失败', label: '使用率' },
      { value: '异常', label: '系统状态' }
    ];
  }
});
</script>

<style scoped>
/* 全局容器样式 */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 30px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
}

/* 头部样式 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  margin-bottom: 30px;
  border-bottom: 1px solid #f0f0f0;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo-section img {
  width: 64px;
  height: 64px;
  object-fit: contain;
}

.logo-section h1 {
  font-size: 1.8rem;
  color: #333;
  margin: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info span {
  font-size: 14px;
  color: #666;
}

/* 系统状态 2x2 网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr); /* 固定2列，实现2x2布局 */
  gap: 16px;
  margin-bottom: 30px;
}

.stat-card {
  background: #ffffff;
  padding: 24px;
  border-radius: 15px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: #40007a;
  transform: translateY(-2px);
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 20px;
  font-weight: 500;
  color: #40007a;
}

/* 功能菜单网格 */
.dashboard {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 30px;
}

/* 功能卡片样式 */
.card {
  background: #ffffff;
  border-radius: 15px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.card:hover {
  border-color: #40007a;
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.card-icon {
  width: 32px;
  height: 32px;
  background: #f0e8ff;
  color: #40007a;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
}

.card-title {
  font-size: 16px;
  color: #333;
  margin: 0;
}

.card-content p {
  font-size: 13px;
  color: #999;
  margin: 0;
  line-height: 1.5;
}

/* 快捷操作 */
.quick-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 30px;
}

.action-btn {
  padding: 10px 20px;
  background: #ffffff;
  color: #40007a;
  border-radius: 15px;
  border: 1px solid #40007a;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.action-btn:hover {
  background: #40007a;
  color: #ffffff;
}

.logout-btn {
  background: #40007a;
  color: #ffffff;
}

.logout-btn:hover {
  background: #6800c1;
}

/* 响应式适配 */
@media (max-width: 1200px) {
  .dashboard { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .header { flex-direction: column; gap: 16px; text-align: center; }
  .stats-grid { grid-template-columns: 1fr; } /* 小屏改为1列 */
  .dashboard { grid-template-columns: 1fr; }
  .quick-actions { justify-content: center; }
}
</style>