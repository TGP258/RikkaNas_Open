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

    <!-- 1. 基本信息 -->
    <div class="panel" v-if="tab === 1">
      <div class="info-item"><label>昵称：</label>{{ userInfo.username }}</div>
      <div class="info-item"><label>账号：</label>{{ userInfo.account }}</div>
      <div class="info-item"><label>设备名：</label>{{ userInfo.device_name }}</div>
      <div class="info-item"><label>存储空间：</label>
        {{ storage.used }} / {{ storage.total }} GB
        <div class="progress"><div class="bar" :style="{width: storage.percent+'%'}"></div></div>
      </div>
    </div>

    <!-- 2. 修改信息 -->
    <div class="panel" v-if="tab === 2">
      <div class="form-item"><label>昵称</label><input v-model="editForm.username" /></div>
      <div class="form-item"><label>设备名</label><input v-model="editForm.device_name" /></div>
      <div class="form-item"><label>新密码</label><input v-model="editForm.password" type="password" /></div>
      <button class="save-btn" @click="saveProfile">保存修改</button>
    </div>

    <!-- 3. 存储统计 -->
    <div class="panel" v-if="tab === 3">
      <div class="stat-item">图片文件：{{ stats.image }} 个</div>
      <div class="stat-item">文档文件：{{ stats.doc }} 个</div>
      <div class="stat-item">视频文件：{{ stats.video }} 个</div>
      <div class="stat-item">压缩文件：{{ stats.zip }} 个</div>
      <div class="stat-item">总文件数：{{ stats.total }} 个</div>
    </div>

    <!-- 4. 回收站 -->
    <div class="panel" v-if="tab === 4">
      <div v-for="item in recycleBin" :key="item.path" class="file-item">
        <span>{{ item.name }}</span>
        <div>
          <button @click="restoreFile(item)">恢复</button>
          <button @click="deleteForever(item)">彻底删除</button>
        </div>
      </div>
      <div v-if="recycleBin.length === 0">回收站暂无文件</div>
    </div>

    <!-- 5. 共享记录 -->
    <div class="panel" v-if="tab === 5">
      <div v-for="item in shareList" :key="item.link" class="share-item">
        <div>{{ item.name }}</div>
        <div>访问：{{ item.views }} 次</div>
        <button @click="cancelShare(item)">取消共享</button>
      </div>
      <div v-if="shareList.length === 0">暂无共享记录</div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
export default {
  name: "PersonalCenter",
  data() {
    return {
      tab: 1,
      userInfo: {
        username: "",
        account: "",
        device_name: "",
      },
      editForm: {
        username: "",
        device_name: "",
        password: ""
      },
      storage: {
        total: 0,
        used: 0,
        percent: 0
      },
      stats: { image: 0, doc: 0, video: 0, zip: 0, total: 0 },
      recycleBin: [],
      shareList: []
    };
  },
  mounted() {
    this.loadUserInfo()
    this.loadStorageInfo()
  },
  methods: {
    // 加载当前登录用户信息
    async loadUserInfo() {
      try {
        const res = await axios.get("http://localhost:3000/api/admin/info")
        this.userInfo = res.data
        this.editForm.username = res.data.username
        this.editForm.device_name = res.data.device_name
      } catch (e) {
        console.error(e)
      }
    },

    // 加载系统存储信息
    async loadStorageInfo() {
      try {
        const res = await axios.get("http://localhost:3000/api/system/stats")
        const data = res.data.data
        const total = parseFloat(data[0].value)
        const used = parseFloat(data[1].value)
        const percent = Math.round((used / total) * 100)

        this.storage = { total, used, percent }
      } catch (e) {
        console.error(e)
      }
    },

    // 保存修改
    saveProfile() {
      this.userInfo.username = this.editForm.username
      this.userInfo.device_name = this.editForm.device_name
      alert("保存成功")
    },

    // 回收站
    restoreFile(item) {
      alert(`已恢复：${item.name}`)
    },
    deleteForever(item) {
      alert(`已彻底删除：${item.name}`)
    },

    // 共享
    cancelShare(item) {
      alert(`已取消共享：${item.name}`)
    }
  }
};
</script>

<style scoped>
.personal-center {
  max-width: 900px;
  margin: 40px auto;
  padding: 20px;
}
.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.tabs button {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  background: #f1f5f9;
  cursor: pointer;
}
.tabs button.active {
  background: #6366f1;
  color: white;
}
.panel {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}
.info-item {
  padding: 12px 0;
  font-size: 15px;
}
.info-item label {
  width: 100px;
  display: inline-block;
  font-weight: 500;
}
.form-item {
  margin-bottom: 16px;
}
.form-item label {
  display: block;
  margin-bottom: 6px;
}
.form-item input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
}
.save-btn {
  padding: 10px 20px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.stat-item {
  padding: 10px 0;
  font-size: 15px;
}
.file-item, .share-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}
.file-item button, .share-item button {
  margin-left: 8px;
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  background: #6366f1;
  color: white;
  cursor: pointer;
}
.progress {
  width: 200px;
  height: 8px;
  background: #eee;
  border-radius: 4px;
  margin-top: 6px;
}
.bar {
  height: 100%;
  background: #6366f1;
  border-radius: 4px;
}
</style>