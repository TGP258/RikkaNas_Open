<template>
  <div class="file-preview">
    <div class="preview-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="file-info">
          <span class="file-name">{{ fileName }}</span>
        </div>
      </div>
      <button class="action-btn" @click="downloadFile">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        下载
      </button>
    </div>

    <div class="preview-body">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <!-- 视频预览 -->
      <div v-else-if="isVideo" class="media-preview">
        <video controls class="video-player" autoplay>
          <source :src="fileUrl" :type="fileType">
        </video>
      </div>

      <!-- 音频预览 -->
      <div v-else-if="isAudio" class="audio-preview">
        <div class="audio-cover">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </div>
        <div class="audio-info">
          <span class="audio-name">{{ fileName }}</span>
        </div>
        <audio controls class="audio-player">
          <source :src="fileUrl" :type="fileType">
        </audio>
      </div>

      <!-- TXT预览 -->
      <div v-else-if="isText" class="text-preview">
        <pre class="text-content">{{ textContent }}</pre>
      </div>

      <!-- PDF预览 -->
      <div v-else-if="isPdf" class="pdf-preview">
        <iframe :src="'https://docs.google.com/gview?url=' + encodeURIComponent(fileUrl) + '&embedded=true'"
                class="pdf-iframe"
                frameborder="0">
        </iframe>
      </div>

      <!-- Office文件预览 -->
      <div v-else-if="isOffice" class="office-preview">
        <iframe :src="'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(fileUrl)"
                class="office-iframe"
                frameborder="0">
        </iframe>
      </div>

      <!-- 图片预览 -->
      <div v-else-if="isImage" class="image-preview">
        <img :src="fileUrl" :alt="fileName" class="preview-image">
      </div>

      <!-- 不支持的文件类型 -->
      <div v-else class="unsupported">
        <div class="unsupported-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5"/>
            <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </div>
        <p class="unsupported-text">暂不支持此文件格式预览</p>
        <p class="unsupported-ext">{{ fileExt.toUpperCase() }}</p>
        <button class="download-btn" @click="downloadFile">下载到本地查看</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

export default {
  name: 'FilePreview',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const textContent = ref('');
    const loading = ref(false);

    const getBackendUrl = () => {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      return `${protocol}//${hostname}:3000`;
    };

    const filePath = computed(() => route.query.path || '');
    const fileName = computed(() => {
      const parts = filePath.value.split('/');
      return parts[parts.length - 1] || '未知文件';
    });

    const fileExt = computed(() => {
      const name = fileName.value;
      const dotIndex = name.lastIndexOf('.');
      return dotIndex !== -1 ? name.substring(dotIndex + 1).toLowerCase() : '';
    });

    const fileType = computed(() => {
      const ext = fileExt.value;
      const mimeTypes = {
        mp4: 'video/mp4',
        webm: 'video/webm',
        ogg: 'video/ogg',
        mov: 'video/quicktime',
        avi: 'video/avi',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        ogg: 'audio/ogg',
        txt: 'text/plain',
        pdf: 'application/pdf'
      };
      return mimeTypes[ext] || '';
    });

    const fileUrl = computed(() => {
      return `${getBackendUrl()}/api/files/preview?path=${encodeURIComponent(filePath.value)}`;
    });

    const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv'];
    const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
    const textExts = ['txt', 'md', 'json', 'xml', 'html', 'css', 'js'];
    const pdfExts = ['pdf'];
    const officeExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];

    const isVideo = computed(() => videoExts.includes(fileExt.value));
    const isAudio = computed(() => audioExts.includes(fileExt.value));
    const isText = computed(() => textExts.includes(fileExt.value));
    const isPdf = computed(() => pdfExts.includes(fileExt.value));
    const isOffice = computed(() => officeExts.includes(fileExt.value));
    const isImage = computed(() => imageExts.includes(fileExt.value));

    const goBack = () => {
      router.back();
    };

    const downloadFile = () => {
      window.open(`${getBackendUrl()}/api/files/download?path=${encodeURIComponent(filePath.value)}`, '_blank');
    };

    const loadTextContent = async () => {
      if (!isText.value) return;
      loading.value = true;
      try {
        const response = await axios.get(fileUrl.value);
        textContent.value = response.data;
      } catch (error) {
        textContent.value = '无法加载文件内容';
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      if (isText.value) {
        loadTextContent();
      } else {
        loading.value = false;
      }
    });

    return {
      fileName,
      filePath,
      fileUrl,
      fileExt,
      fileType,
      textContent,
      loading,
      isVideo,
      isAudio,
      isText,
      isPdf,
      isOffice,
      isImage,
      goBack,
      downloadFile
    };
  }
};
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.file-preview {
  min-height: 100vh;
  background: #1a1a1a;
  color: #fff;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #111;
  border-bottom: 1px solid #262626;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  flex: 1;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: 1px solid #333;
  border-radius: 6px;
  color: #999;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
}

