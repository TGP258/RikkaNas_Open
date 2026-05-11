const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileUtils = require('../utils/fileUtils');

const upload = multer({ storage: multer.memoryStorage() });

// 解码文件名（前端传输时进行了 base64 编码）
const decodeFileName = (fileName) => {
    if (!fileName) return fileName;

    try {
        // 文件夹上传：__PATH__xxx__NAME__yyy
        if (fileName.startsWith('__PATH__')) {
            const pathMatch = fileName.match(/^__PATH__(.+)__NAME__(.+)$/);
            if (pathMatch) {
                const encodedPath = pathMatch[1];
                const realFileName = pathMatch[2];
                const decodedPath = Buffer.from(encodedPath, 'base64').toString('utf8');
                return { relativePath: decodedPath, fileName: realFileName };
            }
        }

        // 单文件上传：__NAME__xxx
        if (fileName.startsWith('__NAME__')) {
            const encoded = fileName.substring(8);
            const decoded = Buffer.from(encoded, 'base64').toString('utf8');
            return { relativePath: '', fileName: decoded };
        }
    } catch (e) {
        console.error('文件名解码失败:', e);
    }

    return { relativePath: '', fileName };
};

// 清理文件名（去掉 (数字) 格式的编号前缀）
const cleanFileName = (fileName) => {
    if (!fileName) return fileName;
    return fileName.replace(/^\(\d+\)/, '');
};

// 获取文件列表
router.get('/list', async (req, res) => {
    try {
        const { path = '' } = req.query;
        const fileList = await fileUtils.getFileList(path);
        res.json({ success: true, data: fileList });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 检查文件是否存在
router.post('/check-exists', async (req, res) => {
    try {
        const { path, filename, md5 } = req.body;
        const exists = await fileUtils.checkFileExists(path, filename);
        const md5Exists = md5 ? await fileUtils.isMd5Exists(md5) : null;

        res.json({
            success: true,
            data: {
                exists,
                md5Exists,
                existingPath: exists ? fileUtils.safePath(path ? `${path}/${filename}` : filename) : null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 上传文件
router.post('/upload', upload.any(), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: '请选择要上传的文件/文件夹'
            });
        }

        // 解码所有文件名并清理编号前缀
        req.files.forEach(file => {
            const decoded = decodeFileName(file.originalname);
            file.decodedFileName = cleanFileName(decoded.fileName);
            file.decodedRelativePath = decoded.relativePath;
        });

        const { path = '' } = req.body;
        const isFolderUpload = req.files.some(file => file.decodedRelativePath);

        let result = [];
        if (isFolderUpload) {
            result = await fileUtils.uploadFolder(req.files, path);
        } else {
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
        res.status(500).json({ success: false, error: error.message });
    }
});

// 下载文件
router.get('/download', async (req, res) => {
    try {
        const { path: filePath } = req.query;
        await fileUtils.downloadFile(res, filePath);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 删除文件/文件夹
router.delete('/delete', async (req, res) => {
    try {
        const { path: filePath } = req.body;
        const fullPath = fileUtils.safePath(filePath);
        const fs = require('fs');
        const isDirectory = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();

        if (isDirectory) {
            await fileUtils.deleteFolder(filePath);
        } else {
            await fileUtils.deleteFile(filePath);
        }

        res.json({ success: true, message: '已删除' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 重命名文件/文件夹
router.post('/rename', async (req, res) => {
    try {
        const { oldPath, newName } = req.body;
        const fullPath = fileUtils.safePath(oldPath);
        const fs = require('fs');
        const isDirectory = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();

        if (isDirectory) {
            await fileUtils.renameFolder(oldPath, newName);
        } else {
            await fileUtils.renameFile(oldPath, newName);
        }

        res.json({ success: true, message: '重命名成功' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 创建文件夹
router.post('/create-folder', async (req, res) => {
    try {
        const { folderName, path = '' } = req.body;
        await fileUtils.createFolder(folderName, path);
        res.json({ success: true, message: '文件夹创建成功' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 删除文件夹
router.post('/delete-folder', async (req, res) => {
    try {
        const { path: folderPath } = req.body;
        await fileUtils.deleteFolder(folderPath);
        res.json({ success: true, message: '文件夹已删除' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 重命名文件夹
router.post('/rename-folder', async (req, res) => {
    try {
        const { oldPath, newName } = req.body;
        await fileUtils.renameFolder(oldPath, newName);
        res.json({ success: true, message: '文件夹重命名成功' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
