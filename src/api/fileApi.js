import axios from 'axios';

// 根据当前页面的主机名动态设置后端地址
const getBackendUrl = () => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:3000`;
};

// 创建axios实例，直接请求后端（不走Vite代理）
const apiClient = axios.create({
    baseURL: getBackendUrl(),
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

export const getFileList = (path = '') => {
    return apiClient.get('/api/files/list', { params: { path } });
};

export const deleteFile = (path) => {
    return apiClient.delete('/api/files/delete', { data: { path } });
};

export const downloadFile = (path) => {
    return apiClient.get('/api/files/download', { params: { path }, responseType: 'blob' });
};

// 重命名
export const renameFile = (oldPath, newName) => {
    return apiClient.post('/api/files/rename', { oldPath, newName });
};

// 设置剪贴板（复制/剪切）
export const setClipboard = (type, path) => {
    return apiClient.post('/api/files/clipboard', { type, path });
};

// 粘贴文件
export const pasteFile = (targetPath) => {
    return apiClient.post('/api/files/paste', { targetPath });
};

// 搜索文件
export const searchFiles = (keyword, path = '') => {
    return apiClient.get('/api/files/search', { params: { keyword, path } });
};

// ===== 新增：创建文件夹 =====
export const createFolder = (folderName, path = '') => {
    return apiClient.post('/api/files/create-folder', { folderName, path });
};

// ===== 升级：文件上传（支持文件夹） =====
export const uploadFile = (files, path = '') => {
    const formData = new FormData();
    for (const file of files) {
        formData.append('file', file);
    }
    formData.append('path', path);
    return apiClient.post('/api/files/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};

// 获取本机局域网IP
export const getLocalIp = () => {
    return apiClient.get('/api/system/ip');
};