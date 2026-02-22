const express = require('express');
const router = express.Router();
const multer = require('multer'); // 处理文件上传，需安装：npm i multer
const fileUtils = require('../utils/fileUtils');

// 初始化multer（内存存储）
const upload = multer({ storage: multer.memoryStorage() });

// 1. 获取文件列表
router.get('/list', async (req, res) => {
    try {
        const { path = '' } = req.query;
        const fileList = await fileUtils.getFileList(path);
        res.json({ success: true, data: fileList });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. 文件上传
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: '请选择要上传的文件' });
        }
        const { path = '' } = req.body;
        const result = await fileUtils.uploadFile(req.file, path);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. 文件下载
router.get('/download', async (req, res) => {
    try {
        const { path } = req.query;
        const fullPath = await fileUtils.downloadFile(path);
        res.download(fullPath); // Express内置下载方法
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. 删除文件/文件夹
router.delete('/delete', async (req, res) => {
    try {
        const { path } = req.body;
        await fileUtils.deleteFile(path);
        res.json({ success: true, message: '删除成功' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 5. 重命名
router.post('/rename', async (req, res) => {
    try {
        const { oldPath, newName } = req.body;
        const result = await fileUtils.renameFile(oldPath, newName);
        res.json({ success: true, data: result, message: '重命名成功' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 6. 设置剪贴板（复制/剪切）
router.post('/clipboard', async (req, res) => {
    try {
        const { type, path } = req.body; // type: copy/cut
        const result = fileUtils.setClipboard(type, path);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 7. 粘贴文件
router.post('/paste', async (req, res) => {
    try {
        const { targetPath = '' } = req.body;
        const clipboard = fileUtils.getClipboard();
        if (!clipboard.type || !clipboard.path) {
            return res.status(400).json({ success: false, error: '剪贴板为空' });
        }
        // 拼接目标路径
        const sourceName = clipboard.path.split('/').pop();
        const targetFullPath = `${targetPath}/${sourceName}`;
        // 执行复制/剪切
        if (clipboard.type === 'copy') {
            await fileUtils.copyFile(clipboard.path, targetFullPath);
        } else if (clipboard.type === 'cut') {
            await fileUtils.moveFile(clipboard.path, targetFullPath);
            // 剪切后清空剪贴板
            fileUtils.setClipboard('', '');
        }
        res.json({ success: true, message: '粘贴成功' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 8. 搜索文件
router.get('/search', async (req, res) => {
    try {
        const { keyword, path = '' } = req.query;
        if (!keyword) {
            return res.status(400).json({ success: false, error: '请输入搜索关键词' });
        }
        const result = await fileUtils.searchFiles(keyword, path);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;