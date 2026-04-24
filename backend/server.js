// backend/server.js
const express = require('express');
const iniRoutes = require('./routes/iniRoutes');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg'); // 从 'pg' 库中导入 Pool
const fileRoutes = require('./routes/fileRoutes'); // 文件管理器
const fileUtils = require('./utils/fileUtils'); // 文件管理器
const app = express();
const path = require('path');
const fs = require('fs/promises');
app.use(cors());
app.use(express.json());

// 初始化storage目录（启动时执行）
fileUtils.initStorage().catch(err => console.error('Storage初始化失败：', err)); // 新增

// 注册路由
app.use('/api/ini', iniRoutes);
app.use('/api/files', fileRoutes); // 新增文件管理路由

// 此处可配置跨域（开发环境）
// 跨域中间件
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
app.use(require('cors')());

// 核心：注册路由，拼接为 /api/ini/save
app.use('/api/ini', iniRoutes);

// 创建数据库连接
const db = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'rikkanas_db' // 需要先创建这个数据库
});

// 连接数据库
db.connect((err) => {
    if (err) {
        console.error('数据库连接失败:', err);
        return;
    }
    console.log('成功连接到MySQL数据库');

    // 创建用户表（如果不存在）
    //要求非空可能导致该脚本无法运行
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      device_name VARCHAR(255) NOT NULL,
      username VARCHAR(255) NOT NULL UNIQUE,
      userrole INT, 
      account VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ;

    db.query(createTableQuery, (err) => {
        if (err) {
            console.error('创建表失败:', err);
        } else {
            console.log('用户表已就绪');
        }
    });
});
//检查是否是新用户
app.get('/api/check-has-users', (req, res) => {
    // 查询用户表的记录数
    const query = 'SELECT COUNT(*) AS userCount FROM users';
    console.log('已检查用户信息');
    db.query(query, (err, results) => {
        if (err) {
            console.error('查询用户数量失败:', err);
            return res.status(500).json({
                success: false,
                error: '数据库查询错误'
            });
        }

        // 提取用户数量，判断是否有已注册用户
        const userCount = results[0].userCount;
        const hasUsers = userCount > 0;

        res.status(200).json({
            success: true,
            hasUsers: hasUsers, // true=有用户，false=无用户
            userCount: userCount // 可选：返回用户数量，便于调试
        });
    });
});

// 注册接口
app.post('/api/register', async (req, res) => {
    try {
        const { device_name, username, account, password } = req.body;

        // 验证必填字段
        if (!device_name || !username || !account || !password) {
            return res.status(400).json({ error: '所有字段都是必填的' });
        }

        // 检查用户名是否已存在
        const checkUserQuery = 'SELECT * FROM users WHERE username = ? OR account = ?';
        db.query(checkUserQuery, [username, account], async (err, results) => {
            if (err) {
                return res.status(500).json({ error: '数据库查询错误' });
            }

            if (results.length > 0) {
                return res.status(400).json({ error: '用户名或账号已存在' });
            }

            // 加密密码
            const hashedPassword = await bcrypt.hash(password, 10);

            // 插入新用户
            const insertQuery = 'INSERT INTO users (device_name, username, account, password) VALUES (?, ?, ?, ?)';
            db.query(insertQuery, [device_name, username, account, hashedPassword], (err, results) => {
                if (err) {
                    return res.status(500).json({ error: '注册失败' });
                }
                res.json({ message: '注册成功', userId: results.insertId });
            });
        });
    } catch (error) {
        res.status(500).json({ error: '服务器错误' });
    }
});

