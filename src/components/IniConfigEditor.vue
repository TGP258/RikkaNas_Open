<template>
  <div class="ini-editor-container">
    <h2>系统设置</h2>

    <!-- 加载/错误提示 -->
    <div v-if="configStore.isLoading" class="tip loading-tip">正在读取配置...</div>
    <div v-if="configStore.errorMsg" class="tip error-tip">{{ configStore.errorMsg }}</div>

    <!-- INI编辑区域 -->
    <div class="edit-area">
      <!-- 新增分组按钮 -->
      <button @click="addNewSection" class="btn add-section-btn">+ 新增分组</button>

      <!-- 分组列表：遍历iniData，sectionKey为只读变量 -->
      <div v-for="(section, sectionKey) in configStore.iniData" :key="sectionKey" class="section-card">
        <!-- 分组头部：已修正sectionKey的绑定 -->
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

        <!-- 键值对列表：key和value均为只读变量，全部改用:value + 事件 -->
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
            <!-- 修正：value输入框移除v-model，改用:value + @input/@blur -->
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

        <!-- 新增键值对按钮 -->
        <button @click="addNewKeyValue(sectionKey)" class="btn add-kv-btn">+ 新增键值对</button>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-area">
      <button @click="refreshIniConfig" class="btn refresh-btn">刷新配置（从服务器读取）</button>
      <button @click="saveIniConfig" class="btn save-btn" :disabled="configStore.isLoading">保存配置到服务器</button>
<!--      <button @click="resetEditor" class="btn reset-btn">重置编辑器</button>-->
    </div>
  </div>
</template>

<script setup>
import { useIniConfigStore } from '@/stores/iniConfigStore';
import { onMounted } from 'vue';

// 获取全局INI配置Store
const configStore = useIniConfigStore();

/**
 * 分组名失焦事件：更新分组名
 * @param {string} oldSectionKey 旧分组名
 * @param {Event} e 失焦事件
 */
const handleSectionKeyBlur = (oldSectionKey, e) => {
  const newSectionKey = e.target.value.trim();
  // 校验逻辑
  if (!newSectionKey || newSectionKey === oldSectionKey) return;
  if (configStore.iniData[newSectionKey]) {
    alert(`分组名「${newSectionKey}」已存在！`);
    e.target.value = oldSectionKey;
    return;
  }

  // 手动更新分组名（复制旧数据 → 删除旧键 → 新增新键）
  configStore.iniData[newSectionKey] = { ...configStore.iniData[oldSectionKey] };
  delete configStore.iniData[oldSectionKey];
};

/**
 * 键名失焦事件：更新键名
 * @param {string} sectionKey 分组名
 * @param {string} oldKey 旧键名
 * @param {Event} e 失焦事件
 * @param {string} type 类型：key
 */
const handleKeyValueBlur = (sectionKey, oldKey, e, type) => {
  if (type !== 'key') return;
  const newKey = e.target.value.trim();
  const section = configStore.iniData[sectionKey];
  if (!section) return;

  // 校验逻辑
  if (!newKey || newKey === oldKey) return;
  if (section[newKey]) {
    alert(`键名「${newKey}」已存在！`);
    e.target.value = oldKey;
    return;
  }

  // 手动更新键名
  section[newKey] = section[oldKey];
  delete section[oldKey];
};

/**
 * 键值输入事件：实时更新键值（核心：通过sectionKey + key定位属性）
 * @param {string} sectionKey 分组名
 * @param {string} key 键名
 * @param {Event} e 输入事件
 */
const handleValueInput = (sectionKey, key, e) => {
  const newValue = e.target.value.trim();
  // 精准定位到对应属性，手动赋值更新（绕开v-for只读变量）
  configStore.iniData[sectionKey][key] = newValue;
};

/**
 * 从服务器刷新配置
 */
const refreshIniConfig = () => {
  configStore.fetchIniConfig();
};

/**
 * 新增分组
 */
const addNewSection = () => {
  let newSectionName = `NEW_SECTION_${Object.keys(configStore.iniData).length + 1}`;
  while (configStore.iniData[newSectionName]) {
    newSectionName = `NEW_SECTION_${Math.floor(Math.random() * 1000)}`;
  }
  configStore.iniData[newSectionName] = {};
};

/**
 * 删除分组
 * @param {string} sectionKey 分组名
 */
const deleteSection = (sectionKey) => {
  if (Object.keys(configStore.iniData).length <= 1) {
    alert('至少保留一个分组！');
    return;
  }
  delete configStore.iniData[sectionKey];
};

/**
 * 新增键值对
 * @param {string} sectionKey 分组名
 */
const addNewKeyValue = (sectionKey) => {
  const section = configStore.iniData[sectionKey];
  if (!section) return;
  let newKey = `new_key_${Object.keys(section).length + 1}`;
  while (section[newKey]) {
    newKey = `new_key_${Math.floor(Math.random() * 1000)}`;
  }
  section[newKey] = '';
};

/**
 * 删除键值对
 * @param {string} sectionKey 分组名
 * @param {string} key 键名
 */
const deleteKeyValue = (sectionKey, key) => {
  delete configStore.iniData[sectionKey][key];
};

/**
 * 保存配置到服务器
 */
const saveIniConfig = () => {
  configStore.saveIniConfig();
};

/**
 * 重置编辑器
 */
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

// 组件挂载时自动读取配置
onMounted(() => {
  refreshIniConfig();
});
</script>

<style scoped>
/* 样式与之前一致，无需修改 */
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
</style>