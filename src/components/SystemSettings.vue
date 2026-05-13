<template>
  <div class="container">
    <!-- 顶部头部 -->
    <div class="header">
      <div class="logo-section">
        <img class="logo" src="../assets/RkCloudLOGO.png" alt="RikkaNas Logo">
        <h1>系统设置</h1>
      </div>
      <div class="user-info">
        <button class="action-btn" @click="goToDesktop">返回桌面</button>
      </div>
    </div>

    <!-- 系统状态概览 - 4列网格 -->
    <div class="stats-grid">
      <div class="stat-card" v-for="stat in stats" :key="stat.label">
        <div class="stat-label">{{ stat.label }}</div>
        <div class="stat-value">{{ stat.value }}</div>
      </div>
    </div>

    <!-- 磁盘空间详情 -->
    <div class="disks-section">
      <h3 class="section-title">磁盘空间</h3>
      <div class="disks-list">
        <div class="disk-row" v-for="disk in disks" :key="disk.mount">
          <div class="disk-info-left">
            <span class="disk-mount">{{ disk.mount }}</span>
            <span class="disk-type">{{ disk.type }}</span>
          </div>
          <div class="disk-info-right">
            <div class="disk-bar-container">
              <div class="disk-bar" :style="{ width: disk.useValue + '%' }"></div>
            </div>
            <div class="disk-stats">
              <span class="disk-stat">已用: {{ disk.used }}</span>
              <span class="disk-stat">剩余: {{ disk.available }}</span>
              <span class="disk-stat">总计: {{ disk.size }}</span>
              <span class="disk-percent">{{ disk.usePercent }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 下面内容两列横向布局 -->
    <div class="content-grid">
      <!-- 左列 -->
      <div class="content-left">
        <!-- 系统信息 -->
        <div class="info-section">
          <h3 class="section-title">系统信息</h3>
          <div class="settings-list">
            <div class="setting-item">
              <div class="setting-label">
                <span>设备IP</span>
              </div>
              <div class="setting-control">
                <input
                  v-model="deviceIp"
                  type="text"
                  class="edit-input"
                  placeholder="输入IP地址"
                />
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span>操作系统</span>
              </div>
              <div class="setting-control">
                <span class="value-text">{{ systemDetails.osName || '加载中...' }}</span>
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span>系统类型</span>
              </div>
              <div class="setting-control">
                <span class="value-text">{{ systemDetails.osType || '加载中...' }}</span>
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span>系统版本</span>
              </div>
              <div class="setting-control">
                <span class="value-text">{{ systemDetails.osVersion || '加载中...' }}</span>
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span>处理器</span>
              </div>
              <div class="setting-control">
                <span class="value-text">{{ systemDetails.cpuModel || '加载中...' }}</span>
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span>核心/线程</span>
              </div>
              <div class="setting-control">
                <span class="value-text">{{ systemDetails.cpuCores ? systemDetails.cpuCores + ' 核心' : '加载中...' }}</span>
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span>主机名</span>
              </div>
              <div class="setting-control">
                <span class="value-text">{{ systemDetails.hostname || '加载中...' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 管理员菜单 -->
        <div class="settings-section-wrapper">
          <h3 class="section-title">管理员中心</h3>
          <div class="setting-item">
            <div class="setting-label">
              <span>账户管理</span>
            </div>
            <div class="setting-control">
              <button class="admin-btn-inside" @click="goToUserAdmin">
                进入管理
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右列 -->
      <div class="content-right">
        <!-- 动态设置列表 -->
        <div class="settings-section-wrapper">
          <h3 class="section-title">系统配置</h3>
          <div v-for="(sectionData, sectionName) in configStore.iniData" :key="sectionName" class="settings-subsection">
            <h4 class="subsection-title">{{ sectionName }}</h4>
            <div v-for="(value, key) in sectionData" :key="key" class="setting-item">
              <div class="setting-label">
                <span>{{ getLabelForKey(key) }}</span>
              </div>
              <div class="setting-control">
                <input
                  v-if="isEditableKey(key)"
                  type="text"
                  :value="value"
                  @blur="updateValue(sectionName, key, $event)"
                  class="edit-input"
                  placeholder="输入新值"
                />
                <label v-else-if="!isNoSwitchKey(key)" class="switch">
                  <input
                    type="checkbox"
                    :checked="isOn(value)"
                    @change="toggleSwitch(sectionName, key, $event)"
                  />
                  <span class="slider"></span>
                </label>
                <span v-else class="value-text">{{ value }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作提示 -->
    <div v-if="message" class="tip info-tip">{{ message }}</div>

    <!-- 重置和导出按钮 -->
    <div class="action-buttons">
      <button @click="resetSettings" class="action-btn reset-btn">重置所有设置</button>
      <button @click="exportSettings" class="action-btn export-btn">导出设置</button>
    </div>

    <AppFooter></AppFooter>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useIniConfigStore } from '@/stores/iniConfigStore';
import { useRouter } from 'vue-router';
import { getLocalIp } from '@/api/fileApi';
import AppFooter from '../components/AppFooter.vue';

const router = useRouter();
const goToDesktop = () => {
  router.push('/');
};
const goToUserAdmin = () => {
  router.push('/user-admin');
};

const configStore = useIniConfigStore();
const message = ref('');
const deviceIp = ref('加载中...');

const stats = ref([
  { value: '加载中...', label: '总存储空间' },
  { value: '加载中...', label: '已使用空间' },
  { value: '加载中...', label: '使用率' },
  { value: '加载中...', label: '系统状态' }
]);

const disks = ref([]);
const systemDetails = ref({});

// 键值显示
const noSwitchKeys = ['app_name', 'version'];
const editableKeys = ['device_name', 'api_key'];

const isNoSwitchKey = (key) => {
  return noSwitchKeys.includes(key);
};

const isEditableKey = (key) => {
  return editableKeys.includes(key);
};

const isOn = (value) => {
  return value === '开' || value === 'true';
};

const getLabelForKey = (key) => {
  const labelMap = {
    theme: '深色模式',
    language: '中文界面',
    enabled: '启用通知',
    app_name: '系统版本',
    version: '版本号',
    device_name: '设备名',
    dark_mode: '深色模式',
    api_key: 'API 密钥',
  };
  return labelMap[key] || key;
};

const updateValue = async (section, key, event) => {
  const newValue = event.target.value.trim();
  if (newValue !== configStore.iniData[section][key]) {
    configStore.updateIniItem(section, key, newValue);
    try {
      await configStore.saveIniConfig();
      if (key === 'api_key') {
        localStorage.setItem('ai_api_key', newValue);
        console.log('保存的密钥值:', newValue);
        console.log('localStorage中的密钥:', localStorage.getItem('ai_api_key'));
        console.log('密钥长度:', newValue.length);
      }
      const label = getLabelForKey(key);
      message.value = `${label} 已更新`;
      setTimeout(() => message.value = '', 3000);
    } catch (error) {
      message.value = `保存失败: ${error.message}`;
      setTimeout(() => message.value = '', 3000);
    }
  }
};

const toggleSwitch = async (section, key, event) => {
  const newValue = event.target.checked ? '开' : '关';
  configStore.updateIniItem(section, key, newValue);
  try {
    await configStore.saveIniConfig();
    const label = getLabelForKey(key);
    message.value = `${label} 已 ${newValue}`;
    setTimeout(() => message.value = '', 3000);
  } catch (error) {
    message.value = `保存失败: ${error.message}`;
    setTimeout(() => message.value = '', 3000);
  }
};

const resetSettings = async () => {
  configStore.iniData = {
    Appearance: { theme: '关' },
    Language: { language: '开' },
    Notifications: { enabled: '开' },
  };
  try {
    await configStore.saveIniConfig();
    message.value = '设置已重置并保存';
    setTimeout(() => message.value = '', 3000);
  } catch (error) {
    message.value = `重置失败: ${error.message}`;
    setTimeout(() => message.value = '', 3000);
  }
};

const exportSettings = () => {
  const settings = configStore.iniData;
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'system-settings.json';
  a.click();
  URL.revokeObjectURL(url);
  message.value = '设置已导出';
  setTimeout(() => message.value = '', 3000);
};

const fetchDeviceIp = async () => {
  try {
    const response = await getLocalIp();
    if (response.data.code === 200) {
      deviceIp.value = response.data.data.ip;
    } else {
      deviceIp.value = '获取失败';
    }
  } catch (error) {
    deviceIp.value = '获取失败';
  }
};

// 获取后端URL
const getBackendUrl = () => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:3000`;
};

const fetchSystemStats = async () => {
  try {
    const response = await fetch(`${getBackendUrl()}/api/system/stats`);
    const result = await response.json();
    if (result.code === 200) {
      stats.value = result.data;
      disks.value = result.disks || [];
      systemDetails.value = result.details || {};
    }
  } catch (error) {
    console.error('获取系统信息失败:', error);
  }
};

onMounted(async () => {
  try {
    await configStore.fetchIniConfig();
    const savedApiKey = localStorage.getItem('ai_api_key');
    if (savedApiKey) {
      configStore.updateIniItem('DEFAULT', 'api_key', savedApiKey);
    } else if (configStore.iniData.DEFAULT?.api_key) {
      localStorage.setItem('ai_api_key', configStore.iniData.DEFAULT.api_key);
    }
    await fetchDeviceIp();
    await fetchSystemStats();
  } catch (error) {
    message.value = `加载配置失败: ${error.message}`;
    setTimeout(() => message.value = '', 3000);
  }
});
</script>

<style scoped>
/* 全局容器样式 */
.container {
  max-width: 1600px;
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

/* 系统状态 4列网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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

/* 分区标题 */
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #40007a;
}

/* 内容两列网格 */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 20px;
  margin-bottom: 20px;
}

.content-left,
.content-right {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 磁盘空间 */
.disks-section {
  margin-bottom: 30px;
}

.disks-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.disk-row {
  background: #ffffff;
  padding: 20px;
  border-radius: 15px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 20px;
}

.disk-row:hover {
  border-color: #40007a;
  transform: translateY(-2px);
}

.disk-info-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 120px;
}

.disk-mount {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.disk-type {
  font-size: 12px;
  color: #999;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
}

.disk-info-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.disk-bar-container {
  width: 100%;
  height: 10px;
  background: #f0f0f0;
  border-radius: 5px;
  overflow: hidden;
}

.disk-bar {
  height: 100%;
  background: linear-gradient(90deg, #40007a, #6800c1);
  border-radius: 5px;
  transition: width 0.3s ease;
}

.disk-stats {
  display: flex;
  justify-content: flex-end;
  gap: 20px;
  font-size: 13px;
  color: #666;
}

.disk-stat {
  color: #666;
}

.disk-percent {
  font-weight: 600;
  color: #40007a;
  font-size: 14px;
}

/* 信息区域 */
.info-section,
.settings-section-wrapper {
  background: #ffffff;
  border-radius: 15px;
  border: 1px solid #e0e0e0;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.settings-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item:hover {
  background: #f9f9f9;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.setting-label span {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.setting-control {
  display: flex;
  align-items: center;
}

/* 开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input:checked + .slider {
  background-color: #40007a;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

/* 输入框样式 */
.edit-input {
  padding: 8px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  width: 200px;
}

.edit-input:focus {
  border-color: #40007a;
}

.value-text {
  color: #666;
  font-size: 14px;
}

/* 子分区 */
.settings-subsection {
  margin-bottom: 20px;
}

.settings-subsection:last-child {
  margin-bottom: 0;
}

.subsection-title {
  font-size: 14px;
  font-weight: 600;
  color: #666;
  margin: 0 0 12px 0;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 8px;
}

/* 账户管理按钮 */
.admin-btn-inside {
  padding: 8px 16px;
  background: #40007a;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.admin-btn-inside:hover {
  background: #6800c1;
  transform: translateY(-1px);
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 20px;
}

.action-btn {
  padding: 12px 28px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.reset-btn {
  background: #fff;
  color: #e74c3c;
  border: 1px solid #e74c3c;
}

.reset-btn:hover {
  background: #e74c3c;
  color: #fff;
}

.export-btn {
  background: #40007a;
  color: #fff;
}

.export-btn:hover {
  background: #6800c1;
  transform: translateY(-1px);
}

/* 提示 */
.tip {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
  font-weight: 500;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.info-tip {
  background: #e8eaf6;
  color: #40007a;
  border-left: 4px solid #40007a;
}

/* 响应式适配 */
@media (max-width: 1200px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .content-grid { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .container { padding: 15px; max-width: 100%; }
  .header { flex-direction: column; gap: 16px; text-align: center; }
  .stats-grid { grid-template-columns: 1fr; }
  .disk-row { flex-direction: column; align-items: flex-start; gap: 12px; }
  .disk-info-left { min-width: auto; }
  .disk-info-right { width: 100%; }
  .disk-stats { justify-content: space-between; flex-wrap: wrap; gap: 8px; }
  .edit-input { width: 150px; }
  .action-buttons { flex-direction: column; }
}
</style>