// 登录接口
app.post('/api/login', (req, res) => {
    const { username, password, device_name } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码是必填的' });
    }

    // 查询用户
    const query = 'SELECT * FROM users WHERE (username = ? OR account = ?) ';
    db.query(query, [username, username], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: '数据库查询错误' });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: '用户名或设备名不正确' });
        }

        const user = results[0];

        // 验证密码
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: '密码不正确' });
        }

        // res.json({
        //     message: '登录成功',
        //     user: {
        //         id: user.id,
        //         username: user.username,
        //         device_name: user.device_name,
        //         account: user.account
        //     }
        // });

        //优化版本
        res.status(200).json({
            success: true, // 新增：前端可通过success快速判断是否登录成功
            message: '登录成功',
            data: { // 统一用data包裹用户信息，符合RESTful规范
                user: {
                    id: user.id,
                    username: user.username, // 核心：传回用户名
                    device_name: user.device_name,
                    account: user.account,
                    userrole: user.userrole // 可选：如果需要展示角色，也一并返回
                }
            }
        });

    });
});
app.get('/api/admin/info', async (req, res) => {
    try {
        // 使用 MySQL 的参数占位符 '?'
        const queryText = "SELECT username FROM users";

        // 使用 db.query 方法执行查询
        db.query(queryText, [1], (err, results) => {
            if (err) {
                console.error('数据库查询失败:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (results.length > 0) {
                // 如果找到了用户，则返回一个包含用户名的 JSON 对象
                const adminName = results[0].username;
                res.json({ name: adminName });
            } else {
                // 如果没有找到管理员用户
                res.status(404).json({ error: 'Admin user not found' });
            }
        });
    } catch (error) {
        // 在异步函数中捕获同步错误
        res.status(500).json({ error: '服务器错误' });
    }
});
const system = require('./utils/system'); // 路径：和 server.js 同级，直接写文件名
// 注册路由，统一添加前缀 /api/system（接口完整路径变为 /api/system/stats）
app.use('/api/system', system);
console.log('系统服务：监控 已启动')


// 1. 获取当前用户信息
app.get('/api/user/profile', async (req, res) => {
    try {
        const query = 'SELECT id, username, account, device_name, created_at FROM users LIMIT 1';
        db.query(query, (err, results) => {
            if (err || results.length === 0) {
                return res.status(404).json({ success: false });
            }
            res.json({ success: true, data: results[0] });
        });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// 2. 修改用户信息
app.post('/api/user/update', async (req, res) => {
    try {
        const { username, device_name, password } = req.body;
        let sql = 'UPDATE users SET username=?, device_name=?';
        let params = [username, device_name];

        if (password && password.trim() !== '') {
            const hashedPwd = await bcrypt.hash(password, 10);
            sql += ', password=?';
            params.push(hashedPwd);
        }

        db.query(sql, params, (err) => {
            if (err) return res.json({ success: false, message: '修改失败' });
            res.json({ success: true, message: '修改成功' });
        });
    } catch (e) {
        res.json({ success: false });
    }
});

// 3. 获取回收站文件
app.get('/api/recycle/list', async (req, res) => {
    try {
        const list = await fileUtils.getRecycleList();
        res.json({ success: true, data: list });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false });
    }
});

// 4. 恢复文件
app.post('/api/recycle/restore', async (req, res) => {
    try {
        const { path } = req.body;
        await fileUtils.restoreFile(path);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

// 5. 彻底删除文件
app.post('/api/recycle/delete', async (req, res) => {
    try {
        const { path } = req.body;
        await fileUtils.forceDelete(path);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});


// 创建共享
app.post('/api/share/create', (req, res) => {
    const { filePath } = req.body;
    const link = fileUtils.createShare(filePath);
    res.json({ success: true, link });
});

// 访问共享文件
app.get('/api/share/:link', async (req, res) => {
    const { link } = req.params;
    const share = fileUtils.getShareList().find(s => s.link === link);
    if (!share) return res.status(404).send('共享不存在');

    share.views++;
    const filePath = fileUtils.safePath(share.filePath);
    res.download(filePath);
});


// 6. 获取共享记录
app.get('/api/share/list', (req, res) => {
    res.json({ success: true, data: fileUtils.getShareList() });
});

// 7. 取消共享
app.post('/api/share/cancel', (req, res) => {
    const { link } = req.body;
    fileUtils.cancelShare(link);
    res.json({ success: true });
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('服务器运行在端口' + PORT);
});