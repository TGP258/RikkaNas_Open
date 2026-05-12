<template>
  <div class="ini-editor-container">
    <h2>系统设置</h2>

    <div v-if="configStore.isLoading" class="tip loading-tip">正在读取配置...</div>
    <div v-if="configStore.errorMsg" class="tip error-tip">{{ configStore.errorMsg }}</div>

    <div class="edit-area">
      <button @click="addNewSection" class="btn add-section-btn">+ 新增分组</button>

      <div v-for="(section, sectionKey) in configStore.iniData" :key="sectionKey" class="section-card">
        <div class="section-header">
          <input
              :value="sectionKey"
              @blur="handleSectionKeyBlur(sectionKey, $event)"
              class="section-name-input"
              placeholder="请输入分组名"
          />
          <button
              @click="deleteSection(sectionKey)"
              class="btn delete-btn"
              :disabled="Object.keys(configStore.iniData).length <= 1"
          >
            删除分组
          </button>
        </div>

        <div class="key-value-list">
          <div
              v-for="(value, key) in section"
              :key="key"
              class="key-value-item"
          >
            <input
                :value="key"
                @blur="handleKeyValueBlur(sectionKey, key, $event, 'key')"
                class="key-input"
                placeholder="键名"
            />
            <span class="equal-sign">=</span>
            <input
                :value="value"
                @input="handleValueInput(sectionKey, key, $event)"
            class="value-input"
            placeholder="值"
            />
            <button
                @click="deleteKeyValue(sectionKey, key)"
                class="btn delete-kv-btn"
            >
              ×
            </button>
          </div>
        </div>

        <button @click="addNewKeyValue(sectionKey)" class="btn add-kv-btn">+ 新增键值对</button>
      </div>
    </div>

    <div class="action-area">
      <button @click="refreshIniConfig" class="btn refresh-btn">刷新配置（从服务器读取）</button>
      <button @click="saveIniConfig" class="btn save-btn" :disabled="configStore.isLoading">保存配置到服务器</button>
    </div>
  </div>
</template>

<script setup>
import { useIniConfigStore } from '@/stores/iniConfigStore';
import { onMounted } from 'vue';

const configStore = useIniConfigStore();

const handleSectionKeyBlur = (oldSectionKey, e) => {
  const newSectionKey = e.target.value.trim();
  if (!newSectionKey || newSectionKey === oldSectionKey) return;
  if (configStore.iniData[newSectionKey]) {
    alert(`分组名「${newSectionKey}」已存在！`);
    e.target.value = oldSectionKey;
    return;
  }

  configStore.iniData[newSectionKey] = { ...configStore.iniData[oldSectionKey] };
  delete configStore.iniData[oldSectionKey];
};

const handleKeyValueBlur = (sectionKey, oldKey, e, type) => {
  if (type !== 'key') return;
  const newKey = e.target.value.trim();
  const section = configStore.iniData[sectionKey];
  if (!section) return;

  if (!newKey || newKey === oldKey) return;
  if (section[newKey]) {
    alert(`键名「${newKey}」已存在！`);
    e.target.value = oldKey;
    return;
  }

  section[newKey] = section[oldKey];
  delete section[oldKey];
};

const handleValueInput = (sectionKey, key, e) => {
  const newValue = e.target.value.trim();
  configStore.iniData[sectionKey][key] = newValue;
};

const refreshIniConfig = () => {
  configStore.fetchIniConfig();
};

const addNewSection = () => {
  let newSectionName = `NEW_SECTION_${Object.keys(configStore.iniData).length + 1}`;
  while (configStore.iniData[newSectionName]) {
    newSectionName = `NEW_SECTION_${Math.floor(Math.random() * 1000)}`;
  }
  configStore.iniData[newSectionName] = {};
};

const deleteSection = (sectionKey) => {
  if (Object.keys(configStore.iniData).length <= 1) {
    alert('至少保留一个分组！');
    return;
  }
  delete configStore.iniData[sectionKey];
};

const addNewKeyValue = (sectionKey) => {
  const section = configStore.iniData[sectionKey];
  if (!section) return;
  let newKey = `new_key_${Object.keys(section).length + 1}`;
  while (section[newKey]) {
    newKey = `new_key_${Math.floor(Math.random() * 1000)}`;
  }
  section[newKey] = '';
};

const deleteKeyValue = (sectionKey, key) => {
  delete configStore.iniData[sectionKey][key];
};

const saveIniConfig = () => {
  configStore.saveIniConfig();
};

const resetEditor = () => {
  Object.keys(configStore.iniData).forEach(key => delete configStore.iniData[key]);
  configStore.iniData.DEFAULT = {
    app_name: '个性化配置',
    version: '1.0.0',
    theme: 'light',
    language: 'zh-CN'
  };
  alert('编辑器已重置！');
};

onMounted(() => {
  refreshIniConfig();
});
</script>

<style scoped>
.ini-editor-container {
  max-width: 1000px;
  margin: 20px auto;
  padding: 20px;
  font-family: Arial, sans-serif;
  background-color: #f5f5f5;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.tip {
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
  text-align: center;
}

.loading-tip {
  background-color: #e3f2fd;
  color: #1976d2;
}

