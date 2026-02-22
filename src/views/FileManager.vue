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

      <!-- 上传按钮 -->
      <input
          type="file"
          ref="fileInput"
          style="display: none"
          @change="handleFileUpload"
      />
      <button class="btn" @click="$refs.fileInput.click()">上传文件</button>
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
  renameFile, setClipboard, pasteFile, searchFiles
} from '@/api/fileApi';

// 状态管理
const fileList = ref([]); // 文件列表
const currentPath = ref(''); // 当前路径
const currentPathArr = ref([]); // 当前路径拆分的数组
const searchKeyword = ref(''); // 搜索关键词
const isSearching = ref(false); // 是否在搜索状态
const contextMenu = ref({ visible: false, x: 0, y: 0, file: null }); // 右键菜单
const renameVisible = ref(false); // 重命名弹窗
const newFileName = ref(''); // 新文件名
const toast = ref({ visible: false, message: '', type: 'success' }); // 提示框

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
    // 进入文件夹
    navigateTo(file.path);
  } else {
    // 下载文件
    downloadFile(file.path);
  }
};

// 文件上传
const handleFileUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  uploadFile(file, currentPath.value)
      .then(() => {
        showToast('上传成功');
        loadFileList(currentPath.value);
        e.target.value = ''; // 清空文件选择
      })
      .catch(error => {
        showToast(error.response?.data?.error || '上传失败', 'error');
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
  e.preventDefault(); // 阻止默认右键菜单
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    file,
  };
  // 点击其他区域关闭菜单
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
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.path-nav {
  font-size: 16px;
}

.path-nav span {
  cursor: pointer;
  color: #1989fa;
}

.path-nav span:hover {
  text-decoration: underline;
}

.search-box {
  display: flex;
  gap: 10px;
}

.search-box input {
  padding: 5px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.btn {
  padding: 6px 12px;
  background: #1989fa;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn:hover {
  background: #0f7ae5;
}

.file-list {
  flex: 1;
  overflow: auto;
  border: 1px solid #eee;
  border-radius: 4px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid #f5f5f5;
  cursor: default;
}

.file-item:hover {
  background: #f5f5f5;
}

.file-icon {
  width: 30px;
  text-align: center;
  font-size: 20px;
}

.file-name {
  flex: 1;
  margin: 0 16px;
}

.file-meta {
  width: 120px;
  text-align: right;
  color: #666;
}

.file-time {
  width: 200px;
  text-align: right;
  color: #666;
  font-size: 12px;
}

.empty-tip {
  text-align: center;
  padding: 40px;
  color: #999;
}

.context-menu {
  position: fixed;
  width: 120px;
  background: white;
  border: 1px solid #eee;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 1000;
}

.menu-item {
  padding: 8px 16px;
  cursor: pointer;
}

.menu-item:hover {
  background: #f5f5f5;
}

.menu-item.danger {
  color: #f56c6c;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 4px;
  width: 300px;
}

.modal-content input {
  width: 100%;
  padding: 8px;
  margin: 16px 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}

.modal-btns {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  border-radius: 4px;
  color: white;
  z-index: 1002;
}

.toast.success {
  background: #67c23a;
}

.toast.error {
  background: #f56c6c;
}
</style>