<template>
  <div class="container">
    <div class="header">
      <img class="logo" src="../assets/RkCloudLOGO2.png" alt="RikkaNas Logo" width="80" height="80">
      <h1>系统设置</h1>
      <p>个性化配置</p>
    </div>

    <div class="settings-container">
      <!-- 加载/错误提示 -->
      <div v-if="configStore.isLoading" class="tip loading-tip">正在读取配置...</div>
      <div v-if="configStore.errorMsg" class="tip error-tip">{{ configStore.errorMsg }}</div>

      <!-- 动态设置列表 -->
      <div class="settings-list">
        <div v-for="(sectionData, sectionName) in configStore.iniData" :key="sectionName" class="settings-section">
          <h3>{{ sectionName }}</h3>
          <div v-for="(value, key) in sectionData" :key="key" class="setting-item">
            <div class="setting-label">
              <span>{{ getLabelForKey(key) }}</span>
            </div>
            <div class="setting-control">
              <input
                  v-if="isEditableKey(key)"
                  type="text"
                  :value="key === 'device_ip' ? deviceIp : value"
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

        <!-- 系统信息 -->
        <div class="settings-section">
          <h3>系统信息</h3>
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
        </div>

        <!-- 管理员菜单 - 账户管理  -->
        <div class="settings-section">
          <h3>管理员中心</h3>
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

      <!-- 操作提示 -->
      <div v-if="message" class="tip info-tip">{{ message }}</div>

      <!-- 重置和导出按钮 -->
      <div class="action-buttons">
        <button @click="resetSettings" class="reset-btn">重置所有设置</button>
        <button @click="exportSettings" class="export-btn">导出设置</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useIniConfigStore } from '@/stores/iniConfigStore';
import { useRouter } from 'vue-router'
import { getLocalIp } from '@/api/fileApi'

// 路由
const router = useRouter()
const goToUserAdmin = () => {
  router.push('/user-admin')
}

// 获取INI配置Store
const configStore = useIniConfigStore();

const message = ref('');
const deviceIp = ref('');

// 键值显示
const noSwitchKeys = ['app_name', 'version'];
const editableKeys = ['device_name', 'device_ip'];

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
    device_name:'设备名',
    device_ip: '设备IP',
    dark_mode:'深色模式',
  };
  return labelMap[key] || key;
};

const updateValue = async (section, key, event) => {
  const newValue = event.target.value.trim();
  if (key === 'device_ip') {
    deviceIp.value = newValue;
    message.value = `设备IP 已更新为 ${newValue}`;
    setTimeout(() => message.value = '', 3000);
    return;
  }
  if (newValue !== configStore.iniData[section][key]) {
    configStore.updateIniItem(section, key, newValue);
    try {
      await configStore.saveIniConfig();
      const label = getLabelForKey(key);
      message.value = `${label} 已更新为 ${newValue}`;
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

onMounted(async () => {
  try {
    await configStore.fetchIniConfig();
    await fetchDeviceIp();
  } catch (error) {
    message.value = `加载配置失败: ${error.message}`;
    setTimeout(() => message.value = '', 3000);
  }
});
</script>

<style scoped>
.container {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 500px;
  overflow: hidden;
  margin: 20px auto;
}

.header {
  background: #40007a;
  color: white;
  padding: 25px;
  text-align: center;
}

.header h1 {
  font-size: 1.8rem;
  margin-bottom: 5px;
}

.header p {
  font-size: 1rem;
  margin: 0;
}

.logo {
  width: 80px;
  height: 80px;
  margin-bottom: 15px;
}

.settings-container {
  padding: 30px;
}

.settings-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.settings-section {
  border-bottom: 1px solid #E0E0E0;
}

.settings-section:last-child {
  border-bottom: none;
}

.settings-section h3 {
  background: #F5F5F5;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  padding: 12px 16px;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #F0F0F0;
  transition: background-color 0.2s;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item:hover {
  background: #F9F9F9;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.setting-label .material-icons {
  color: #666;
  font-size: 20px;
}

.setting-label span:last-child {
  font-size: 16px;
  font-weight: 400;
}

.setting-control {
  display: flex;
  align-items: center;
}

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
  background-color: #CCC;
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

.action-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.reset-btn {
  background: #F44336;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.reset-btn:hover {
  background: #D32F2F;
  transform: translateY(-2px);
}

.export-btn {
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.export-btn:hover {
  background: #45A049;
  transform: translateY(-2px);
}

.material-icons {
  font-size: 20px;
}

.tip {
  padding: 12px;
  border-radius: 8px;
  margin-top: 16px;
  text-align: center;
  font-weight: 400;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.loading-tip {
  background: #E8EAF6;
  color: #40007a;
  border-left: 4px solid #40007a;
}

.error-tip {
  background: #FFEBEE;
  color: #D32F2F;
  border-left: 4px solid #D32F2F;
}

.info-tip {
  background: #E8EAF6;
  color: #40007a;
  border-left: 4px solid #40007a;
}

@media (max-width: 480px) {
  .container {
    border-radius: 15px;
    margin: 10px;
  }
  .settings-container {
    padding: 20px;
  }
  .header {
    padding: 20px;
  }
  .header h1 {
    font-size: 1.5rem;
  }
}

.edit-input {
  padding: 8px 12px;
  border: 2px solid #E0E0E0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.edit-input:focus {
  border-color: #40007a;
}

/*  账户管理按钮*/
.admin-btn-inside {
  padding: 6px 14px;
  background: #40007a;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}
.admin-btn-inside:hover {
  background: #6800c1;
}
</style>