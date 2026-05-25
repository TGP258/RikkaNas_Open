<template>
  <div class="container" :class="{ 'dark-mode': isDarkMode }">
    <div class="header">
      <h1>账户管理</h1>
      <p>用户管理与系统审计</p>
    </div>

    <div class="settings-container">
      <div class="search-section">
        <div class="search-box">
          <input v-model="s.account" placeholder="账号" class="search-input" />
          <input v-model="s.username" placeholder="昵称" class="search-input" />
          <select v-model="s.userrole" class="search-select">
            <option value="">全部角色</option>
            <option :value="1">管理员</option>
            <option :value="0">普通用户</option>
          </select>
          <select v-model="s.status" class="search-select">
            <option value="">全部状态</option>
            <option :value="1">启用</option>
            <option :value="0">禁用</option>
          </select>
          <button @click="load" class="search-btn">搜索</button>
          <button @click="openAdd" class="add-btn">新增用户</button>
        </div>
      </div>

      <div class="table-box">
        <table>
          <thead>
          <tr>
            <th>ID</th>
            <th>账号</th>
            <th>昵称</th>
            <th>角色</th>
            <th>状态</th>
            <th>存储空间</th>
            <th>操作</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="u in list" :key="u.id">
            <td>{{ u.id }}</td>
            <td>{{ u.account }}</td>
            <td>{{ u.username }}</td>
            <td>{{ u.userrole == 1 ? '管理员' : '普通用户' }}</td>
            <td :class="u.status == 1 ? 'status-enabled' : 'status-disabled'">
              {{ u.status == 1 ? '启用' : '禁用' }}
            </td>
            <td>{{ (u.storage_quota / 1024 / 1024 / 1024).toFixed(1) }}GB</td>
            <td class="action-cell">
              <button @click="openEdit(u)" class="mini-btn">编辑</button>
              <button @click="openResetPwd(u)" class="mini-btn">重置密码</button>
              <button @click="doDelete(u)" class="mini-btn danger">删除</button>
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <div class="log-tabs">
        <button @click="logTab = 1" :class="logTab === 1 ? 'tab-active' : ''">登录日志</button>
        <button @click="logTab = 2" :class="logTab === 2 ? 'tab-active' : ''">操作日志</button>
      </div>

      <div class="log-container" v-if="logTab === 1">
        <div class="log-item" v-for="l in loginLogs" :key="l.id">
          [{{ l.created_at }}] {{ l.account }} {{ l.status ? '登录成功' : '登录失败' }} IP：{{ l.ip }}
        </div>
      </div>

      <div class="log-container" v-if="logTab === 2">
        <div class="log-item" v-for="l in operLogs" :key="l.id">
          [{{ l.created_at }}] {{ l.account }} {{ l.action }}
        </div>
      </div>
    </div>

    <div v-if="addShow" class="modal">
      <div class="modal-card">
        <h2>新增用户</h2>
        <input v-model="form.account" placeholder="账号" class="form-input" />
        <input v-model="form.password" placeholder="密码" type="password" class="form-input" />
        <input v-model="form.username" placeholder="昵称" class="form-input" />
        <input v-model="form.device_name" placeholder="设备名称" class="form-input" />
        <select v-model="form.userrole" class="form-select">
          <option :value="0">普通用户</option>
          <option :value="1">管理员</option>
        </select>
        <input v-model="form.storage_quota" placeholder="存储空间（GB）" class="form-input" />
        <select v-model="form.status" class="form-select">
          <option :value="1">启用</option>
          <option :value="0">禁用</option>
        </select>
        <div class="modal-buttons">
          <button @click="addUser" class="confirm-btn">确认创建</button>
          <button @click="addShow = false" class="cancel-btn">取消</button>
        </div>
      </div>
    </div>

    <div v-if="editShow" class="modal">
      <div class="modal-card">
        <h2>编辑用户</h2>
        <input v-model="form.username" placeholder="昵称" class="form-input" />
        <input v-model="form.email" placeholder="邮箱" class="form-input" />
        <select v-model="form.userrole" class="form-select">
          <option :value="0">普通用户</option>
          <option :value="1">管理员</option>
        </select>
        <input v-model="form.storage_quota" placeholder="存储空间（GB）" class="form-input" />
        <select v-model="form.status" class="form-select">
          <option :value="1">启用</option>
          <option :value="0">禁用</option>
        </select>
        <div class="modal-buttons">
          <button @click="editUser" class="confirm-btn">保存</button>
          <button @click="editShow = false" class="cancel-btn">取消</button>
        </div>
      </div>
    </div>

    <div v-if="resetPwdShow" class="modal">
      <div class="modal-card">
        <h2>重置密码</h2>
        <input v-model="newPwd" placeholder="新密码" type="password" class="form-input" />
        <div class="modal-buttons">
          <button @click="resetPwd" class="confirm-btn">确认重置</button>
          <button @click="resetPwdShow = false" class="cancel-btn">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import axios from 'axios'
import { useIniConfigStore } from '@/stores/iniConfigStore'

// 深色模式状态
const configStore = useIniConfigStore();
const isDarkMode = computed(() => {
  return configStore.iniData.Appearance?.theme === '开';
});

