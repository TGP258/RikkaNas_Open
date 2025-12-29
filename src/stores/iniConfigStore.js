// stores/iniConfigStore.js
import { defineStore } from 'pinia';
import { reactive } from 'vue';
import axios from 'axios';

// 定义全局INI配置Store
export const useIniConfigStore = defineStore('iniConfig', {
    state: () => ({
        // 核心INI配置数据（响应式：{ 分组名: { 键1: 值1, ... }, ... }）
        iniData: reactive({
            DEFAULT: {
                app_name: '个性化配置',
                version: '1.0.0',
                theme: 'light',
                language: 'zh-CN'
            }
        }),
        // 配置加载状态
        isLoading: false,
        // 配置读取错误信息
        errorMsg: ''
    }),
    actions: {
        /**
         * 从后端接口读取目录下的INI配置（核心：前端无法直接读服务器目录，需后端转发）
         * @param {string} iniPath INI文件在服务器的目录路径（如：/config/user_settings.ini）
         */
        async fetchIniConfig(iniPath = '/config/user_settings.ini') {
            this.isLoading = true;
            this.errorMsg = '';
            try {
                // 调用后端接口，获取INI文件内容
                const response = await axios.get('/api/ini/read', {
                    params: { path: iniPath } // 传递INI文件路径
                });
                const iniContent = response.data.content;
                // 解析INI内容到全局状态
                this.parseIniContent(iniContent);
            } catch (err) {
                this.errorMsg = `读取INI配置失败：${err.message}`;
                console.error(err);
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * 解析INI字符串为全局状态的iniData
         * @param {string} content INI文件内容字符串
         */
        parseIniContent(content) {
            // 清空原有数据
            Object.keys(this.iniData).forEach(key => delete this.iniData[key]);

            const lines = content.split(/\r?\n/);
            let currentSection = 'DEFAULT';
            // 初始化默认分组
            this.iniData[currentSection] = {};

            lines.forEach(line => {
                const trimedLine = line.trim();
                // 跳过空行和注释行
                if (!trimedLine || trimedLine.startsWith(';')) return;

                // 匹配分组
                const sectionMatch = trimedLine.match(/^\[(.*?)\]$/);
                if (sectionMatch) {
                    currentSection = sectionMatch[1].trim();
                    if (!this.iniData[currentSection]) {
                        this.iniData[currentSection] = {};
                    }
                    return;
                }

                // 匹配键值对
                const kvMatch = trimedLine.match(/^(.*?)\s*=\s*(.*)$/);
                if (kvMatch) {
                    const key = kvMatch[1].trim();
                    const value = kvMatch[2].trim();
                    this.iniData[currentSection][key] = value;
                }
            });
        },

        /**
         * 序列化iniData为标准INI字符串
         * @returns {string} 标准INI格式内容
         */
        serializeIniData() {
            let iniContent = '';
            Object.entries(this.iniData).forEach(([sectionKey, sectionData], index) => {
                if (index > 0) iniContent += '\n';
                // 分组行
                iniContent += `[${sectionKey}]\n`;
                // 键值对行
                Object.entries(sectionData).forEach(([key, value]) => {
                    iniContent += `${key}=${value}\n`;
                });
            });
            return iniContent;
        },

        /**
         * 保存修改后的INI配置到服务器目录（同步更新后端文件）
         * @param {string} iniPath INI文件在服务器的目录路径
         */
        async saveIniConfig(iniPath = '/config/user_settings.ini') {
            this.isLoading = true;
            this.errorMsg = '';
            try {
                // 序列化全局配置为INI字符串
                const iniContent = this.serializeIniData();
                // 调用后端接口保存文件
                await axios.post('/api/ini/save', {
                    path: iniPath,
                    content: iniContent
                });
                alert('个性化配置保存成功！');
            } catch (err) {
                this.errorMsg = `保存INI配置失败：${err.message}`;
                console.error(err);
                alert(`保存失败：${err.message}`);
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * 更新单个配置项（支持组件单独修改某一键值对，无需全量保存）
         * @param {string} section 分组名
         * @param {string} key 键名
         * @param {string} value 键值
         */
        updateIniItem(section, key, value) {
            if (!this.iniData[section]) {
                // 若分组不存在，自动创建
                this.iniData[section] = {};
            }
            this.iniData[section][key] = value;
        }
    }
});