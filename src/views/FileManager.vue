<template>
  <div class="file-manager">
    <div class="logo-section">
      <img class="logo" src="../assets/RkCloudLOGO.png" alt="RikkaNas Logo">
      <h1>RkCloud文件管理器</h1>
    </div>
    <!-- 顶部操作栏 -->
    <div class="toolbar">
      <!-- 路径导航 -->
      <div class="path-nav">
        <span @click="navigateTo('')">根目录</span>
        <span v-for="(item, index) in currentPathArr" :key="index">
          / <span @click="navigateTo(currentPathArr.slice(0, index+1).join('/'))">{{ item }}</span>
        </span>
      </div>

      <!-- 搜索框 -->
      <div class="search-box">
        <input
            v-model="searchKeyword"
            placeholder="搜索文件/文件夹..."
            @keyup.enter="handleSearch"
        />
        <button @click="handleSearch" class="search-btn">搜索</button>
        <button v-if="isSearching" @click="resetSearch" class="reset-btn">重置</button>
      </div>

      <!-- 操作按钮组 -->
      <div class="toolbar-actions">
        <!-- 创建文件夹按钮 -->
        <button class="btn primary-btn" @click="showCreateFolderModal = true">
          创建文件夹
        </button>

        <!-- 上传下拉按钮 -->
        <div class="dropdown" @click.stop>
          <button class="btn primary-btn dropdown-btn" @click="toggleUploadMenu">
            上传 <span class="arrow">▼</span>
          </button>
          <!-- 上传下拉菜单 -->
          <div v-if="showUploadMenu" class="dropdown-menu">
            <!-- 上传文件（无webkitdirectory） -->
            <div class="menu-item" @click="triggerFileInput">
              <input
                  type="file"
                  ref="fileInputRef"
                  style="display: none"
                  @change="handleFileUpload"
                  multiple
              />
              上传文件
            </div>
            <!-- 上传文件夹（保留webkitdirectory） -->
            <div class="menu-item" @click="triggerFolderInput">
              <input
                  type="file"
                  ref="folderInputRef"
                  style="display: none"
                  @change="handleFolderUpload"
                  webkitdirectory
                  directory
              />
              上传文件夹
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件列表 -->
    <div class="file-list">
      <!-- 列表表头 -->
      <div class="file-list-header">
        <div class="col-icon">类型</div>
        <div class="col-name">名称</div>
        <div class="col-meta">大小/类型</div>
        <div class="col-time">修改时间</div>
      </div>

      <!-- 无数据提示 -->
      <div v-if="fileList.length === 0" class="empty-tip">
        {{ isSearching ? '未找到匹配的文件' : '当前目录为空' }}
      </div>

      <!-- 文件/文件夹项 -->
      <div
          v-for="file in fileList"
          :key="file.path"
          class="file-item"
          @contextmenu="(e) => showContextMenu(e, file)"
      >
        <!-- 图标 -->
        <div class="col-icon file-icon">
          <span v-if="file.type === 'folder'" class="icon-folder">文件夹</span>
          <span v-else class="icon-file">文件</span>
        </div>
        <!-- 名称 -->
        <div class="col-name file-name" @dblclick="handleItemDblClick(file)">
          {{ file.name }}
        </div>
        <!-- 大小/类型 -->
        <div class="col-meta file-meta">
          {{ file.type === 'folder' ? '文件夹' : formatSize(file.size) }}
        </div>
        <!-- 修改时间 -->
        <div class="col-time file-time">
          {{ formatTime(file.mtime) }}
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div
        v-if="contextMenu.visible"
        class="context-menu"
        :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }"
        @click.stop
    >
      <div class="menu-item" @click="handleCopy">复制</div>
      <div class="menu-item" @click="handleCut">剪切</div>
      <div class="menu-item" @click="handlePaste">粘贴</div>
      <div class="menu-item" @click="handleShare">共享文件</div>
      <div class="menu-item" @click="handleRename">重命名</div>
      <div class="menu-item danger" @click="handleDelete">删除</div>
    </div>

    <!-- 重命名弹窗 -->
    <div v-if="renameVisible" class="modal">
      <div class="modal-content">
        <h3>重命名</h3>
        <input v-model="newFileName" placeholder="请输入新名称" />
        <div class="modal-btns">
          <button class="btn primary-btn" @click="confirmRename">确认</button>
          <button class="btn default-btn" @click="renameVisible = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 创建文件夹弹窗 -->
    <div v-if="showCreateFolderModal" class="modal">
      <div class="modal-content">
        <h3>创建文件夹</h3>
        <input
            v-model="newFolderName"
            placeholder="请输入文件夹名称"
            @keyup.enter="confirmCreateFolder"
        />
        <div class="modal-btns">
          <button class="btn primary-btn" @click="confirmCreateFolder">确认创建</button>
          <button class="btn default-btn" @click="showCreateFolderModal = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 提示框 -->
    <div v-if="toast.visible" class="toast" :class="toast.type">
      {{ toast.message }}
    </div>

    <!-- 共享文件弹窗 -->
    <div v-if="shareModalVisible" class="modal">
      <div class="modal-content share-modal">
        <h3>共享文件</h3>

        <div class="form-group">
          <label>共享方式</label>
          <div class="radio-group">
            <label><input v-model="shareType" type="radio" value="public"> 公开共享</label>
            <label><input v-model="shareType" type="radio" value="private"> 私密共享（需提取码）</label>
          </div>
        </div>

        <div class="form-group" v-if="shareType === 'private'">
          <label>提取码</label>
          <input v-model="shareCode" placeholder="请设置4位数字提取码" maxlength="4" />
        </div>

        <div class="form-group">
          <label>权限设置</label>
          <div class="radio-group">
            <label><input v-model="sharePermission" type="radio" value="read"> 只读</label>
            <label><input v-model="sharePermission" type="radio" value="write"> 可编辑</label>
          </div>
        </div>

        <div class="form-group share-link" v-if="shareLink">
          <label>共享链接（已自动复制）</label>
          <input readonly :value="shareLink" />
        </div>

        <div class="modal-btns">
          <button class="btn primary-btn" @click="createShare">确认创建共享</button>
          <button class="btn default-btn" @click="closeShareModal">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import {
  getFileList, uploadFile, downloadFile, deleteFile,
  renameFile, setClipboard, pasteFile, searchFiles,
  createFolder
} from '@/api/fileApi';
import axios from 'axios';

