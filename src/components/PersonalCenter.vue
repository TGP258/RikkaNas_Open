<template>
  <div class="personal-center">
    <div class="container">
      <h2>个人中心</h2>

      <div class="tabs">
        <button @click="tab = 1" :class="{ active: tab === 1 }">基本信息</button>
        <button @click="tab = 2" :class="{ active: tab === 2 }">修改信息</button>
        <button @click="tab = 3" :class="{ active: tab === 3 }">存储统计</button>
        <button @click="tab = 4" :class="{ active: tab === 4 }">回收站</button>
        <button @click="tab = 5" :class="{ active: tab === 5 }">共享记录</button>
      </div>

      <div class="panel" v-if="tab === 1">
        <div class="info-item">
          <label>昵称：</label>
          <span>{{ user?.username || '未设置' }}</span>
        </div>
        <div class="info-item">
          <label>账号：</label>
          <span>{{ user?.account || '未设置' }}</span>
        </div>
        <div class="info-item">
          <label>设备名：</label>
          <span>{{ user?.device_name || '未设置' }}</span>
        </div>
        <div class="info-item storage-item">
          <label>存储空间：</label>
          <div class="storage-info">
            <span>{{ storage.used }} / {{ storage.total }} GB</span>
            <div class="progress">
              <div class="bar" :style="{width: storage.percent+'%'}"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel" v-if="tab === 2">
        <div class="form-item">
          <label>昵称</label>
          <input v-model="form.username" />
        </div>
        <div class="form-item">
          <label>设备名</label>
          <input v-model="form.device_name" />
        </div>
        <div class="form-item">
          <label>新密码</label>
          <input v-model="form.password" type="password" />
        </div>
        <button class="save-btn" @click="save">保存修改</button>
      </div>

      <div class="panel" v-if="tab === 3">
        <div class="stat-grid">
          <div class="stat-item">
            <span class="stat-label">总文件：</span>
            <span class="stat-value">{{ totalFiles }} 个</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">图片：</span>
            <span class="stat-value">{{ typeCount.image }} 个</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">文档：</span>
            <span class="stat-value">{{ typeCount.doc }} 个</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">视频：</span>
            <span class="stat-value">{{ typeCount.video }} 个</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">压缩包：</span>
            <span class="stat-value">{{ typeCount.zip }} 个</span>
          </div>
        </div>
      </div>

      <div class="panel" v-if="tab === 4">
        <div v-for="item in recycle" :key="item.path" class="file-item">
          <span class="file-name">{{ item.name }}</span>
          <div class="file-actions">
            <button @click="restore(item)" class="action-btn primary">恢复</button>
            <button @click="del(item)" class="action-btn danger">彻底删除</button>
          </div>
        </div>
        <div v-if="recycle.length===0" class="empty">回收站为空</div>
      </div>

      <div class="panel" v-if="tab === 5">
        <div v-for="item in shares" :key="item.link" class="share-item">
          <div class="share-path">{{ item.filePath }}</div>
          <div class="share-stats">访问：{{ item.views }} 次</div>
          <button @click="cancel(item)" class="action-btn primary">取消共享</button>
        </div>
        <div v-if="shares.length===0" class="empty">暂无共享</div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
