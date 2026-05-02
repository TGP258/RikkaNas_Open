// backend/systemRouter = require('express');
const si = require('systeminformation');
const {Router} = require("express/lib/express");
const os = require('os');
const router = Router(); // 创建路由实例

// 获取本机局域网IP
router.get('/ip', async (req, res) => {
    try {
        const networkInterfaces = os.networkInterfaces();
        let localIp = '127.0.0.1';

        const results = [];
        for (const name of Object.keys(networkInterfaces)) {
            for (const iface of networkInterfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    results.push({ name, address: iface.address });
                }
            }
        }

        console.log('所有网络接口:', results);

        // 过滤掉虚拟网卡
        const physicalInterfaces = results.filter(r => {
            const nameLower = r.name.toLowerCase();
            return !nameLower.includes('vmware') && 
                   !nameLower.includes('virtual') && 
                   !nameLower.includes('vethernet') &&
                   !nameLower.includes('hyper-v') &&
                   !nameLower.includes('wsl') &&
                   !nameLower.includes('docker');
        });

        console.log('物理网络接口:', physicalInterfaces);

        if (physicalInterfaces.length > 0) {
            // 优先选择WLAN或本地连接
            const wlanOrLan = physicalInterfaces.find(r => {
                const nameLower = r.name.toLowerCase();
                return nameLower.includes('wlan') || 
                       nameLower.includes('wi-fi') ||
                       nameLower.includes('无线') ||
                       nameLower.includes('本地连接') ||
                       nameLower.includes('ethernet') ||
                       nameLower.includes('以太网');
            });
            
            // 其次选择192.168.x.x开头的
            const lanIp = physicalInterfaces.find(r => r.address.startsWith('192.168.'));
            
            localIp = wlanOrLan ? wlanOrLan.address : (lanIp ? lanIp.address : physicalInterfaces[0].address);
        } else if (results.length > 0) {
            // 如果过滤后没有，就用原来的逻辑
            const lanIp = results.find(r => r.address.startsWith('192.168.'));
            localIp = lanIp ? lanIp.address : results[0].address;
        }

        console.log('最终返回的IP:', localIp);
        res.json({ code: 200, data: { ip: localIp }, msg: '获取本机IP成功' });
    } catch (error) {
        console.error('获取本机IP失败：', error);
        res.json({ code: 500, data: null, msg: '获取本机IP失败' });
    }
});

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