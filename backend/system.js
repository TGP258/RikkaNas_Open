// backend/systemRouter = require('express');
const si = require('systeminformation');
const {Router} = require("express/lib/express");
const router = Router(); // 创建路由实例

// 系统信息接口（仅存放路由相关逻辑）
router.get('/stats', async (req, res) => {
    try {
        const diskInfo = await si.fsSize();
        const mainDisk = diskInfo[0];
        const totalStorage = (mainDisk.size / (1024 ** 3)).toFixed(1) + 'GB';//这个地方计划接入user_settings ,可变单位
        const usedStorage = (mainDisk.used / (1024 ** 3)).toFixed(1) + 'GB';
        const usageRate = ((mainDisk.used / mainDisk.size) * 100).toFixed(0) + '%';
        const systemStatus = '在线';

        const systemStats = [
            { value: totalStorage, label: '总存储空间' },
            { value: usedStorage, label: '已使用空间' },
            { value: usageRate, label: '使用率' },
            { value: systemStatus, label: '系统状态' }
        ];

        res.json({ code: 200, data: systemStats, msg: '获取系统信息成功' });
    } catch (error) {
        console.error('获取系统信息失败：', error);
        res.json({ code: 500, data: null, msg: '获取系统信息失败' });
    }
});

// 导出路由实例
module.exports = router;