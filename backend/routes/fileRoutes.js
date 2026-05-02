const express = require('express');
const router = express.Router();
const multer = require('multer'); // 处理文件上传
const fileUtils = require('../utils/fileUtils');

// 初始化multer
const upload = multer({ storage: multer.memoryStorage() });

//  获取文件列表
router.get('/list', async (req, res) => {
    try {
        const { path = '' } = req.query;
        const fileList = await fileUtils.getFileList(path);
        res.json({ success: true, data: fileList });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


router.post('/upload', upload.any(), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: '请选择要上传的文件/文件夹'
            });
        }
        const { path = '' } = req.body;

        let result = [];
        // 通过 webkitRelativePath 判断是否是文件夹上传
        const isFolderUpload = req.files.some(file => file.webkitRelativePath);
        if (isFolderUpload) {
            // 处理文件夹上传
            result = await fileUtils.uploadFolder(req.files, path);
        } else {
            // 处理单个/多个文件上传
            for (const file of req.files) {
                const fileResult = await fileUtils.uploadFile(file, path);
                result.push(fileResult);
            }
        }

        res.json({
            success: true,
            data: result,
            message: `成功上传 ${result.length} 个文件/文件夹`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

//  文件下载
router.get('/download', async (req, res) => {
    try {
        const { path } = req.query;
        const fullPath = await fileUtils.downloadFile(path);
        res.download(fullPath); // Express内置下载方法
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 删除文件/文件夹
router.delete('/delete', async (req, res) => {
    try {
        const { path } = req.body;
        await fileUtils.deleteFile(path);
        res.json({ success: true, message: '删除成功' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

//  重命名
router.post('/rename', async (req, res) => {
    try {
        const { oldPath, newName } = req.body;
        const result = await fileUtils.renameFile(oldPath, newName);
        res.json({ success: true, data: result, message: '重命名成功' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 设置剪贴板（复制/剪切）
router.post('/clipboard', async (req, res) => {
    try {
        const { type, path } = req.body; // type: copy/cut
        const result = fileUtils.setClipboard(type, path);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 粘贴文件
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

// 搜索文件
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

// 创建文件夹接口
router.post('/create-folder', async (req, res) => {
    try {
        const { folderName, path = '' } = req.body;
        if (!folderName) {
            return res.status(400).json({
                success: false,
                error: '文件夹名称不能为空'
            });
        }
        const result = await fileUtils.createFolder(folderName, path);
        res.json({
            success: true,
            data: result,
            message: '文件夹创建成功'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
module.exports = router;