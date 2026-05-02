import axios from 'axios';

export const getFileList = (path = '') => {
    return axios.get('/api/files/list', { params: { path } });
};

export const deleteFile = (path) => {
    return axios.delete('/api/files/delete', { data: { path } });
};

export const downloadFile = (path) => {
    return axios.get('/api/files/download', { params: { path }, responseType: 'blob' });
};

// 重命名
export const renameFile = (oldPath, newName) => {
    return axios.post('/api/files/rename', { oldPath, newName });
};

// 设置剪贴板（复制/剪切）
export const setClipboard = (type, path) => {
    return axios.post('/api/files/clipboard', { type, path });
};

// 粘贴文件
export const pasteFile = (targetPath) => {
    return axios.post('/api/files/paste', { targetPath });
};

// 搜索文件
export const searchFiles = (keyword, path = '') => {
    return axios.get('/api/files/search', { params: { keyword, path } });
};

// ===== 新增：创建文件夹 =====
export const createFolder = (folderName, path = '') => {
    return axios.post('/api/files/create-folder', { folderName, path });
};

// ===== 升级：文件上传（支持文件夹） =====
export const uploadFile = (files, path = '') => {
    const formData = new FormData();
    // 支持多文件/文件夹上传
    for (const file of files) {
        formData.append('file', file);
    }
    formData.append('path', path);
    return axios.post('/api/files/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};