// 共享相关状态
const shareModalVisible = ref(false);
const shareType = ref('public');
const shareCode = ref('');
const sharePermission = ref('read');
const shareLink = ref('');

// 打开共享弹窗
const handleShare = () => {
  shareModalVisible.value = true;
  shareType.value = 'public';
  shareCode.value = '';
  sharePermission.value = 'read';
  shareLink.value = '';
  closeContextMenu();
};

// 关闭弹窗
const closeShareModal = () => {
  shareModalVisible.value = false;
};

// 创建共享
const createShare = async () => {
  const file = contextMenu.value.file;

  if (shareType.value === 'private' && !shareCode.value) {
    showToast('请设置提取码', 'error');
    return;
  }

  try {
    const res = await axios.post('http://localhost:3000/api/share/create', {
      filePath: file.path,
      type: shareType.value,
      code: shareCode.value,
      permission: sharePermission.value
    });

    shareLink.value = `http://localhost:5173/share/${res.data.link}`;
    navigator.clipboard.writeText(shareLink.value);
    showToast('共享创建成功，链接已复制！');
  } catch (e) {
    showToast('共享失败', 'error');
  }
};

// 核心状态管理
const fileList = ref([]);
const currentPath = ref('');
const currentPathArr = ref([]);
const searchKeyword = ref('');
const isSearching = ref(false);
const contextMenu = ref({ visible: false, x: 0, y: 0, file: null });
const renameVisible = ref(false);
const newFileName = ref('');
const showCreateFolderModal = ref(false);
const newFolderName = ref('');
const toast = ref({ visible: false, message: '', type: 'success' });
const showUploadMenu = ref(false);

