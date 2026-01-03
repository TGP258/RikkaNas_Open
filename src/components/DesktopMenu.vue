<template>
  <div class="menu-container">
    <!-- 遍历菜单列表，生成导航菜单 -->
    <div v-for="item in menuItems" :key="item.id" class="menu-item">
      <!-- 绑定router-link的to属性为item.route，实现跳转 -->
      <router-link :to="item.route" class="menu-link">
        <!-- 菜单图标 -->
        <span class="menu-icon">{{ item.icon }}</span>
        <!-- 菜单内容 -->
        <div class="menu-content">
          <h3 class="menu-title">{{ item.title }}</h3>
          <p class="menu-desc">{{ item.description }}</p>
        </div>
      </router-link>
    </div>
  </div>

</template>

<script setup>
import { ref } from 'vue';

// 主页菜单数据
const menuItems = ref([
  { id: 1, icon: '📁', title: '文件管理', route: '/file-manager', description: '浏览、上传、下载和管理您的文件' },
  { id: 2, icon: '⚙️', title: '系统设置', route: '/ini-editor', description: '配置系统参数和网络设置' },
  { id: 3, icon: '💾', title: '硬盘管理', route: '/storage', description: '查看硬盘健康状态和RAID配置' },
  { id: 4, icon: '🖥️', title: '设备信息', route: '/device-info', description: '查看硬件信息和系统状态' },
  { id: 5, icon: '📦', title: '备份与同步', route: '/backup', description: '设置自动备份任务和云同步' },
  { id: 6, icon: '📱', title: '应用中心', route: '/apps', description: '安装和管理NAS应用程序' },
  { id: 7, icon: '🐟', title: 'Docker管理', route: '/docker', description: '安装和管理Docker镜像' }
]);

</script>

<style scoped>
.menu-container {
  width: 280px;
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 10px;
}

.menu-item {
  margin-bottom: 8px;
  border-radius: 6px;
  overflow: hidden;
}

/* 菜单链接样式（去除默认a标签样式） */
.menu-link {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  text-decoration: none;
  color: #333;
  transition: background-color 0.2s;
  width: 100%;
  box-sizing: border-box;
}

/*  hover高亮效果 */
.menu-link:hover {
  background-color: #e9ecef;
}

/* 匹配当前路由时的激活样式（router-link自动添加的类） */
.menu-link.router-link-active {
  background-color: #0d6efd;
  color: white;
}

.menu-icon {
  font-size: 20px;
  margin-right: 12px;
}

.menu-content {
  flex: 1;
}

.menu-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.menu-desc {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #6c757d;
}
</style>