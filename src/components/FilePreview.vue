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
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p class="loading-text">{{ loadingText }}</p>
      </div>

      <div v-else-if="isVideo" class="media-preview">
        <video controls class="video-player" autoplay>
          <source :src="fileUrl" :type="fileType">
        </video>
      </div>

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

      <div v-else-if="isText" class="text-preview">
        <pre class="text-content">{{ textContent }}</pre>
      </div>

      <div v-else-if="isPdf" class="pdf-preview">
        <div v-if="pdfPages.length === 0 && pdfError" class="pdf-empty">
          <div class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5"/>
              <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.5"/>
              <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="1.5"/>
              <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </div>
          <p>{{ pdfError }}</p>
        </div>
        <div v-else-if="pdfPages.length > 0" class="pdf-container">
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

      <div v-else-if="isDocx" class="docx-preview">
        <div v-if="docxError" class="pdf-empty">
          <div class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5"/>
              <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </div>
          <p>{{ docxError }}</p>
        </div>
        <div v-else class="docx-content" v-html="docxHtml"></div>
      </div>

      <div v-else-if="isXlsx" class="xlsx-preview">
        <div v-if="xlsxError" class="pdf-empty">
          <div class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5"/>
              <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </div>
          <p>{{ xlsxError }}</p>
        </div>
        <div v-else-if="xlsxSheets.length > 0" class="xlsx-container">
          <div class="xlsx-toolbar">
            <div class="sheet-tabs">
              <button
                v-for="(sheet, idx) in xlsxSheets"
                :key="idx"
                :class="['sheet-tab', { active: activeSheet === idx }]"
                @click="switchSheet(idx)"
              >{{ sheet.name }}</button>
            </div>
          </div>
          <div class="xlsx-table-wrapper">
            <table class="xlsx-table" v-html="xlsxSheets[activeSheet]?.html || ''"></table>
          </div>
        </div>
      </div>

      <div v-else-if="isPptx" class="pptx-preview">
        <div v-if="pptxError" class="pdf-empty">
          <div class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5"/>
              <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </div>
          <p>{{ pptxError }}</p>
        </div>
        <div v-else-if="pptxSlides.length > 0" class="pptx-container">
          <div class="pptx-toolbar">
            <button class="toolbar-btn" @click="prevSlide" :disabled="currentSlide <= 1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <span class="page-info">{{ currentSlide }} / {{ pptxSlides.length }}</span>
            <button class="toolbar-btn" @click="nextSlide" :disabled="currentSlide >= pptxSlides.length">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          <div class="pptx-slide-wrapper">
            <div class="pptx-slide" v-html="pptxSlides[currentSlide - 1]"></div>
          </div>
        </div>
      </div>

      <div v-else-if="isImage" class="image-preview">
        <img :src="fileUrl" :alt="fileName" class="preview-image">
      </div>

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
import { ref, computed, onMounted, onUnmounted, toRaw, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

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
    const docxHtml = ref('');
    const docxError = ref('');
    const xlsxSheets = ref([]);
    const activeSheet = ref(0);
    const xlsxError = ref('');
    const pptxSlides = ref([]);
    const currentSlide = ref(1);
    const pptxError = ref('');

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
    const docxExts = ['doc', 'docx'];
    const xlsxExts = ['xls', 'xlsx'];
    const pptxExts = ['ppt', 'pptx'];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];

    const isVideo = computed(() => videoExts.includes(fileExt.value));
    const isAudio = computed(() => audioExts.includes(fileExt.value));
    const isText = computed(() => textExts.includes(fileExt.value));
    const isPdf = computed(() => pdfExts.includes(fileExt.value));
    const isDocx = computed(() => docxExts.includes(fileExt.value));
    const isXlsx = computed(() => xlsxExts.includes(fileExt.value));
    const isPptx = computed(() => pptxExts.includes(fileExt.value));
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
      if (!isPdf.value) return;
      loading.value = true;
      loadingText.value = '正在加载PDF...';
      pdfError.value = '';

      try {
        const response = await axios.get(fileUrl.value, { responseType: 'arraybuffer' });
        loadingText.value = '正在渲染PDF...';
        const pdf = await pdfjsLib.getDocument({ data: response.data }).promise;
        pdfPages.value = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          pdfPages.value.push(page);
        }
        await nextTick();
        await renderPages();
      } catch (error) {
        console.error('加载PDF失败:', error);
        pdfError.value = '加载PDF失败，请尝试下载文件';
      } finally {
        loading.value = false;
      }
    };

    const renderPages = async () => {
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

    const loadDocx = async () => {
      if (!isDocx.value) return;
      loading.value = true;
      loadingText.value = '正在加载Word文档...';
      docxError.value = '';

      try {
        const response = await axios.get(fileUrl.value, { responseType: 'arraybuffer' });
        const result = await mammoth.convertToHtml({ arrayBuffer: response.data });
        docxHtml.value = result.value;
        if (result.messages.length > 0) {
          console.warn('Mammoth warnings:', result.messages);
        }
      } catch (error) {
        console.error('加载Word文档失败:', error);
        docxError.value = '加载Word文档失败，请尝试下载文件';
      } finally {
        loading.value = false;
      }
    };

    const loadXlsx = async () => {
      if (!isXlsx.value) return;
      loading.value = true;
      loadingText.value = '正在加载Excel表格...';
      xlsxError.value = '';

      try {
        const response = await axios.get(fileUrl.value, { responseType: 'arraybuffer' });
        const workbook = XLSX.read(response.data, { type: 'array' });
        const sheets = [];

        workbook.SheetNames.forEach(name => {
          const worksheet = workbook.Sheets[name];
          const html = XLSX.utils.sheet_to_html(worksheet, { editable: false });
          sheets.push({ name, html });
        });

        xlsxSheets.value = sheets;
        activeSheet.value = 0;
      } catch (error) {
        console.error('加载Excel表格失败:', error);
        xlsxError.value = '加载Excel表格失败，请尝试下载文件';
      } finally {
        loading.value = false;
      }
    };

    const switchSheet = (idx) => {
      activeSheet.value = idx;
    };

    const loadPptx = async () => {
      if (!isPptx.value) return;
      loading.value = true;
      loadingText.value = '正在加载PPT演示文稿...';
      pptxError.value = '';

      try {
        const response = await axios.get(fileUrl.value, { responseType: 'arraybuffer' });
        const data = new Uint8Array(response.data);
        const slides = [];

        const zip = await import('jszip').then(m => m.default.loadAsync(data));
        const slideFiles = Object.keys(zip.files)
          .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
          .sort((a, b) => {
            const numA = parseInt(a.match(/slide(\d+)/)[1]);
            const numB = parseInt(b.match(/slide(\d+)/)[1]);
            return numA - numB;
          });

        for (const slideFile of slideFiles) {
          const xmlContent = await zip.files[slideFile].async('text');
          const parser = new DOMParser();
          const doc = parser.parseFromString(xmlContent, 'application/xml');

          const texts = [];
          const textElements = doc.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main', 't');
          for (let i = 0; i < textElements.length; i++) {
            const text = textElements[i].textContent.trim();
            if (text) texts.push(text);
          }

          slides.push(texts.join('<br>'));
        }

        if (slides.length === 0) {
          pptxError.value = '无法解析PPT内容，请下载文件查看';
        } else {
          pptxSlides.value = slides;
        }
      } catch (error) {
        console.error('加载PPT失败:', error);
        pptxError.value = '加载PPT失败，请尝试下载文件';
      } finally {
        loading.value = false;
      }
    };

    const prevSlide = () => {
      if (currentSlide.value > 1) currentSlide.value--;
    };

    const nextSlide = () => {
      if (currentSlide.value < pptxSlides.value.length) currentSlide.value++;
    };

    onMounted(() => {
      if (isText.value) {
        loadTextContent();
      } else if (isPdf.value) {
        loadPdf();
      } else if (isDocx.value) {
        loadDocx();
      } else if (isXlsx.value) {
        loadXlsx();
      } else if (isPptx.value) {
        loadPptx();
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
      docxHtml,
      docxError,
      xlsxSheets,
      activeSheet,
      xlsxError,
      pptxSlides,
      currentSlide,
      pptxError,
      isVideo,
      isAudio,
      isText,
      isPdf,
      isDocx,
      isXlsx,
      isPptx,
      isImage,
      goBack,
      downloadFile,
      prevPage,
      nextPage,
      zoomIn,
      zoomOut,
      setPageRef,
      switchSheet,
      prevSlide,
      nextSlide
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

.media-preview {
  background: #000;
}

.video-player {
  width: 100%;
  max-height: calc(100vh - 61px);
  display: block;
}

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

.docx-preview {
  min-height: calc(100vh - 61px);
  background: #fff;
}

.docx-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 32px;
  color: #1a1a1a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 15px;
  line-height: 1.8;
}

.docx-content :deep(h1) {
  font-size: 28px;
  font-weight: 700;
  margin: 24px 0 16px;
  color: #111;
}

.docx-content :deep(h2) {
  font-size: 22px;
  font-weight: 600;
  margin: 20px 0 12px;
  color: #222;
}

.docx-content :deep(h3) {
  font-size: 18px;
  font-weight: 600;
  margin: 16px 0 10px;
  color: #333;
}

.docx-content :deep(p) {
  margin: 8px 0;
}

.docx-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 16px 0;
}

.docx-content :deep(td),
.docx-content :deep(th) {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: left;
}

.docx-content :deep(th) {
  background: #f5f5f5;
  font-weight: 600;
}

.docx-content :deep(img) {
  max-width: 100%;
  height: auto;
}

.docx-content :deep(ul),
.docx-content :deep(ol) {
  padding-left: 24px;
  margin: 8px 0;
}

.docx-content :deep(li) {
  margin: 4px 0;
}

.xlsx-preview {
  min-height: calc(100vh - 61px);
  background: #fff;
}

.xlsx-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 61px);
}