// 文件上传引用
const fileInputRef = ref(null);
const folderInputRef = ref(null);

// 格式化文件大小
const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

// 格式化时间
const formatTime = (time) => {
  return new Date(time).toLocaleString();
};

// 获取文件列表
const loadFileList = async (path = '') => {
  try {
    const res = await getFileList(path);
    if (res.data.success) {
      fileList.value = res.data.data;
    }
  } catch (error) {
    showToast(error.response?.data?.error || '加载文件列表失败', 'error');
  }
};

// 导航到指定路径
const navigateTo = (path) => {
  currentPath.value = path;
  currentPathArr.value = path ? path.split('/') : [];
  isSearching.value = false;
  loadFileList(path);
};

// 双击文件/文件夹
const handleItemDblClick = (file) => {
  if (file.type === 'folder') {
    navigateTo(file.path);
  } else {
    downloadFile(file.path);
  }
};

// 切换上传菜单
const toggleUploadMenu = () => {
  showUploadMenu.value = !showUploadMenu.value;
};

// 触发文件上传
const triggerFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click();
    showUploadMenu.value = false;
  }
};

// 触发文件夹上传
const triggerFolderInput = () => {
  if (folderInputRef.value) {
    folderInputRef.value.click();
    showUploadMenu.value = false;
  }
};

// 处理文件上传
const handleFileUpload = (e) => {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  uploadFile(files, currentPath.value)
      .then(() => {
        showToast(`成功上传 ${files.length} 个文件`);
        loadFileList(currentPath.value);
        e.target.value = '';
      })
      .catch(error => {
        showToast(error.response?.data?.error || '文件上传失败', 'error');
      });
};

// 处理文件夹上传
const handleFolderUpload = (e) => {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  console.log('=== 前端文件夹上传调试 ===');
  console.log('文件数量:', files.length);
  if (files.length > 0) {
    console.log('第一个文件:', files[0]);
    console.log('webkitRelativePath:', files[0].webkitRelativePath);
    console.log('originalname:', files[0].originalname);
  }

  uploadFile(files, currentPath.value)
      .then(() => {
        const rootFolders = new Set(files.map(f => f.webkitRelativePath.split('/')[0]));
        showToast(`成功上传 ${rootFolders.size} 个文件夹（共 ${files.length} 个文件）`);
        loadFileList(currentPath.value);
        e.target.value = '';
      })
      .catch(error => {
        showToast(error.response?.data?.error || '文件夹上传失败', 'error');
      });
};

// 搜索文件
const handleSearch = async () => {
  if (!searchKeyword.value.trim()) return;
  try {
    const res = await searchFiles(searchKeyword.value, currentPath.value);
    if (res.data.success) {
      fileList.value = res.data.data;
      isSearching.value = true;
    }
  } catch (error) {
    showToast(error.response?.data?.error || '搜索失败', 'error');
  }
};

// 重置搜索
const resetSearch = () => {
  searchKeyword.value = '';
  isSearching.value = false;
  loadFileList(currentPath.value);
};

// 显示右键菜单
const showContextMenu = (e, file) => {
  e.preventDefault();
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    file,
  };
  document.addEventListener('click', closeContextMenu, { once: true });
};

// 关闭右键菜单
const closeContextMenu = () => {
  contextMenu.value.visible = false;
};

// 复制文件
const handleCopy = () => {
  const file = contextMenu.value.file;
  setClipboard('copy', file.path)
      .then(() => {
        showToast('已复制');
        closeContextMenu();
      })
      .catch(error => {
        showToast(error.response?.data?.error || '复制失败', 'error');
      });
};

