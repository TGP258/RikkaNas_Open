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


// 用户列表（模糊查询）
app.get('/api/admin/users', (req, res) => {
    const { account, username, userrole, status } = req.query;
    let sql = 'SELECT * FROM users WHERE 1=1';
    const params = [];

    // 账号模糊查询
    if (account) {
        sql += ' AND account LIKE ?';
        params.push(`%${account}%`);
    }
    // 昵称模糊查询
    if (username) {
        sql += ' AND username LIKE ?';
        params.push(`%${username}%`);
    }
    // 角色查询（只处理有效数字）
    if (userrole && ['0', '1'].includes(userrole)) {
        sql += ' AND userrole = ?';
        params.push(userrole);
    }
    // 状态查询（只处理有效数字）
    if (status && ['0', '1'].includes(status)) {
        sql += ' AND status = ?';
        params.push(status);
    }
    db.query(sql, params, (err, results) => {
        if (err) return res.json({ success: false, error: err.message });
        res.json({ success: true, data: results });
    });
});
// 新增用户
app.post('/api/admin/users/add', async (req, res) => {
    const { account, password, username, device_name, userrole, storage_quota, status } = req.body;
    const hashedPwd = await bcrypt.hash(password, 10);

    const sql = `
    INSERT INTO users (account, password, username, device_name, userrole, storage_quota, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

    const params = [account, hashedPwd, username, device_name, userrole, storage_quota, status];
    db.query(sql, params, (err) => {
        if (err) return res.json({ success: false, msg: err.message });
        res.json({ success: true });
    });
});

// 修改用户
app.post('/api/admin/users/update', (req, res) => {
    const { id, username, userrole, storage_quota, status, email } = req.body;
    const sql = `
    UPDATE users SET
      username=?, userrole=?, storage_quota=?, status=?, email=?
    WHERE id=?
  `;
    db.query(sql, [username, userrole, storage_quota, status, email, id], (err) => {
        if (err) return res.json({ success: false });
        res.json({ success: true });
    });
});

// 重置密码
app.post('/api/admin/users/reset-pwd', async (req, res) => {
    const { id, password } = req.body;
    const hashedPwd = await bcrypt.hash(password, 10);
    db.query('UPDATE users SET password=? WHERE id=?', [hashedPwd, id], (err) => {
        if (err) return res.json({ success: false });
        res.json({ success: true });
    });
});

// 删除用户 自动清理所有数据
app.post('/api/admin/users/delete', async (req, res) => {
    const { id } = req.body;

    db.query('SELECT account FROM users WHERE id=?', [id], async (err, result) => {
        if (err || result.length === 0) return res.json({ success: false });
        const account = result[0].account;

        // 删除用户目录
        const userDir = path.join(STORAGE_ROOT, account);
        await fs.rm(userDir, { recursive: true, force: true }).catch(() => {});

        // 删除用户
        db.query('DELETE FROM users WHERE id=?', [id], () => {
            // 删除日志
            db.query('DELETE FROM login_logs WHERE user_id=?', [id]);
            db.query('DELETE FROM operation_logs WHERE user_id=?', [id]);
            res.json({ success: true });
        });
    });
});

// 登录日志
app.get('/api/admin/logs/login', (req, res) => {
    db.query('SELECT * FROM login_logs ORDER BY id DESC', (err, data) => {
        res.json({ success: true, data: err ? [] : data });
    });
});

// 操作日志
app.get('/api/admin/logs/operation', (req, res) => {
    db.query('SELECT * FROM operation_logs ORDER BY id DESC', (err, data) => {
        res.json({ success: true, data: err ? [] : data });
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

        // 登录成功后释放保险库文件到storage
        fileUtils.unlockAndRelease().then(() => {
            // 同步storage到保险库
            return fileUtils.syncStorageToVault();
        }).catch(err => console.error('保险库操作失败:', err));

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

// 创建共享
app.post('/api/share/create', (req, res) => {
    const { filePath, type, code, permission } = req.body;
    const link = fileUtils.createShare(filePath, type, code, permission);
    res.json({ success: true, link });
});

// 获取共享列表
app.get('/api/share/list', (req, res) => {
    res.json({ success: true, data: fileUtils.getShareList() });
});

// 取消共享
app.post('/api/share/cancel', (req, res) => {
    const { link } = req.body;
    fileUtils.cancelShare(link);
    res.json({ success: true });
});

// 获取共享详情
app.post('/api/share/info', (req, res) => {
    const { link } = req.body;
    const share = fileUtils.getShareByLink(link);
    if (!share) return res.json({ success: false });
    res.json({ success: true, data: share });
});

// 访问共享（页面）
app.get('/api/share/:link', (req, res) => {
    const share = fileUtils.getShareByLink(req.params.link);
    if (!share) return res.status(404).send('共享不存在或已取消');
    share.views++;
    res.download(fileUtils.safePath(share.filePath));
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
app.listen(PORT, '0.0.0.0', () => {
  console.log('服务器运行在端口' + PORT);
});
