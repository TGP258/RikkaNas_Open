// server/routes/iniRoutes.js
const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// 服务器INI文件根目录（根据你的实际目录调整）
const INI_ROOT_DIR = path.join(__dirname, '../config');

/**
 * 接口1：读取指定路径的INI文件
 * GET /api/ini/read?path=/config/user_settings.ini
 */
router.get('/read', async (req, res) => {
    try {
        // 获取前端传递的INI文件路径
        let { path: iniPath } = req.query;
        if (!iniPath) {
            return res.status(400).json({ code: -1, msg: '请传递INI文件路径' });
        }

        // 拼接完整路径（防止路径遍历攻击）
        const fullPath = path.join(INI_ROOT_DIR, path.basename(iniPath));
        // 读取INI文件内容
        const content = await fs.readFile(fullPath, 'utf-8');

        res.status(200).json({
            code: 0,
            msg: '读取成功',
            content: content
        });
    } catch (err) {
        console.error('读取INI文件失败：', err);
        res.status(500).json({
            code: -1,
            msg: `读取失败：${err.message}`
        });
    }
});

/**
 * 接口2：保存INI文件到指定目录
 * POST /api/ini/save
 * 参数：{ path: '/config/user_settings.ini', content: 'INI文件内容' }
 */
router.post('/save', async (req, res) => {
    try {
        const { path: iniPath, content } = req.body;
        if (!iniPath || !content) {
            return res.status(400).json({ code: -1, msg: '文件路径和内容不能为空' });
        }

        // 拼接完整路径（防止路径遍历攻击）
        const fullPath = path.join(INI_ROOT_DIR, path.basename(iniPath));
        // 写入INI文件
        await fs.writeFile(fullPath, content, 'utf-8');

        res.status(200).json({
            code: 0,
            msg: '保存成功'
        });
    } catch (err) {
        console.error('保存INI文件失败：', err);
        res.status(500).json({
            code: -1,
            msg: `保存失败：${err.message}`
        });
    }
});

module.exports = router;