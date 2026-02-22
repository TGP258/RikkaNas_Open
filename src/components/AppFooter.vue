<template>
  <footer class="app-footer">
    <div class="footer-container">
      <div class="footer-info">
        <span>© 2026 RkCloud 本地网盘系统</span>
        <span class="separator">|</span>
        <span>版本：v1.0.0</span>
      </div>
      <div class="footer-extra">
        <span>本地部署版 | 基于Vue + Node.js开发</span>
        <span class="separator">|</span>
        <span>技术支持：RikkaDev</span>
        <span class="separator">|</span>
        <span>梨花云</span>
      </div>
    </div>
  </footer>
</template>

<script setup>
// 可选：如果需要动态获取版本/时间，可在这里添加逻辑
// 例如从后端接口获取系统版本
// import { onMounted, ref } from 'vue';
// import axios from 'axios';
// const version = ref('v1.0.0');
// onMounted(async () => {
//   const res = await axios.get('/api/system/version');
//   version.value = res.data.version;
// });
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
</style>