export default {
  data() {
    return {
      tab:1,
      user:null,
      form:{ username:'', device_name:'', password:'' },
      storage:{ total:0, used:0, percent:0 },
      recycle:[],
      shares:[],
      totalFiles:0,
      typeCount:{ image:0, doc:0, video:0, zip:0 }
    }
  },
  mounted() {
    this.loadUser()
    this.loadStorage()
    this.loadRecycle()
    this.loadShares()
    this.loadFileStats()
  },
  methods: {
    async loadUser() {
      try {
        const r = await axios.get('http://localhost:3000/api/user/profile')
        this.user = r.data.data
        this.form = { ...r.data.data, password:'' }
      } catch (e) {}
    },
    async loadStorage() {
      try {
        const r = await axios.get('http://localhost:3000/api/system/stats')
        const total = parseFloat(r.data.data[0].value)
        const used = parseFloat(r.data.data[1].value)
        this.storage = { total, used, percent: (used/total*100).toFixed(0) }
      } catch (e) {}
    },
    async loadRecycle() {
      try {
        const r = await axios.get('http://localhost:3000/api/recycle/list')
        this.recycle = r.data.data
      } catch (e) {}
    },
    async loadShares() {
      try {
        const r = await axios.get('http://localhost:3000/api/share/list')
        this.shares = r.data.data
      } catch (e) {}
    },
    async loadFileStats() {
      try {
        const r = await axios.get('http://localhost:3000/api/files/list?path=')
        const all = r.data.data
        this.totalFiles = all.length
        all.forEach(f=>{
          const n = f.name.toLowerCase()
          if (n.match(/\.(jpg|png|gif)$/)) this.typeCount.image++
          else if (n.match(/\.(pdf|doc|docx|txt)$/)) this.typeCount.doc++
          else if (n.match(/\.(mp4|mov|avi)$/)) this.typeCount.video++
          else if (n.match(/\.(zip|rar|7z)$/)) this.typeCount.zip++
        })
      } catch (e) {}
    },
    async save() {
      await axios.post('http://localhost:3000/api/user/update', this.form)
      alert('保存成功')
      this.loadUser()
    },
    async restore(item) {
      await axios.post('http://localhost:3000/api/recycle/restore', { path:item.path })
      this.loadRecycle()
    },
    async del(item) {
      await axios.post('http://localhost:3000/api/recycle/delete', { path:item.path })
      this.loadRecycle()
    },
    async cancel(item) {
      await axios.post('http://localhost:3000/api/share/cancel', { link:item.link })
      this.loadShares()
    }
  }
}
</script>

<style scoped>
.personal-center {
  padding: 20px;
}

.container {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
  max-width: 900px;
  margin: 0 auto;
  padding: 30px;
}

.container h2 {
  font-size: 1.8rem;
  color: #333;
  text-align: center;
  margin-bottom: 24px;
}

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.tabs button {
  padding: 10px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.tabs button.active {
  background: #40007a;
  color: #fff;
  border-color: #40007a;
}

.panel {
  background: #ffffff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.info-item {
  padding: 16px 0;
  font-size: 15px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item label {
  width: 100px;
  display: inline-block;
  font-weight: 500;
  color: #666;
}

.storage-item {
  align-items: flex-start;
}

.storage-info {
  flex: 1;
}

.form-item {
  margin-bottom: 20px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  color: #666;
  font-weight: 500;
}

.form-item input {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-item input:focus {
  outline: none;
  border-color: #40007a;
}

.save-btn {
  padding: 12px 24px;
  background: linear-gradient(90deg, #40007a, #6800c1);
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.save-btn:hover {
  background: #40007a;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.stat-item {
  padding: 16px;
  background: #f9f9f9;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.stat-value {
  color: #40007a;
  font-weight: 500;
  font-size: 16px;
}

.file-item, .share-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.file-item:last-child, .share-item:last-child {
  border-bottom: none;
}

.file-name, .share-path {
  color: #333;
  font-size: 14px;
}

.share-stats {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
}

.file-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.action-btn.primary {
  background: #40007a;
  color: #fff;
}

.action-btn.danger {
  background: #F44336;
  color: #fff;
}

.progress {
  width: 100%;
  max-width: 300px;
  height: 10px;
  background: #f0f0f0;
  border-radius: 8px;
  margin-top: 8px;
  overflow: hidden;
}

.bar {
  height: 100%;
  background: #40007a;
  border-radius: 8px;
  transition: width 0.3s ease;
}

.empty {
  padding: 30px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

@media (max-width: 768px) {
  .stat-grid {
    grid-template-columns: 1fr;
  }

  .file-item, .share-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .file-actions {
    margin-top: 8px;
  }
}
</style>