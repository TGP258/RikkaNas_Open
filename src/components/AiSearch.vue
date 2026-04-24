<template>
  <div class="ai-search-page">
    <div class="container">
      <h2>🤖 AI 智能文件查询</h2>
      <p>使用自然语言描述文件，AI 自动帮你搜索</p>

      <div class="input-box">
        <textarea
            v-model="userInput"
            rows="4"
            placeholder="例如：
我要找所有图片
查找上个月的文档
找所有压缩包
搜索名字包含毕业设计的文件
查找视频文件"
        ></textarea>
        <button @click="startAiSearch" :disabled="loading">
          {{ loading ? "AI 思考中..." : "开始 AI 查询" }}
        </button>
      </div>

      <!-- 搜索结果 -->
      <div class="result-list" v-if="resultList.length > 0">
        <h3>📄 搜索结果</h3>
        <div class="file-item" v-for="item in resultList" :key="item.path">
          <span class="icon">{{ item.isDir ? "📁" : "📄" }}</span>
          <span class="name">{{ item.name }}</span>
          <button @click="downloadFile(item.path)">下载</button>
        </div>
      </div>

      <div class="empty-tip" v-if="searched && resultList.length == 0">
        未找到相关文件
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { downloadFile } from '@/api/fileApi.js'

export default {
  name: 'AiSearch',
  data() {
    return {
      userInput: '',
      loading: false,
      searched: false,
      resultList: [],
      baseURL: 'http://localhost:3000'
    }
  },
  methods: {
    // ==============================
    // 👉 主函数：AI 查询
    // ==============================
    async startAiSearch() {
      if (!this.userInput.trim()) {
        alert('请输入内容')
        return
      }

      this.loading = true
      this.searched = true

      try {
        // 1. 调用大模型 → 获取【搜索关键词】
        const searchKeyword = await this.getKeywordFromAI(this.userInput)

        // 👇 在这里打印 AI 输出到控制台
        console.log('=====================================')
        console.log('🟢 用户输入：', this.userInput)
        console.log('🤖 AI 模型返回关键词：', searchKeyword)
        console.log('=====================================')

        // 2. 自动调用你现有的 search 接口
        const res = await axios.get("http://localhost:3000/api/files/search", {
          params: {
            keyword: searchKeyword,
            path: ''
          }
        })

        this.resultList = res.data.data || []
      } catch (err) {
        console.error(err)
        alert('AI 查询失败')
      } finally {
        this.loading = false
      }
    },

    // 🤖 核心：调用通义千问大模型
    async getKeywordFromAI(userText) {
      try {
        const response = await axios({
          method: 'POST',
          url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
          headers: {
            'Authorization': 'Bearer sk-',
            'Content-Type': 'application/json'
          },
          data: {
            model: "qwen-turbo",
            input: {
              messages: [
                {
                  role: "system",
                  content: `
                    你是一个文件搜索助手。
                    你只能输出【搜索关键词】，不能输出任何多余内容。
                    如果用户要找图片，输出：jpg,png,gif
                    如果用户要找文档，输出：doc,docx,pdf,txt
                    如果用户要找视频，输出：mp4,mov,avi
                    如果用户要找压缩包，输出：zip,rar,7z
                    如果用户输入普通文字，直接输出原文。
                    禁止解释，禁止多余内容，只输出关键词。
                  `
                },
                {
                  role: "user",
                  content: userText
                }
              ]
            },
            parameters: {
              temperature: 0.1,
              max_tokens: 20
            }
          }
        })

        const aiResult = response.data.output.text.trim()

        // 👇 也在这里打印一次
        console.log('[AI 大模型返回]', aiResult)

        return aiResult
      } catch (err) {
        console.error('AI 请求失败：', err)
        return userText
      }
    },

    // 下载（你原有方法）
    downloadFile(path) {
      downloadFile(path)
    }
  }
}
</script>

<style scoped>
.ai-search-page {
  max-width: 800px;
  margin: 50px auto;
  padding: 20px;
}
.container {
  background: #fff;
  padding: 30px;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}
textarea {
  width: 100%;
  padding: 14px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 12px;
  box-sizing: border-box;
  resize: none; /* 禁止缩放 */
  overflow: hidden; /* 去掉滚动条 */
}
button {
  width: 100%;
  padding: 14px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}
button:disabled {
  background: #a5b4fc;
}
.file-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}
.name {
  flex: 1;
}
.empty-tip {
  text-align: center;
  padding: 30px 0;
  color: #999;
}
</style>