// 获取后端URL
const getBackendUrl = () => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:3000`;
};

const list = ref([])
const loginLogs = ref([])
const operLogs = ref([])
const logTab = ref(1)

const s = reactive({ account: '', username: '', userrole: '', status: '' })
const addShow = ref(false)
const editShow = ref(false)
const resetPwdShow = ref(false)
const newPwd = ref('')

const form = reactive({
  id: 0,
  account: '',
  password: '',
  username: '',
  device_name: '',
  userrole: 0,
  storage_quota: 1,
  status: 1,
  email: ''
})

const load = async () => {
  try {
    const r = await axios.get(`${getBackendUrl()}/api/admin/users`, { params: s })
    console.log('用户列表接口返回：', r.data) // 确认数据
    list.value = r.data.data
  } catch (e) {
    console.error('加载用户列表失败：', e)
  }
}
const loadLogs = async () => {
  const a = await axios.get(`${getBackendUrl()}/api/admin/logs/login`)
  const b = await axios.get(`${getBackendUrl()}/api/admin/logs/operation`)
  loginLogs.value = a.data.data
  operLogs.value = b.data.data
}

const openAdd = () => {
  addShow.value = true
  Object.assign(form, {
    account: '',
    password: '',
    username: '',
    device_name: '',
    userrole: 0,
    storage_quota: 1,
    status: 1
  })
}

const openEdit = (u) => {
  editShow.value = true
  Object.assign(form, u)
  form.storage_quota = (u.storage_quota / 1024 / 1024 / 1024).toFixed(1)
}

const openResetPwd = (u) => {
  resetPwdShow.value = true
  form.id = u.id
}

const addUser = async () => {
  const f = { ...form }
  f.storage_quota = f.storage_quota * 1024 * 1024 * 1024
  await axios.post(`${getBackendUrl()}/api/admin/users/add`, f)
  addShow.value = false
  load()
}

const editUser = async () => {
  const f = { ...form }
  f.storage_quota = f.storage_quota * 1024 * 1024 * 1024
  await axios.post(`${getBackendUrl()}/api/admin/users/update`, f)
  editShow.value = false
  load()
}

const resetPwd = async () => {
  await axios.post(`${getBackendUrl()}/api/admin/users/reset-pwd`, { id: form.id, password: newPwd.value })
  resetPwdShow.value = false
}

const doDelete = async (u) => {
  if (!confirm('确定删除？将删除该用户所有数据')) return
  await axios.post(`${getBackendUrl()}/api/admin/users/delete`, { id: u.id })
  load()
}

onMounted(async () => {
  // 加载系统配置
  await configStore.fetchIniConfig();
  load()
  loadLogs()
})
</script>

<style scoped>
.container {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 900px;
  overflow: hidden;
  margin: 20px auto;
}

.header {
  background: #40007a;
  color: white;
  padding: 25px;
  text-align: center;
}

.header h1 {
  font-size: 1.8rem;
  margin-bottom: 5px;
}

.header p {
  font-size: 1rem;
  margin: 0;
}

.settings-container {
  padding: 30px;
}

.search-section {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.search-box {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.search-input,
.search-select {
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
}

.search-btn {
  background: #40007a;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
}

.add-btn {
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
}

.table-box {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead tr {
  background: #f5f5f5;
}

th,
td {
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

.action-cell {
  display: flex;
  gap: 6px;
}

.mini-btn {
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 6px;
  border: none;
  background: #40007a;
  color: white;
  cursor: pointer;
}

.mini-btn.danger {
  background: #F44336;
}

.status-enabled {
  color: #4CAF50;
  font-weight: 500;
}

.status-disabled {
  color: #F44336;
  font-weight: 500;
}

.log-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.log-tabs button {
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
}

.tab-active {
  background: #40007a !important;
  color: white;
  border-color: #40007a !important;
}

.log-container {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.log-item {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-card {
  background: white;
  width: 400px;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-card h2 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.25rem;
  color: #333;
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 14px;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.confirm-btn {
  background: #40007a;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
}

.cancel-btn {
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
}

/* 深色模式样式 */
.container.dark-mode {
  background: rgba(30, 30, 30, 0.95);
  color: #e0e0e0;
}

.container.dark-mode .header {
  background: #2a2a2a;
}

.container.dark-mode .settings-container,
.container.dark-mode .search-section,
.container.dark-mode .table-box,
.container.dark-mode .log-container {
  background: #1e1e1e;
}

.container.dark-mode .search-input,
.container.dark-mode .search-select,
.container.dark-mode .form-input,
.container.dark-mode .form-select {
  background: #2a2a2a;
  color: #e0e0e0;
  border-color: #444;
}

.container.dark-mode thead tr {
  background: #2a2a2a;
}

.container.dark-mode th,
.container.dark-mode td {
  color: #e0e0e0;
  border-bottom-color: #333;
}

.container.dark-mode .log-tabs button {
  background: #2a2a2a;
  color: #b0b0b0;
  border-color: #333;
}

.container.dark-mode .log-item {
  color: #e0e0e0;
  border-bottom-color: #333;
}

.container.dark-mode .mini-btn {
  background: #7c4dff;
  color: white;
}

.container.dark-mode .modal-card {
  background: #1e1e1e;
  color: #e0e0e0;
}

.container.dark-mode .modal-card h2 {
  color: #e0e0e0;
}

.container.dark-mode .cancel-btn {
  background: #444;
  color: #e0e0e0;
}
</style>