// 剪切文件
const handleCut = () => {
  const file = contextMenu.value.file;
  setClipboard('cut', file.path)
      .then(() => {
        showToast('已剪切');
        closeContextMenu();
      })
      .catch(error => {
        showToast(error.response?.data?.error || '剪切失败', 'error');
      });
};

// 粘贴文件
const handlePaste = () => {
  pasteFile(currentPath.value)
      .then(() => {
        showToast('粘贴成功');
        loadFileList(currentPath.value);
        closeContextMenu();
      })
      .catch(error => {
        showToast(error.response?.data?.error || '粘贴失败', 'error');
      });
};

// 重命名
const handleRename = () => {
  const file = contextMenu.value.file;
  newFileName.value = file.name;
  renameVisible.value = true;
  closeContextMenu();
};

// 确认重命名
const confirmRename = () => {
  if (!newFileName.value.trim()) {
    showToast('名称不能为空', 'error');
    return;
  }
  const file = contextMenu.value.file;
  renameFile(file.path, newFileName.value)
      .then(() => {
        showToast('重命名成功');
        loadFileList(currentPath.value);
        renameVisible.value = false;
      })
      .catch(error => {
        showToast(error.response?.data?.error || '重命名失败', 'error');
      });
};

// 删除文件
const handleDelete = () => {
  if (!confirm('确定要删除吗？')) return;
  const file = contextMenu.value.file;
  deleteFile(file.path)
      .then(() => {
        showToast('删除成功');
        loadFileList(currentPath.value);
        closeContextMenu();
      })
      .catch(error => {
        showToast(error.response?.data?.error || '删除失败', 'error');
      });
};

// 确认创建文件夹
const confirmCreateFolder = async () => {
  if (!newFolderName.value.trim()) {
    showToast('文件夹名称不能为空', 'error');
    return;
  }
  try {
    const res = await createFolder(newFolderName.value, currentPath.value);
    if (res.data.success) {
      showToast('文件夹创建成功');
      loadFileList(currentPath.value);
      showCreateFolderModal.value = false;
      newFolderName.value = '';
    }
  } catch (error) {
    showToast(error.response?.data?.error || '创建文件夹失败', 'error');
  }
};

// 显示提示框
const showToast = (message, type = 'success') => {
  toast.value = { visible: true, message, type };
  setTimeout(() => {
    toast.value.visible = false;
  }, 2000);
};

// 初始化
onMounted(() => {
  loadFileList();
  document.addEventListener('click', () => {
    showUploadMenu.value = false;
  });
});

// 监听路径变化
watch(currentPath, () => {
  currentPathArr.value = currentPath.value ? currentPath.value.split('/') : [];
});
</script>

<style scoped>
.file-manager {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
  background-color: #f8f9fa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  /* 新增圆角样式 - 推荐值 16px（和系统其他组件风格统一） */
  border-radius: 16px;
  /* 可选：防止内部内容溢出时裁切圆角 */
  overflow: hidden;
}

/* 顶部工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px 24px;
  background-color: #ffffff;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.path-nav {
  font-size: 15px;
  color: #333;
  white-space: nowrap;
}

.path-nav span {
  cursor: pointer;
  color: #40007a;
  font-weight: 500;
}

.path-nav span:hover {
  color: #6800c1;
}

/* 搜索框 */
.search-box {
  display: flex;
  gap: 8px;
  align-items: center;
}

.search-box input {
  padding: 10px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  width: 220px;
  outline: none;
  transition: border-color 0.2s;
}

.search-box input:focus {
  border-color: #40007a;
}

