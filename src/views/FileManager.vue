<template>
  <div class="file-manager">
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
        <button @click="handleSearch">搜索</button>
        <button v-if="isSearching" @click="resetSearch">重置</button>
      </div>

      <!-- 操作按钮组 -->
      <div class="toolbar-actions">
        <!-- 创建文件夹按钮 -->
        <button class="btn" @click="showCreateFolderModal = true">
          创建文件夹
        </button>

        <!-- 上传下拉按钮 -->
        <div class="dropdown" @click.stop>
          <button class="btn dropdown-btn" @click="toggleUploadMenu">
            上传 <span class="arrow">▼</span>
          </button>
          <!-- 上传下拉菜单 -->
          <div v-if="showUploadMenu" class="dropdown-menu">
            <!-- 上传文件（无webkitdirectory） -->
            <div class="menu-item" @click="triggerFileInput">
              <!-- 关键1：绑定正确的ref变量 -->
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
              <!-- 关键1：绑定正确的ref变量 -->
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
        <div class="file-icon">
          <span v-if="file.type === 'folder'">📁</span>
          <span v-else>📄</span>
        </div>
        <!-- 名称 -->
        <div class="file-name" @dblclick="handleItemDblClick(file)">
          {{ file.name }}
        </div>
        <!-- 大小/类型 -->
        <div class="file-meta">
          {{ file.type === 'folder' ? '文件夹' : formatSize(file.size) }}
        </div>
        <!-- 修改时间 -->
        <div class="file-time">
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
      <div class="menu-item" @click="handleShare">共享文件</div> <!-- 新增共享 -->
      <div class="menu-item" @click="handleRename">重命名</div>
      <div class="menu-item danger" @click="handleDelete">删除</div>

    </div>

    <!-- 重命名弹窗 -->
    <div v-if="renameVisible" class="modal">
      <div class="modal-content">
        <h3>重命名</h3>
        <input v-model="newFileName" placeholder="请输入新名称" />
        <div class="modal-btns">
          <button @click="confirmRename">确认</button>
          <button @click="renameVisible = false">取消</button>
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
          <button @click="confirmCreateFolder">确认创建</button>
          <button @click="showCreateFolderModal = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 提示框 -->
    <div v-if="toast.visible" class="toast" :class="toast.type">
      {{ toast.message }}
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

// 状态管理
const fileList = ref([]); // 文件列表
const currentPath = ref(''); // 当前路径
const currentPathArr = ref([]); // 当前路径拆分的数组
const searchKeyword = ref(''); // 搜索关键词
const isSearching = ref(false); // 是否在搜索状态
const contextMenu = ref({ visible: false, x: 0, y: 0, file: null }); // 右键菜单
const renameVisible = ref(false); // 重命名弹窗
const newFileName = ref(''); // 新文件名
const showCreateFolderModal = ref(false); // 创建文件夹弹窗
const newFolderName = ref(''); // 新文件夹名称
const toast = ref({ visible: false, message: '', type: 'success' }); // 提示框
const showUploadMenu = ref(false); // 控制上传下拉菜单显示

// 关键2：声明ref变量（Vue3 script setup 必须这样用）
const fileInputRef = ref(null); // 文件输入框引用
const folderInputRef = ref(null); // 文件夹输入框引用

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

// 下拉菜单切换逻辑
const toggleUploadMenu = () => {
  showUploadMenu.value = !showUploadMenu.value;
};

// 关键3：修复文件输入框触发逻辑（使用声明的ref变量）
const triggerFileInput = () => {
  // 先判断ref是否存在，避免报错
  if (fileInputRef.value) {
    fileInputRef.value.click();
    showUploadMenu.value = false; // 点击后关闭菜单
  }
};

// 关键4：修复文件夹输入框触发逻辑（使用声明的ref变量）
const triggerFolderInput = () => {
  if (folderInputRef.value) {
    folderInputRef.value.click();
    showUploadMenu.value = false; // 点击后关闭菜单
  }
};

