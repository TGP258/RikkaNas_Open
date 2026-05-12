import { defineStore } from 'pinia';
import { reactive } from 'vue';
import axios from 'axios';

const getBackendUrl = () => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:3000`;
};

const apiClient = axios.create({
    baseURL: getBackendUrl(),
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

export const useIniConfigStore = defineStore('iniConfig', {
    state: () => ({
        iniData: reactive({
            DEFAULT: {
                app_name: '个性化配置',
                version: '1.0.0',
                theme: 'light',
                language: 'zh-CN'
            }
        }),
        isLoading: false,
        errorMsg: ''
    }),
    actions: {
        async fetchIniConfig(iniPath = '/config/user_settings.ini') {
            this.isLoading = true;
            this.errorMsg = '';
            try {
                const response = await apiClient.get('/api/ini/read', {
                    params: { path: iniPath }
                });
                const iniContent = response.data.content;
                this.parseIniContent(iniContent);
            } catch (err) {
                this.errorMsg = `读取INI配置失败：${err.message}`;
                console.error(err);
            } finally {
                this.isLoading = false;
            }
        },

        parseIniContent(content) {
            Object.keys(this.iniData).forEach(key => delete this.iniData[key]);

            const lines = content.split(/\r?\n/);
            let currentSection = 'DEFAULT';
            this.iniData[currentSection] = {};

            lines.forEach(line => {
                const trimedLine = line.trim();
                if (!trimedLine || trimedLine.startsWith(';')) return;

                const sectionMatch = trimedLine.match(/^\[(.*?)\]$/);
                if (sectionMatch) {
                    currentSection = sectionMatch[1].trim();
                    if (!this.iniData[currentSection]) {
                        this.iniData[currentSection] = {};
                    }
                    return;
                }

                const kvMatch = trimedLine.match(/^(.*?)\s*=\s*(.*)$/);
                if (kvMatch) {
                    const key = kvMatch[1].trim();
                    const value = kvMatch[2].trim();
                    this.iniData[currentSection][key] = value;
                }
            });
        },

        serializeIniData() {
            let iniContent = '';
            Object.entries(this.iniData).forEach(([sectionKey, sectionData], index) => {
                if (index > 0) iniContent += '\n';
                iniContent += `[${sectionKey}]\n`;
                Object.entries(sectionData).forEach(([key, value]) => {
                    iniContent += `${key}=${value}\n`;
                });
            });
            return iniContent;
        },

        async saveIniConfig(iniPath = '/config/user_settings.ini') {
            this.isLoading = true;
            this.errorMsg = '';
            try {
                const iniContent = this.serializeIniData();
                await apiClient.post('/api/ini/save', {
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

        updateIniItem(section, key, value) {
            if (!this.iniData[section]) {
                this.iniData[section] = {};
            }
            this.iniData[section][key] = value;
        }
    }
});
