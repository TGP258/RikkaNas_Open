<template>
  <div class="large-file-uploader">
    <h2>大文件分片上传</h2>
    <p>支持断点续传，自动跳过已上传部分</p>
    
    <div class="upload-area" @click="selectFile" @dragover.prevent @drop="handleDrop">
      <input 
        ref="fileInput" 
        type="file" 
        class="file-input" 
        @change="handleFileSelect"
        accept="*"
      />
      <div class="upload-icon">📁</div>
      <p>点击或拖拽文件到此处</p>
    </div>
    
    <div v-if="selectedFile" class="file-info">
      <p><strong>文件名：</strong>{{ selectedFile.name }}</p>
      <p><strong>文件大小：</strong>{{ formatSize(selectedFile.size) }}</p>
      <p><strong>分片数量：</strong>{{ totalChunks }}</p>
    </div>
    
    <div v-if="uploading" class="progress-container">
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: progress + '%' }"
        ></div>
      </div>
      <p class="progress-text">{{ statusText }} - {{ progress }}%</p>
    </div>
    
    <div v-if="uploadSuccess" class="success-message">
      ✅ {{ successMessage }}
    </div>
    
    <div v-if="uploadError" class="error-message">
      ❌ {{ errorMessage }}
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { uploadLargeFile } from '@/api/fileApi';

export default {
  name: 'LargeFileUploader',
  setup() {
    const fileInput = ref(null);
    const selectedFile = ref(null);
    const uploading = ref(false);
    const progress = ref(0);
    const statusText = ref('');
    const uploadSuccess = ref(false);
    const uploadError = ref(false);
    const successMessage = ref('');
    const errorMessage = ref('');
    
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
    
    const totalChunks = computed(() => {
      if (!selectedFile.value) return 0;
      return Math.ceil(selectedFile.value.size / CHUNK_SIZE);
    });
    
    const selectFile = () => {
      fileInput.value?.click();
    };
    
    const handleFileSelect = (event) => {
      const file = event.target.files[0];
      if (file) {
        selectedFile.value = file;
        uploadSuccess.value = false;
        uploadError.value = false;
      }
    };
    
    const handleDrop = (event) => {
      const file = event.dataTransfer.files[0];
      if (file) {
        selectedFile.value = file;
        uploadSuccess.value = false;
        uploadError.value = false;
      }
    };
    
    const formatSize = (bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    
    const startUpload = async () => {
      if (!selectedFile.value || uploading.value) return;
      
      uploading.value = true;
      uploadSuccess.value = false;
      uploadError.value = false;
      progress.value = 0;
      
      try {
        const result = await uploadLargeFile(
          selectedFile.value,
          '',
          (progressInfo) => {
            progress.value = progressInfo.progress;
            switch (progressInfo.status) {
              case 'calculating':
                statusText.value = '正在计算文件MD5...';
                break;
              case 'checking':
                statusText.value = '正在检查文件是否已存在...';
                break;
              case 'resuming':
                statusText.value = '正在检查已上传分片...';
                break;
              case 'uploading':
                statusText.value = '正在上传分片...';
                break;
              case 'merging':
                statusText.value = '正在合并文件...';
                break;
              case 'completed':
                statusText.value = '上传完成';
                break;
              case 'error':
                statusText.value = '上传失败';
                break;
            }
          }
        );
        
        uploadSuccess.value = true;
        successMessage.value = result.message || '文件上传成功';
      } catch (error) {
        uploadError.value = true;
        errorMessage.value = error.message || '上传失败，请重试';
      } finally {
        uploading.value = false;
      }
    };
    
    return {
      fileInput,
      selectedFile,
      uploading,
      progress,
      statusText,
      uploadSuccess,
      uploadError,
      successMessage,
      errorMessage,
      totalChunks,
      selectFile,
      handleFileSelect,
      handleDrop,
      formatSize,
      startUpload
    };
  }
};
</script>

<style scoped>
.large-file-uploader {
  max-width: 600px;
  margin: 40px auto;
  padding: 30px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.large-file-uploader h2 {
  text-align: center;
  color: #333;
  margin-bottom: 8px;
}

.large-file-uploader p {
  text-align: center;
  color: #666;
  margin-bottom: 24px;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-area:hover {
  border-color: #40007a;
  background: #f8f5ff;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.file-input {
  display: none;
}

.file-info {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.file-info p {
  margin: 8px 0;
  text-align: left;
  color: #333;
}

.progress-container {
  margin-bottom: 16px;
}

.progress-bar {
  height: 24px;
  background: #eee;
  border-radius: 12px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #40007a, #6800c1);
  border-radius: 12px;
  transition: width 0.3s;
}

.progress-text {
  text-align: center;
  margin-top: 8px;
  color: #666;
}

.success-message {
  background: #d4edda;
  color: #155724;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

button {
  width: 100%;
  padding: 14px;
  background: linear-gradient(90deg, #40007a, #6800c1);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 16px;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>