<template>
  <div class="personal-center">
    <h2>👤 个人中心</h2>

    <div class="tabs">
      <button @click="tab = 1" :class="{ active: tab === 1 }">基本信息</button>
      <button @click="tab = 2" :class="{ active: tab === 2 }">修改信息</button>
      <button @click="tab = 3" :class="{ active: tab === 3 }">存储统计</button>
      <button @click="tab = 4" :class="{ active: tab === 4 }">回收站</button>
      <button @click="tab = 5" :class="{ active: tab === 5 }">共享记录</button>
    </div>

    <div class="panel" v-if="tab === 1">
      <div class="info-item"><label>昵称：</label>{{ user?.username || '未设置' }}</div>
      <div class="info-item"><label>账号：</label>{{ user?.account || '未设置' }}</div>
      <div class="info-item"><label>设备名：</label>{{ user?.device_name || '未设置' }}</div>
      <div class="info-item"><label>存储空间：</label>
        {{ storage.used }} / {{ storage.total }} GB
        <div class="progress"><div class="bar" :style="{width: storage.percent+'%'}"></div></div>
      </div>
    </div>

    <div class="panel" v-if="tab === 2">
      <div class="form-item"><label>昵称</label><input v-model="form.username" /></div>
      <div class="form-item"><label>设备名</label><input v-model="form.device_name" /></div>
      <div class="form-item"><label>新密码</label><input v-model="form.password" type="password" /></div>
      <button class="save-btn" @click="save">保存修改</button>
    </div>

    <div class="panel" v-if="tab === 3">
      <div class="stat-item"><span>总文件：</span>{{ totalFiles }} 个</div>
      <div class="stat-item"><span>图片：</span>{{ typeCount.image }} 个</div>
      <div class="stat-item"><span>文档：</span>{{ typeCount.doc }} 个</div>
      <div class="stat-item"><span>视频：</span>{{ typeCount.video }} 个</div>
      <div class="stat-item"><span>压缩包：</span>{{ typeCount.zip }} 个</div>
    </div>

    <div class="panel" v-if="tab === 4">
      <div v-for="item in recycle" :key="item.path" class="file-item">
        <span>{{ item.name }}</span>
        <div>
          <button @click="restore(item)">恢复</button>
          <button @click="del(item)">彻底删除</button>
        </div>
      </div>
      <div v-if="recycle.length===0" class="empty">回收站为空</div>
    </div>

    <div class="panel" v-if="tab === 5">
      <div v-for="item in shares" :key="item.link" class="share-item">
        <div>{{ item.filePath }}</div>
        <div>访问：{{ item.views }} 次</div>
        <button @click="cancel(item)">取消共享</button>
      </div>
      <div v-if="shares.length===0" class="empty">暂无共享</div>
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
.personal-center{max-width:900px;margin:40px auto;padding:20px}
.tabs{display:flex;gap:10px;margin-bottom:20px}
.tabs button{padding:10px 16px;border:none;border-radius:6px;background:#f1f5f9;cursor:pointer}
.tabs button.active{background:#6366f1;color:#fff}
.panel{background:#fff;padding:24px;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.05)}
.info-item{padding:12px 0;font-size:15px}
.info-item label{width:100px;display:inline-block;font-weight:500}
.form-item{margin-bottom:16px}
.form-item label{display:block;margin-bottom:6px}
.form-item input{width:100%;padding:10px;border:1px solid #ddd;border-radius:6px}
.save-btn{padding:10px 20px;background:#6366f1;color:#fff;border:none;border-radius:6px;cursor:pointer}
.stat-item{padding:8px 0}
.file-item,.share-item{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #eee}
.file-item button,.share-item button{margin-left:8px;padding:6px 10px;background:#6366f1;color:#fff;border:none;border-radius:4px}
.progress{width:200px;height:8px;background:#eee;border-radius:4px;margin-top:6px}
.bar{height:100%;background:#6366f1;border-radius:4px}
.empty{padding:20px;text-align:center;color:#999}
</style>