.back-btn:hover {
  background: #262626;
  color: #fff;
  border-color: #444;
}

.file-info {
  min-width: 0;
}

.file-name {
  font-size: 15px;
  font-weight: 500;
  color: #fff;
  word-break: break-all;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #ff5a5f;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s;
}

.action-btn:hover {
  background: #ff6b6f;
}

.preview-body {
  padding: 0;
}

/* 加载状态 */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 61px);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #333;
  border-top-color: #ff5a5f;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 视频预览 */
.media-preview {
  background: #000;
}

.video-player {
  width: 100%;
  max-height: calc(100vh - 61px);
  display: block;
}

/* 音频预览 */
.audio-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 61px);
  background: #111;
  padding: 40px;
}

.audio-cover {
  width: 160px;
  height: 160px;
  background: #1a1a1a;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #444;
  margin-bottom: 24px;
}

.audio-info {
  margin-bottom: 20px;
  text-align: center;
}

.audio-name {
  font-size: 16px;
  color: #fff;
}

.audio-player {
  width: 100%;
  max-width: 500px;
  height: 40px;
}

.audio-player::-webkit-media-controls-panel {
  background: #262626;
}

/* 文本预览 */
.text-preview {
  background: #fff;
  min-height: calc(100vh - 61px);
}

.text-content {
  padding: 24px;
  color: #1a1a1a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}

/* PDF预览 */
.pdf-preview {
  min-height: calc(100vh - 61px);
  background: #333;
}

.pdf-iframe {
  width: 100%;
  height: calc(100vh - 61px);
  border: none;
}

/* Office预览 */
.office-preview {
  min-height: calc(100vh - 61px);
  background: #333;
}

.office-iframe {
  width: 100%;
  height: calc(100vh - 61px);
  border: none;
}

/* 图片预览 */
.image-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 61px);
  background: #000;
  padding: 20px;
}

.preview-image {
  max-width: 100%;
  max-height: calc(100vh - 61px);
  object-fit: contain;
}

/* 不支持的文件类型 */
.unsupported {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 61px);
  background: #111;
  text-align: center;
  padding: 40px;
}

.unsupported-icon {
  color: #333;
  margin-bottom: 20px;
}

.unsupported-text {
  font-size: 16px;
  color: #666;
  margin-bottom: 8px;
}

.unsupported-ext {
  font-size: 13px;
  color: #444;
  margin-bottom: 24px;
}

.download-btn {
  padding: 10px 20px;
  background: #ff5a5f;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.download-btn:hover {
  background: #ff6b6f;
}

/* 响应式 */
@media (max-width: 768px) {
  .preview-header {
    padding: 10px 16px;
  }

  .file-name {
    font-size: 14px;
  }

  .audio-preview {
    padding: 30px 20px;
  }

  .audio-cover {
    width: 120px;
    height: 120px;
  }
}
</style>