.error-tip {
  background-color: #ffebee;
  color: #d32f2f;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
  margin-right: 10px;
}

.refresh-btn {
  background-color: #2196f3;
  color: white;
}

.refresh-btn:hover {
  background-color: #1976d2;
}

.save-btn {
  background-color: #42b983;
  color: white;
}

.save-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.save-btn:hover:not(:disabled) {
  background-color: #359469;
}

.edit-area {
  margin-bottom: 30px;
}

.add-section-btn {
  background-color: #2196f3;
  color: white;
  margin-bottom: 20px;
}

.add-section-btn:hover {
  background-color: #1976d2;
}

.section-card {
  background-color: white;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 15px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.section-name-input {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  font-weight: bold;
  width: 200px;
  outline: none;
}

.section-name-input:focus {
  border-color: #2196f3;
}

.delete-btn {
  background-color: #f44336;
  color: white;
}

.delete-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.delete-btn:hover:not(:disabled) {
  background-color: #d32f2f;
}

.key-value-list {
  margin-bottom: 15px;
}

.key-value-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 10px;
}

.key-input, .value-input {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  outline: none;
  font-size: 14px;
}

.key-input {
  width: 150px;
}

.value-input {
  flex: 1;
  min-width: 200px;
}

.key-input:focus, .value-input:focus {
  border-color: #2196f3;
}

.equal-sign {
  font-size: 16px;
  color: #666;
}

.delete-kv-btn {
  background-color: #ff9800;
  color: white;
  padding: 4px 10px;
  font-size: 16px;
  line-height: 1;
  margin-right: 0;
}

.delete-kv-btn:hover {
  background-color: #f57c00;
}

.add-kv-btn {
  background-color: #8bc34a;
  color: white;
  font-size: 12px;
  padding: 6px 12px;
}

.add-kv-btn:hover {
  background-color: #7cb342;
}

.action-area {
  display: flex;
  gap: 10px;
}

.reset-btn {
  background-color: #607d8b;
  color: white;
}

.reset-btn:hover {
  background-color: #546e7a;
}

.ini-editor-container {
  max-width: 1200px;
  margin: 20px auto;
  padding: 24px;
  font-family: 'Roboto', sans-serif;
  background: #F3E5F5;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  color: #333;
}

h2 {
  text-align: center;
  color: #6200EE;
  font-size: 28px;
  font-weight: 500;
  margin-bottom: 16px;
  letter-spacing: 0.5px;
}

.tip {
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
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
  color: #6200EE;
  border-left: 4px solid #6200EE;
}

.error-tip {
  background: #FFEBEE;
  color: #D32F2F;
  border-left: 4px solid #D32F2F;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  margin-right: 8px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.3s, height 0.3s;
}

.btn:hover::before {
  width: 300px;
  height: 300px;
}

.btn:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.refresh-btn {
  background: #6200EE;
  color: white;
}

.refresh-btn::after {
  content: 'refresh';
  font-family: 'Material Icons';
  font-size: 18px;
}

.save-btn {
  background: #BB86FC;
  color: #333;
}

.save-btn::after {
  content: 'save';
  font-family: 'Material Icons';
  font-size: 18px;
}

.save-btn:disabled {
  background: #E0E0E0;
  color: #9E9E9E;
  cursor: not-allowed;
  box-shadow: none;
}

.add-section-btn, .add-kv-btn {
  background: #9C27B0;
  color: white;
}

.add-section-btn::after {
  content: 'add';
  font-family: 'Material Icons';
  font-size: 16px;
}

.add-kv-btn::after {
  content: 'add';
  font-family: 'Material Icons';
  font-size: 14px;
}

.delete-btn, .delete-kv-btn {
  background: #F44336;
  color: white;
}

.delete-btn::after {
  content: 'delete';
  font-family: 'Material Icons';
  font-size: 16px;
}

.delete-btn:disabled {
  background: #E0E0E0;
  cursor: not-allowed;
}

.edit-area {
  margin-bottom: 32px;
}

.section-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #E0E0E0;
  transition: box-shadow 0.2s ease;
}

.section-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #E0E0E0;
}

.section-name-input {
  padding: 12px 16px;
  border: 2px solid #E0E0E0;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  width: 250px;
  outline: none;
  transition: border-color 0.2s ease;
}

.section-name-input:focus {
  border-color: #6200EE;
  box-shadow: 0 0 0 3px rgba(98, 0, 238, 0.1);
}

.key-value-list {
  margin-bottom: 20px;
}

.key-value-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
  padding: 12px;
  background: #FAFAFA;
  border-radius: 8px;
  border: 1px solid #F0F0F0;
}

.key-input, .value-input {
  padding: 12px 16px;
  border: 2px solid #E0E0E0;
  border-radius: 8px;
  outline: none;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.key-input {
  width: 160px;
}

.value-input {
  flex: 1;
  min-width: 200px;
}

.key-input:focus, .value-input:focus {
  border-color: #6200EE;
  box-shadow: 0 0 0 3px rgba(98, 0, 238, 0.1);
}

.equal-sign {
  font-size: 18px;
  color: #666;
  font-weight: 500;
}

.action-area {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
}
</style>
