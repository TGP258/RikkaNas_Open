<template>
  <div class="container">
    <div class="header">
      <img class="logo" src="../assets/RkCloudLOGO.png" alt="RikkaNas Logo" width="80" height="80">
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
              <span>{{ getLabelForKey(key) }}</span> <!-- 用户友好标签 -->
            </div>
            <div class="setting-control">
              <!-- 如果key是可编辑的，显示输入框 -->
              <input
                  v-if="isEditableKey(key)"
                  type="text"
                  :value="value"
                  @blur="updateValue(sectionName, key, $event)"
                  class="edit-input"
                  placeholder="输入新值"
              />
              <!-- 否则，如果key不在排除列表中，显示开关 -->
              <label v-else-if="!isNoSwitchKey(key)" class="switch">
                <input
                    type="checkbox"
                    :checked="isOn(value)"
                    @change="toggleSwitch(sectionName, key, $event)"
                />
                <span class="slider"></span>
              </label>
              <!-- 否则显示值文本 -->
              <span v-else class="value-text">{{ value }}</span>
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

// 获取INI配置Store
const configStore = useIniConfigStore();

const message = ref('');

// 不显示开关的key列表（自定义）
const noSwitchKeys = ['app_name', 'version']; // 示例：这些key不显示开关，只显示值

// 可直接编辑的key列表（自定义）
const editableKeys = ['device_name']; // 示例：这些key显示输入框，可直接编辑

// 判断是否为不显示开关的key
const isNoSwitchKey = (key) => {
  return noSwitchKeys.includes(key);
};

// 判断是否为可编辑的key
const isEditableKey = (key) => {
  return editableKeys.includes(key);
};

// 判断值是否为“开”（开关状态）
const isOn = (value) => {
  return value === '开' || value === 'true'; // 支持旧格式兼容
};

// 获取用户友好标签（映射INI键为中文）
const getLabelForKey = (key) => {
  const labelMap = {
    theme: '深色模式',
    language: '中文界面',
    enabled: '启用通知',
    app_name: '系统版本',
    version: '版本号',
    device_name:'设备名',
    dark_mode:'深色模式',
    // 添加更多映射
  };
  return labelMap[key] || key; // 默认使用原键
};

// 更新值（输入框失去焦点时）
const updateValue = async (section, key, event) => {
  const newValue = event.target.value.trim();
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

// 切换开关（保存为“开”/“关”）
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

// 重置设置（重置为默认，所有为“关”或指定）
const resetSettings = async () => {
  configStore.iniData = {
    Appearance: { theme: '关' }, // 深色模式关
    Language: { language: '开' }, // 中文界面开
    Notifications: { enabled: '开' }, // 通知开
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

// 导出设置
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

// 组件挂载时读取INI配置
onMounted(async () => {
  try {
    await configStore.fetchIniConfig();
  } catch (error) {
    message.value = `加载配置失败: ${error.message}`;
    setTimeout(() => message.value = '', 3000);
  }
});
</script>
<style scoped>
/* 基于Login.vue的风格 */
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

/* 拨杆开关样式 */
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

/* 样式与之前相同，添加.edit-input样式 */
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

/* 其余样式不变 */
</style>