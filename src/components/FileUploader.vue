<template>
  <div class="file-upload-container">
    <h2>文件上传功能</h2>
    <input type="file" ref="fileInput" @change="handleFileChange">

    <button @click="uploadFile" :disabled="!selectedFile">上传文件</button>

    <p class="status-message" v-if="statusMessage">{{ statusMessage }}</p>
    <div class="progress-bar-container" v-if="uploadProgress > 0">
      <div class="progress-bar" :style="{ width: uploadProgress + '%' }"></div>
    </div>
    <span v-if="uploadProgress > 0">{{ uploadProgress }}%</span>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

// 响应式变量，用于存储文件、状态和进度
const fileInput = ref(null);
const selectedFile = ref(null);
const statusMessage = ref('');
const uploadProgress = ref(0);

// 当文件选择器发生变化时触发
const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    statusMessage.value = `已选择文件: ${file.name}`;
    uploadProgress.value = 0; // 重置进度条
  } else {
    selectedFile.value = null;
    statusMessage.value = '';
  }
};

// 执行文件上传
const uploadFile = async () => {
  if (!selectedFile.value) {
    statusMessage.value = '请先选择一个文件。';
    return;
  }

  // 创建 FormData 对象
  const formData = new FormData();
  // 'file' 是后端用来接收文件的键名
  formData.append('file', selectedFile.value);

  // 重置状态
  statusMessage.value = '正在上传...';
  uploadProgress.value = 0;

  try {
    const response = await axios.post('http://localhost:3000/upload', formData, {
      headers: {
        // Axios 会自动设置 'Content-Type'，这里可以省略
        'Content-Type': 'multipart/form-data',
      },
      // 监听上传进度
      onUploadProgress: (progressEvent) => {
        uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      },
    });

    // 上传成功
    if (response.status === 200) {
      statusMessage.value = '文件上传成功！';
      console.log('服务器响应:', response.data);
      // 清空文件选择器
      if (fileInput.value) {
        fileInput.value.value = '';
      }
      selectedFile.value = null;
    } else {
      statusMessage.value = `上传失败: ${response.statusText}`;
    }
  } catch (error) {
    console.error('上传过程中出现错误:', error);
    statusMessage.value = '上传失败，请检查网络或服务器。';
  }
};
</script>

<style scoped>
.file-upload-container {
  max-width: 600px;
  margin: 50px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  text-align: center;
}

button {
  margin-left: 10px;
  padding: 8px 16px;
  cursor: pointer;
}

.status-message {
  margin-top: 15px;
  font-weight: bold;
  color: #333;
}

.progress-bar-container {
  width: 100%;
  height: 20px;
  background-color: #f3f3f3;
  border: 1px solid #ddd;
  border-radius: 5px;
  margin-top: 10px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background-color: #4caf50;
  transition: width 0.3s ease;
}
</style>