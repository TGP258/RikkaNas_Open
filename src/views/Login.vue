<template>
  <div class="container">
    <div class="header">
      <img class="logo" src="../assets/RkCloudLOGO2.png" alt="RikkaNas Logo" width="256" height="256" style="place-items: center">
      <h1>RikaOS</h1>
      <p>个人云存储解决方案</p>
    </div>

    <div class="form-container">
      <div class="tabs">
        <div class="tab" :class="{ active: activeTab === 'login' }" @click="switchTab('login')">登录</div>
        <div class="tab" :class="{ active: activeTab === 'register' }" @click="switchTab('register')">注册</div>
      </div>

      <form v-if="activeTab === 'login'" class="form">
<!--        <div class="form-group">-->
<!--          <label for="loginDevice">设备名</label>-->
<!--          <input type="text" id="loginDevice" v-model="loginForm.device" placeholder="请输入您的设备名" required>-->
<!--        </div>-->

        <div class="form-group">
          <label for="loginUsername">用户名</label>
          <input type="text" id="loginUsername" v-model="loginForm.username" placeholder="请输入用户名" required>
        </div>

        <div class="form-group">
          <label for="loginPassword">密码</label>
          <input type="password" id="loginPassword" v-model="loginForm.password" placeholder="请输入密码" required>
        </div>

        <button type="button" class="btn" @click="handleLogin">登录</button>

        <div class="footer">
          <p>忘记密码？<a href="#">点击重置</a></p>
        </div>
      </form>

      <form v-if="activeTab === 'register'" class="form">
        <div class="form-group">
          <label for="registerDevice">设备名</label>
          <input type="text" id="registerDevice" v-model="registerForm.device" placeholder="请为您的设备命名" required>
        </div>

        <div class="form-group">
          <label for="registerUsername">用户名</label>
          <input type="text" id="registerUsername" v-model="registerForm.username" placeholder="请设置用户名" required>
        </div>

        <div class="form-group">
          <label for="registerAccount">账号</label>
          <input type="text" id="registerAccount" v-model="registerForm.account" placeholder="请设置登录账号" required>
        </div>

        <div class="form-group">
          <label for="registerPassword">密码</label>
          <input type="password" id="registerPassword" v-model="registerForm.password" placeholder="请设置密码" required>
        </div>

        <div class="form-group">
          <label for="confirmPassword">确认密码</label>
          <input type="password" id="confirmPassword" v-model="registerForm.confirmPassword" placeholder="请再次输入密码" required>
        </div>

        <button type="button" class="btn" @click="handleRegister">注册</button>
      </form>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
//import { useUserStore } from '../stores/user' // 如果需要状态管理

const router = useRouter()
const activeTab = ref('login')
const isLoading = ref(false)

// 表单数据
const loginForm = ref({
  device: '',
  username: '',
  password: ''
})

const registerForm = ref({
  device: '',
  username: '',
  account: '',
  password: '',
  confirmPassword: ''
})

// API基础URL
const API_BASE = 'http://localhost:3000/api'

// 切换标签页
const switchTab = (tabName) => {
  activeTab.value = tabName
}

// 处理登录
const handleLogin = async () => {
  const { username, password } = loginForm.value

  if (!username || !password) {
    alert('请填写所有必填字段')
    return
  }

  isLoading.value = true

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username,
        password: password
      })
    })

    const data = await response.json()

    if (response.ok) {
      alert('登录成功！')
      // 保存用户信息到localStorage或状态管理
      localStorage.setItem('user', JSON.stringify(data.user))
      // 跳转到主页面
      router.push('/desktop')
    } else {
      alert('登录失败: ' + data.error)
    }
  } catch (error) {
    console.error('登录错误:', error)
    alert('网络错误，请稍后重试')
  } finally {
    isLoading.value = false
  }
}

// 处理注册
const handleRegister = async () => {
  const { device, username, account, password, confirmPassword } = registerForm.value

  if (!device || !username || !account || !password || !confirmPassword) {
    alert('请填写所有必填字段')
    return
  }

  if (password !== confirmPassword) {
    alert('两次输入的密码不一致')
    return
  }

  isLoading.value = true

  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        device_name: device,
        username: username,
        account: account,
        password: password
      })
    })

    const data = await response.json()

    if (response.ok) {
      alert('注册成功！请登录')
      // 清空注册表单
      registerForm.value = {
        device: '',
        username: '',
        account: '',
        password: '',
        confirmPassword: ''
      }
      // 切换到登录标签页
      switchTab('login')
    } else {
      alert('注册失败: ' + data.error)
    }
  } catch (error) {
    console.error('注册错误:', error)
    alert('网络错误，请稍后重试')
  } finally {
    isLoading.value = false
  }
}
</script>
<style scoped>
.container {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 450px;
  overflow: hidden;
  margin: 0 auto;
}

.header {
  background: #40007a;
  color: white;
  padding-top: 25px;
  text-align: center;
}

.header h1 {
  font-size: 1.8rem;
  margin-bottom: 5px;
}

.logo {
  width: 80px;
  height: 80px;
  margin-bottom: 15px;
}

.form-container {
  padding: 30px;
}

.tabs {
  display: flex;
  margin-bottom: 25px;
  border-bottom: 2px solid #eee;
}

.tab {
  flex: 1;
  padding: 12px;
  text-align: center;
  cursor: pointer;
  font-weight: 600;
  color: #777;
  transition: all 0.3s ease;
}

.tab.active {
  color: #40007a;
  border-bottom: 3px solid #40007a;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.form-group input:focus {
  border-color: #40007a;
  outline: none;
}

.btn {
  width: 100%;
  padding: 14px;
  background: #40007a;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn:hover {
  background: #6800c1;
  transform: translateY(-2px);
}

.footer {
  text-align: center;
  margin-top: 20px;
  color: #777;
}

.footer a {
  color: #40007a;
  text-decoration: none;
  font-weight: 600;
}

@media (max-width: 480px) {
  .container {
    border-radius: 15px;
  }

  .form-container {
    padding: 20px;
  }

  .header {
    padding: 20px;
  }

  .header h1 {
    font-size: 1.5rem;
  }
}
</style>