.xlsx-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: #f8f8f8;
  border-bottom: 1px solid #e0e0e0;
  overflow-x: auto;
}

.sheet-tabs {
  display: flex;
  gap: 2px;
}

.sheet-tab {
  padding: 6px 16px;
  background: transparent;
  border: 1px solid #ddd;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.sheet-tab:hover {
  background: #eee;
  color: #333;
}

.sheet-tab.active {
  background: #fff;
  color: #1a73e8;
  border-color: #1a73e8;
  font-weight: 500;
}

.xlsx-table-wrapper {
  flex: 1;
  overflow: auto;
  padding: 0;
}

.xlsx-table {
  border-collapse: collapse;
  font-size: 13px;
  color: #333;
  min-width: 100%;
}

.xlsx-table :deep(td),
.xlsx-table :deep(th) {
  border: 1px solid #e0e0e0;
  padding: 4px 8px;
  white-space: nowrap;
  min-width: 60px;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.xlsx-table :deep(th) {
  background: #f0f0f0;
  font-weight: 500;
  color: #555;
  position: sticky;
  top: 0;
  z-index: 1;
}

.pptx-preview {
  min-height: calc(100vh - 61px);
  background: #111;
}

.pptx-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 61px);
}

.pptx-toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 20px;
  background: #1a1a1a;
  border-bottom: 1px solid #262626;
}

.pptx-slide-wrapper {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.pptx-slide {
  background: #fff;
  border-radius: 8px;
  padding: 48px 56px;
  max-width: 960px;
  width: 100%;
  min-height: 400px;
  color: #1a1a1a;
  font-size: 18px;
  line-height: 1.8;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}

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

  .pdf-toolbar,
  .pptx-toolbar {
    padding: 10px 12px;
    gap: 12px;
  }

  .zoom-controls {
    margin-left: 12px;
    padding-left: 12px;
  }

  .docx-content {
    padding: 24px 16px;
  }

  .pptx-slide {
    padding: 24px;
    font-size: 14px;
  }
}
</style>
