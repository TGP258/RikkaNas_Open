const express = require('express');
const router = express.Router();
const multer = require('multer');
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


// 解码文件名
const decodeFileName = (encodedName) => {
    try {
        // 处理 __NAME__xxx 格式
        if (encodedName.startsWith('__NAME__')) {
            const base64Str = encodedName.substring(8);
            const decodedBuffer = Buffer.from(base64Str, 'base64');
            return decodedBuffer.toString('utf-8');
        }
        // 处理 __PATH__xxx__NAME__yyy 格式
        if (encodedName.startsWith('__PATH__')) {
            const nameIndex = encodedName.lastIndexOf('__NAME__');
            if (nameIndex !== -1) {
                const base64Str = encodedName.substring(nameIndex + 8);
                const decodedBuffer = Buffer.from(base64Str, 'base64');
                return decodedBuffer.toString('utf-8');
            }
        }
        return encodedName;
    } catch (error) {
        console.error('解码文件名失败:', error);
        return encodedName;
    }
};

// 解析路径信息
const parseFilePath = (encodedName) => {
    try {
        // 处理文件夹上传：__PATH__xxx__NAME__yyy 格式
        if (encodedName.startsWith('__PATH__')) {
            const nameIndex = encodedName.lastIndexOf('__NAME__');
            if (nameIndex !== -1) {
                const pathBase64 = encodedName.substring(8, nameIndex);
                const nameBase64 = encodedName.substring(nameIndex + 8);
                const pathBuffer = Buffer.from(pathBase64, 'base64');
                const nameBuffer = Buffer.from(nameBase64, 'base64');
                const fullPath = pathBuffer.toString('utf-8');
                // 获取目录路径（去掉文件名）
                const lastSlash = fullPath.lastIndexOf('/');
                const relativePath = lastSlash !== -1 ? fullPath.substring(0, lastSlash) : '';
                return {
                    relativePath,
                    fileName: nameBuffer.toString('utf-8')
                };
            }
        }
        // 处理单文件上传：__NAME__xxx 格式
        if (encodedName.startsWith('__NAME__')) {
            const nameBase64 = encodedName.substring(8);
            const nameBuffer = Buffer.from(nameBase64, 'base64');
            return {
                relativePath: '',
                fileName: nameBuffer.toString('utf-8')
            };
        }
        // 默认情况：不包含标记，直接返回原始名称
        return { relativePath: '', fileName: encodedName };
    } catch (error) {
        console.error('解析文件路径失败:', error);
        return { relativePath: '', fileName: encodedName };
    }
};

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
        // 通过原始文件名判断是否是文件夹上传（包含 __PATH__ 标记）
        const isFolderUpload = req.files.some(file => file.originalname.startsWith('__PATH__'));
        
        // 预处理文件，解码文件名
        const processedFiles = req.files.map(file => {
            const parsed = parseFilePath(file.originalname);
            return {
                ...file,
                decodedFileName: parsed.fileName,
                decodedRelativePath: parsed.relativePath
            };
        });
        
        if (isFolderUpload) {
            // 处理文件夹上传
            result = await fileUtils.uploadFolder(processedFiles, path);
        } else {
            // 处理单个/多个文件上传
            for (const file of processedFiles) {
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

// 文件下载
router.get('/download', async (req, res) => {
    try {
        const { path } = req.query;
        // 调用downloadFile，传入req、res和path参数
        await fileUtils.downloadFile(req, res, path);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 删除文件/文件夹
router.delete('/delete', async (req, res) => {
    try {
        const { path } = req.body;
        const fullPath = fileUtils.safePath(path);
        const fs = require('fs').promises;
        
        const stats = await fs.stat(fullPath);
        if (stats.isDirectory()) {
            await fileUtils.deleteFolder(path);
        } else {
            await fileUtils.deleteFile(path);
        }
        
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

// 检查文件是否存在接口
router.post('/check-exists', async (req, res) => {
    try {
        const { path = '', filename, md5 } = req.body;
        if (!filename) {
            return res.status(400).json({ success: false, error: '文件名不能为空' });
        }
        
        const exists = await fileUtils.checkFileExists(path, filename);
        let md5Exists = false;
        if (md5) {
            md5Exists = await fileUtils.isMd5Exists(md5);
        }
        
        res.json({ 
            success: true, 
            data: { 
                exists, 
                md5Exists,
                filename 
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 文件预览接口
router.get('/preview', async (req, res) => {
    try {
        const { path } = req.query;
        const fullPath = await fileUtils.getFullFilePath(path);
        // 设置允许跨域访问资源
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.sendFile(fullPath);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