// 上传文件（仅文件，无目录）
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

// 上传文件夹（保留目录结构）
const handleFolderUpload = (e) => {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  uploadFile(files, currentPath.value)
      .then(() => {
        // 统计上传的根文件夹数量（去重）
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
// 新增：共享文件
const handleShare = async () => {
  const file = contextMenu.value.file;
  try {
    // 调用后端创建共享链接
    const res = await axios.post('http://localhost:3000/api/share/create', {
      filePath: file.path
    });
    const shareUrl = `http://localhost:3000/api/share/${res.data.link}`;

    // 复制到剪贴板
    await navigator.clipboard.writeText(shareUrl);
    showToast(`共享链接已复制：${shareUrl}`);
  } catch (e) {
    showToast('共享失败', 'error');
  }
  closeContextMenu();
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

// 合并后的onMounted
onMounted(() => {
  loadFileList();
  // 点击页面其他区域关闭下拉菜单
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
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 15px 20px;
  background-color: #ffffff;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.path-nav {
  font-size: 16px;
  color: #333;
}

.path-nav span {
  cursor: pointer;
  color: #40007a;
  font-weight: 500;
}

.path-nav span:hover {
  color: #6800c1;
}

.search-box {
  display: flex;
  gap: 10px;
}

.search-box input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  width: 200px;
  outline: none;
}

.search-box input:focus {
  border-color: #40007a;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  background: #40007a;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn:hover {
  background: #6800c1;
}

.file-list {
  flex: 1;
  overflow: auto;
  background-color: #ffffff;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #f0f0f0;
  cursor: default;
  transition: background-color 0.2s;
}

.file-item:hover {
  background-color: #f8f9ff;
}

.file-icon {
  width: 30px;
  text-align: center;
  font-size: 20px;
  margin-right: 10px;
}

.file-name {
  flex: 1;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.file-meta {
  width: 120px;
  text-align: right;
  color: #666;
  font-size: 13px;
}

.file-time {
  width: 200px;
  text-align: right;
  color: #666;
  font-size: 12px;
}

.empty-tip {
  text-align: center;
  padding: 60px;
  color: #999;
  font-size: 14px;
}

.context-menu {
  position: fixed;
  width: 120px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  z-index: 1000;
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
  color: #d32f2f;
}

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
  padding: 25px;
  border-radius: 8px;
  width: 320px;
  border: 1px solid #e0e0e0;
}

.modal-content h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #333;
  font-weight: 600;
}

.modal-content input {
  width: 100%;
  padding: 10px;
  margin: 0 0 20px 0;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-sizing: border-box;
  font-size: 14px;
  outline: none;
}

.modal-content input:focus {
  border-color: #40007a;
}

.modal-btns {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-btns button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.modal-btns button:first-child {
  background: #40007a;
  color: white;
}

.modal-btns button:first-child:hover {
  background: #6800c1;
}

.modal-btns button:last-child {
  background: #f5f5f5;
  color: #666;
}

.modal-btns button:last-child:hover {
  background: #e0e0e0;
}

.toast {
  position: fixed;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 6px;
  color: white;
  font-size: 14px;
  z-index: 1002;
}

.toast.success {
  background: #4caf50;
}

.toast.error {
  background: #f44336;
}

/* 下拉菜单样式 */
.dropdown {
  position: relative;
  display: inline-block;
  z-index: 101;
}

.dropdown-btn {
  display: flex;
  align-items: center;
  gap: 5px;
}

.arrow {
  font-size: 10px;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  z-index: 102;
  min-width: 120px;
  margin-top: 2px;
}

.dropdown-menu .menu-item {
  padding: 10px 16px;
  cursor: pointer;
  color: #333;
  transition: background-color 0.2s;
}

.dropdown-menu .menu-item:hover {
  background-color: #f8f9ff;
}
</style>