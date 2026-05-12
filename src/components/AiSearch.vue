<template>
  <div class="ai-search-page">
    <div class="container">
      <h2>AI 智能文件查询</h2>
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
        <h3>搜索结果</h3>
        <div class="file-item" v-for="item in resultList" :key="item.path">
          <span class="icon">{{ item.isDir ? "文件夹" : "文件" }}</span>
          <span class="name">{{ item.name }}</span>
          <button @click="downloadFile(item.path)" class="download-btn">下载</button>
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
    async startAiSearch() {
      if (!this.userInput.trim()) {
        alert('请输入内容')
        return
      }

      this.loading = true
      this.searched = true

      try {
        const searchKeyword = await this.getKeywordFromAI(this.userInput)
        console.log('用户输入：', this.userInput)
        console.log('AI 模型返回关键词：', searchKeyword)

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

    async getKeywordFromAI(userText) {
      try {
        const apiKey = localStorage.getItem('ai_api_key') || ''
        console.log('=== AiSearch API密钥读取调试 ===')
        console.log('从localStorage读取的密钥:', apiKey)
        console.log('密钥长度:', apiKey.length)
        console.log('密钥前10位:', apiKey.substring(0, 10) + '...')
        console.log('================================')
        if (!apiKey) {
          alert('请先在系统设置中配置 API 密钥')
          return userText
        }

        const response = await axios({
          method: 'POST',
          url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
          headers: {
            'Authorization': 'Bearer ' + apiKey,
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
        console.log('[AI 大模型返回]', aiResult)
        return aiResult
      } catch (err) {
        console.error('AI 请求失败：', err)
        return userText
      }
    },

    downloadFile(path) {
      downloadFile(path)
    }
  }
}
</script>

<style scoped>
.ai-search-page {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
}

.container {
  background: rgba(255, 255, 255, 0.95);
  padding: 30px;
  border-radius: 20px;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
}

.container h2 {
  font-size: 1.8rem;
  color: #333;
  text-align: center;
  margin-bottom: 8px;
}

.container p {
  font-size: 1rem;
  color: #666;
  text-align: center;
  margin-bottom: 24px;
}

.input-box {
  margin-bottom: 24px;
}

textarea {
  width: 100%;
  padding: 14px;
  border: 2px solid #E0E0E0;
  border-radius: 12px;
  margin-bottom: 16px;
  box-sizing: border-box;
  resize: none;
  overflow: hidden;
  font-size: 14px;
  transition: border-color 0.2s;
}

textarea:focus {
  outline: none;
  border-color: #40007a;
}

.input-box button {
  width: 100%;
  padding: 14px;
  background: linear-gradient(90deg, #40007a, #6800c1);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.input-box button:disabled {
  background: #a5b4fc;
  cursor: not-allowed;
}

.result-list h3 {
  font-size: 1.2rem;
  color: #333;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #F0F0F0;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #F0F0F0;
  transition: background-color 0.2s;
}

.file-item:hover {
  background: #F9F9F9;
  padding-left: 8px;
  border-radius: 8px;
}

.file-item .icon {
  color: #40007a;
  font-weight: 500;
  margin-right: 12px;
  width: 60px;
}

.file-item .name {
  flex: 1;
  color: #333;
  font-size: 14px;
}

.download-btn {
  padding: 6px 14px;
  background: #40007a;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.download-btn:hover {
  background: #6800c1;
}

.empty-tip {
  text-align: center;
  padding: 30px 0;
  color: #999;
  font-size: 14px;
}
</style>
