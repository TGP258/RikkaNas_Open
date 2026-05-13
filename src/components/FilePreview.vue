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
        <p class="loading-text">{{ loadingText }}</p>
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
      <div v-else-if="isPdf || isOffice" class="pdf-preview">
        <div v-if="pdfPages.length === 0" class="pdf-empty">
          <div class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5"/>
              <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.5"/>
              <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="1.5"/>
              <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </div>
          <p>{{ pdfError || '无法加载PDF内容' }}</p>
        </div>
        <div v-else class="pdf-container">
          <div class="pdf-toolbar">
            <button class="toolbar-btn" @click="prevPage" :disabled="currentPage <= 1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <span class="page-info">{{ currentPage }} / {{ pdfPages.length }}</span>
            <button class="toolbar-btn" @click="nextPage" :disabled="currentPage >= pdfPages.length">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <div class="zoom-controls">
              <button class="toolbar-btn" @click="zoomOut" :disabled="scale <= 0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
              <span class="zoom-value">{{ Math.round(scale * 100) }}%</span>
              <button class="toolbar-btn" @click="zoomIn" :disabled="scale >= 2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2"/>
                  <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="pdf-canvas-container">
            <canvas 
              v-for="(page, index) in pdfPages" 
              :key="index"
              :ref="el => setPageRef(index, el)"
              class="pdf-page"
              :style="{ transform: `scale(${scale})`, transformOrigin: 'top center' }"
            ></canvas>
          </div>
        </div>
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
import { ref, computed, onMounted, onUnmounted, toRaw } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

export default {
  name: 'FilePreview',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const textContent = ref('');
    const loading = ref(false);
    const loadingText = ref('加载中...');
    const pdfPages = ref([]);
    const currentPage = ref(1);
    const scale = ref(1);
    const pdfError = ref('');
    const pageRefs = ref([]);

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

    const pdfPreviewUrl = computed(() => {
      if (isOffice.value) {
        return `${getBackendUrl()}/api/files/office-preview?path=${encodeURIComponent(filePath.value)}`;
      }
      return fileUrl.value;
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

    const loadPdf = async () => {
      if (!isPdf.value && !isOffice.value) return;
      
      loading.value = true;
      loadingText.value = isOffice.value ? '正在转换Office文件...' : '正在加载PDF...';
      pdfError.value = '';

      try {
        const response = await axios.get(pdfPreviewUrl.value, { responseType: 'blob' });
        const arrayBuffer = await response.data.arrayBuffer();
        
        loadingText.value = '正在渲染PDF...';
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        pdfPages.value = [];
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          pdfPages.value.push(page);
        }
        
        await renderPages();
      } catch (error) {
        console.error('加载PDF失败:', error);
        pdfError.value = error.response?.data?.error || '加载PDF失败，请尝试下载文件';
      } finally {
        loading.value = false;
      }
    };

    const renderPages = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      for (let i = 0; i < pdfPages.value.length; i++) {
        const page = toRaw(pdfPages.value[i]);
        const canvas = pageRefs.value[i];
        if (!canvas || !page) continue;

        const viewport = page.getViewport({ scale: scale.value });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
      }
    };

    const setPageRef = (index, el) => {
      if (el) {
        pageRefs.value[index] = el;
      }
    };

    const prevPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--;
        scrollToPage(currentPage.value);
      }
    };

    const nextPage = () => {
      if (currentPage.value < pdfPages.value.length) {
        currentPage.value++;
        scrollToPage(currentPage.value);
      }
    };

    const zoomIn = () => {
      if (scale.value < 2) {
        scale.value += 0.1;
        renderPages();
      }
    };

    const zoomOut = () => {
      if (scale.value > 0.5) {
        scale.value -= 0.1;
        renderPages();
      }
    };

    const scrollToPage = (pageNum) => {
      const canvas = pageRefs.value[pageNum - 1];
      if (canvas) {
        canvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    onMounted(() => {
      if (isText.value) {
        loadTextContent();
      } else if (isPdf.value || isOffice.value) {
        loadPdf();
      } else {
        loading.value = false;
      }
    });

    onUnmounted(() => {
      pdfPages.value = [];
      pageRefs.value = [];
    });

    return {
      fileName,
      filePath,
      fileUrl,
      fileExt,
      fileType,
      textContent,
      loading,
      loadingText,
      pdfPages,
      currentPage,
      scale,
      pdfError,
      isVideo,
      isAudio,
      isText,
      isPdf,
      isOffice,
      isImage,
      goBack,
      downloadFile,
      prevPage,
      nextPage,
      zoomIn,
      zoomOut,
      setPageRef
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 61px);
  gap: 16px;
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

.loading-text {
  color: #666;
  font-size: 14px;
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
  background: #111;
}

.pdf-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 61px);
  color: #666;
  gap: 16px;
}

.empty-icon {
  color: #444;
}

.pdf-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 61px);
}

.pdf-toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 20px;
  background: #1a1a1a;
  border-bottom: 1px solid #262626;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid #333;
  border-radius: 4px;
  color: #999;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover:not(:disabled) {
  background: #262626;
  color: #fff;
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  font-size: 13px;
  color: #999;
  min-width: 80px;
  text-align: center;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 20px;
  padding-left: 20px;
  border-left: 1px solid #333;
}

.zoom-value {
  font-size: 13px;
  color: #999;
  min-width: 50px;
  text-align: center;
}

.pdf-canvas-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pdf-page {
  max-width: 100%;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border-radius: 4px;
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

  .pdf-toolbar {
    padding: 10px 12px;
    gap: 12px;
  }

  .zoom-controls {
    margin-left: 12px;
    padding-left: 12px;
  }
}
</style>