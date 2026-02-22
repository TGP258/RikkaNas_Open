import axios from 'axios';

// 获取文件列表
export const getFileList = (path = '') => {
    return axios.get('/api/files/list', { params: { path } });
};

// 文件上传
// export const uploadFile = (file, path = '') => {
//     const formData = new FormData();
//     formData.append('file', file);
//     formData.append('path', path);
//     return axios.post('/api/files/upload', formData);
// };

// 文件下载
export const downloadFile = (path) => {
    // 直接打开下载链接
    window.open(`${axios.defaults.baseURL || 'http://localhost:3000'}/api/files/download?path=${encodeURIComponent(path)}`);
};

// 删除文件
export const deleteFile = (path) => {
    return axios.delete('/api/files/delete', { data: { path } });
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