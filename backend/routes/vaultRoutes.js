const express = require('express');
const router = express.Router();
const multer = require('multer');
const vault = require('../utils/vault');

const upload = multer({ storage: multer.memoryStorage() });

const uploadWithVault = upload.fields([{ name: 'file', maxCount: 1 }]);

router.get('/status', (req, res) => {
    const status = vault.getStatus();
    res.json({ success: true, data: status });
});

router.post('/create', async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ success: false, error: '请设置保险库密码' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, error: '密码长度至少6位' });
        }
        const result = await vault.createVault(password);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/unlock', async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ success: false, error: '请输入密码' });
        }
        const result = await vault.unlockVault(password);
        if (result.success) {
            res.json(result);
        } else {
            res.status(401).json(result);
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/lock', async (req, res) => {
    try {
        const result = await vault.lockVault();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/list', async (req, res) => {
    try {
        const { path = '' } = req.query;
        const result = await vault.listFiles(path);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/upload', uploadWithVault, async (req, res) => {
    try {
        const { path = '' } = req.body;
        const files = req.files['file'];

        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, error: '请选择要上传的文件' });
        }

        const results = [];
        for (const file of files) {
            const result = await vault.addFile(file.buffer, file.originalname, path);
            results.push(result);
        }

        res.json({ success: true, data: results, message: `成功上传 ${results.length} 个文件` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/download', async (req, res) => {
    try {
        const { path: filePath } = req.query;
        if (!filePath) {
            return res.status(400).json({ success: false, error: '缺少文件路径' });
        }

        const fileData = await vault.getFile(filePath);
        if (!fileData) {
            return res.status(404).json({ success: false, error: '文件不存在' });
        }

        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileData.name)}"`);
        res.setHeader('Content-Length', fileData.size);
        res.send(fileData.buffer);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/delete', async (req, res) => {
    try {
        const { path: filePath } = req.body;
        if (!filePath) {
            return res.status(400).json({ success: false, error: '缺少文件路径' });
        }

        const result = await vault.deleteFile(filePath);
        if (result) {
            res.json({ success: true, message: '文件已删除' });
        } else {
            res.status(404).json({ success: false, error: '文件不存在' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/rename', async (req, res) => {
    try {
        const { oldPath, newName } = req.body;
        if (!oldPath || !newName) {
            return res.status(400).json({ success: false, error: '缺少参数' });
        }

        const result = await vault.renameFile(oldPath, newName);
        if (result) {
            res.json({ success: true, message: '重命名成功' });
        } else {
            res.status(404).json({ success: false, error: '文件不存在' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/create-folder', async (req, res) => {
    try {
        const { folderName, path = '' } = req.body;
        if (!folderName) {
            return res.status(400).json({ success: false, error: '请输入文件夹名称' });
        }

        const result = await vault.addFolder(folderName, path);
        res.json({ success: true, data: result, message: '文件夹创建成功' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/delete-folder', async (req, res) => {
    try {
        const { path: folderPath } = req.body;
        if (!folderPath) {
            return res.status(400).json({ success: false, error: '缺少文件夹路径' });
        }

        await vault.deleteFolder(folderPath);
        res.json({ success: true, message: '文件夹已删除' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/rename-folder', async (req, res) => {
    try {
        const { oldPath, newName } = req.body;
        if (!oldPath || !newName) {
            return res.status(400).json({ success: false, error: '缺少参数' });
        }

        const result = await vault.renameFolder(oldPath, newName);
        if (result) {
            res.json({ success: true, message: '文件夹重命名成功' });
        } else {
            res.status(404).json({ success: false, error: '文件夹不存在' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;