.search-btn, .reset-btn {
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.search-btn {
  background: #40007a;
  color: white;
}

.search-btn:hover {
  background: #6800c1;
}

.reset-btn {
  background: #f5f5f5;
  color: #666;
}

.reset-btn:hover {
  background: #e0e0e0;
}

/* 操作按钮组 */
.toolbar-actions {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  border: none;
}

.primary-btn {
  background: linear-gradient(90deg, #40007a, #6800c1);
  color: white;
}

.primary-btn:hover {
  background: #40007a;
}

.default-btn {
  background: #f5f5f5;
  color: #666;
}

.default-btn:hover {
  background: #e0e0e0;
}

/* 下拉菜单 */
.dropdown {
  position: relative;
  display: inline-block;
  z-index: 101;
}

.dropdown-btn {
  display: flex;
  align-items: center;
  gap: 6px;
}

.arrow {
  font-size: 10px;
  transition: transform 0.2s;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  z-index: 102;
  min-width: 140px;
  margin-top: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.dropdown-menu .menu-item {
  padding: 10px 16px;
  cursor: pointer;
  color: #333;
  transition: background-color 0.2s;
  font-size: 14px;
}

.dropdown-menu .menu-item:hover {
  background-color: #f8f9ff;
}

/* 文件列表 */
.file-list {
  flex: 1;
  overflow: auto;
  background-color: #ffffff;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* 文件列表表头 */
.file-list-header {
  display: flex;
  padding: 12px 24px;
  background: #f9f9f9;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 500;
  color: #666;
  font-size: 14px;
}

/* 列表列宽统一 */
.col-icon { width: 80px; text-align: center; }
.col-name { flex: 1; }
.col-meta { width: 120px; text-align: right; }
.col-time { width: 200px; text-align: right; }

/* 文件项 */
.file-item {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 1px solid #f0f0f0;
  cursor: default;
  transition: background-color 0.2s;
}

.file-item:hover {
  background-color: #f8f9ff;
}

.file-icon .icon-folder {
  color: #40007a;
  font-weight: 500;
}

.file-icon .icon-file {
  color: #666;
}

.file-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.file-meta {
  color: #666;
  font-size: 13px;
}

.file-time {
  color: #999;
  font-size: 12px;
}

.empty-tip {
  text-align: center;
  padding: 80px 20px;
  color: #999;
  font-size: 14px;
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  width: 140px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.menu-item {
  padding: 10px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: background-color 0.2s;
}

.menu-item:hover {
  background-color: #f8f9ff;
}

.menu-item.danger {
  color: #F44336;
}

.menu-item.danger:hover {
  background-color: #fff5f5;
}

/* 弹窗样式 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.modal-content {
  background: #ffffff;
  padding: 28px;
  border-radius: 12px;
  width: 360px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.share-modal {
  width: 440px;
}

.modal-content h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #333;
  font-weight: 600;
}

.modal-content input {
  width: 100%;
  padding: 12px 14px;
  margin: 0 0 20px 0;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  box-sizing: border-box;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.modal-content input:focus {
  border-color: #40007a;
}

.modal-btns {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

/* 表单组样式 */
.form-group {
  margin-bottom: 18px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.radio-group {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: normal;
  cursor: pointer;
}

.share-link input {
  background: #f9f9f9;
  color: #333;
  cursor: default;
}

/* 提示框 */
.toast {
  position: fixed;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  z-index: 1002;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: fadeIn 0.2s ease;
}

.toast.success {
  background: #4caf50;
}

.toast.error {
  background: #f44336;
}

/* 动画效果 */
@keyframes fadeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* 响应式适配 */
@media (max-width: 992px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .path-nav, .search-box, .toolbar-actions {
    width: 100%;
  }

  .search-box {
    justify-content: center;
  }

  .toolbar-actions {
    justify-content: center;
  }

  .col-time {
    width: 160px;
  }
}

@media (max-width: 768px) {
  .file-list-header, .file-item {
    padding: 10px 16px;
  }

  .col-meta {
    width: 100px;
  }

  .col-time {
    display: none;
  }

  .modal-content {
    width: 90%;
    max-width: 320px;
  }

  .share-modal {
    width: 90%;
    max-width: 380px;
  }
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
.logo {
  width: 80px;
  height: 80px;
  margin-bottom: 15px;
}
</style>