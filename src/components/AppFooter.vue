<template>
  <footer class="app-footer" :class="{ 'dark-mode': isDarkMode }">
    <div class="footer-container">
      <div class="footer-info">
        <span>© 2026 RkCloud {{ isChinese ? '本地网盘系统' : 'Local Cloud Storage' }}</span>
        <span class="separator">|</span>
        <span>{{ isChinese ? '版本' : 'Version' }}：Beta1.0.8</span>
      </div>
      <div class="footer-extra">
        <span>{{ isChinese ? '本地部署版' : 'Local Deployment' }} | {{ isChinese ? '基于' : 'Built with' }}Vue + Node.js{{ isChinese ? '开发' : '' }}</span>
        <span class="separator">|</span>
        <span>{{ isChinese ? '技术支持' : 'Support' }}：RikkaDev</span>
        <span class="separator">|</span>
        <span>RikkaCloud</span>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue';
import { useIniConfigStore } from '@/stores/iniConfigStore';

const configStore = useIniConfigStore();

const isDarkMode = computed(() => {
  return configStore.iniData.Appearance?.theme === '开';
});

const isChinese = computed(() => {
  return configStore.iniData.Language?.language !== '关';
});
</script>

<style scoped>
.app-footer {
  background-color: #f5f5f5;
  border-top: 1px solid #e5e5e5;
  padding: 15px 0;
  margin-top: auto;
}

.footer-container {
  width: 90%;
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
  font-size: 14px;
  color: #666;
}

.footer-info {
  margin-bottom: 8px;
}

.separator {
  margin: 0 8px;
  color: #999;
}

.footer-extra {
  font-size: 12px;
  color: #999;
}

/* 深色模式 */
.dark-mode {
  background-color: #1e1e1e;
  border-top-color: #333;
}

.dark-mode .footer-container,
.dark-mode .footer-info,
.dark-mode .footer-extra {
  color: #b0b0b0;
}

.dark-mode .separator {
  color: #666;
}
</style>