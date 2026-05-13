// backend/server.js
const express = require('express');
const iniRoutes = require('./routes/iniRoutes');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const fileRoutes = require('./routes/fileRoutes');
const fileUtils = require('./utils/fileUtils');
const app = express();
const path = require('path');
const fs = require('fs/promises');
app.use(cors());
app.use(express.json());

fileUtils.initStorage().then(() => {
    console.log('=== Storage初始化完成 ===');
    const vaultStatus = require('./utils/vault').getStatus();
    console.log('保险库状态:', vaultStatus);
    if (!vaultStatus.exists) {
        console.log('保险库不存在，首次启动将创建新保险库');
    }
}).catch(err => console.error('Storage初始化失败：', err));

app.use('/api/ini', iniRoutes);
app.use('/api/files', fileRoutes);

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
app.use(require('cors')());

app.use('/api/ini', iniRoutes);

const db = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'rikkanas_db'
});

db.connect((err) => {
    if (err) {
        console.error('数据库连接失败:', err);
        return;
    }
    console.log('成功连接到MySQL数据库');

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

app.get('/api/check-has-users', (req, res) => {
    const query = 'SELECT COUNT(*) AS userCount FROM users';
    console.log('已检查用户信息');
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: '数据库查询错误'
            });
        }

        const userCount = results[0].userCount;
        const hasUsers = userCount > 0;

        res.status(200).json({
            success: true,
            hasUsers: hasUsers,
            userCount: userCount
        });
    });
});

app.get('/api/admin/users', (req, res) => {
    const { account, username, userrole, status } = req.query;
    let sql = 'SELECT * FROM users WHERE 1=1';
    const params = [];

    if (account) {
        sql += ' AND account LIKE ?';
        params.push(`%${account}%`);
    }
    if (username) {
        sql += ' AND username LIKE ?';
        params.push(`%${username}%`);
    }
    if (userrole && ['0', '1'].includes(userrole)) {
        sql += ' AND userrole = ?';
        params.push(userrole);
    }
    if (status && ['0', '1'].includes(status)) {
        sql += ' AND status = ?';
        params.push(status);
    }
    db.query(sql, params, (err, results) => {
        if (err) return res.json({ success: false, error: err.message });
        res.json({ success: true, data: results });
    });
});

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

app.post('/api/admin/users/reset-pwd', async (req, res) => {
    const { id, password } = req.body;
    const hashedPwd = await bcrypt.hash(password, 10);
    db.query('UPDATE users SET password=? WHERE id=?', [hashedPwd, id], (err) => {
        if (err) return res.json({ success: false });
        res.json({ success: true });
    });
});

app.post('/api/admin/users/delete', async (req, res) => {
    const { id } = req.body;

    db.query('SELECT account FROM users WHERE id=?', [id], async (err, result) => {
        if (err || result.length === 0) return res.json({ success: false });
        const account = result[0].account;

        const userDir = path.join(STORAGE_ROOT, account);
        await fs.rm(userDir, { recursive: true, force: true }).catch(() => {});

        db.query('DELETE FROM users WHERE id=?', [id], () => {
            db.query('DELETE FROM login_logs WHERE user_id=?', [id]);
            db.query('DELETE FROM operation_logs WHERE user_id=?', [id]);
            res.json({ success: true });
        });
    });
});

app.get('/api/admin/logs/login', (req, res) => {
    db.query('SELECT * FROM login_logs ORDER BY id DESC', (err, data) => {
        res.json({ success: true, data: err ? [] : data });
    });
});

app.get('/api/admin/logs/operation', (req, res) => {
    db.query('SELECT * FROM operation_logs ORDER BY id DESC', (err, data) => {
        res.json({ success: true, data: err ? [] : data });
    });
});

app.post('/api/register', async (req, res) => {
    try {
        const { device_name, username, account, password } = req.body;

        if (!device_name || !username || !account || !password) {
            return res.status(400).json({ error: '所有字段都是必填的' });
        }

        const checkUserQuery = 'SELECT * FROM users WHERE username = ? OR account = ?';
        db.query(checkUserQuery, [username, account], async (err, results) => {
            if (err) {
                return res.status(500).json({ error: '数据库查询错误' });
            }

            if (results.length > 0) {
                return res.status(400).json({ error: '用户名或账号已存在' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

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

app.post('/api/login', (req, res) => {
    const { username, password, device_name } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码是必填的' });
    }

    const query = 'SELECT * FROM users WHERE (username = ? OR account = ?) ';
    db.query(query, [username, username], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: '数据库查询错误' });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: '用户名或设备名不正确' });
        }

        const user = results[0];

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: '密码不正确' });
        }

        fileUtils.unlockAndRelease().then(() => {
            return fileUtils.syncStorageToVault();
        }).catch(err => console.error('保险库操作失败:', err));

        res.status(200).json({
            success: true,
            message: '登录成功',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    device_name: user.device_name,
                    account: user.account,
                    userrole: user.userrole
                }
            }
        });

    });
});

app.get('/api/admin/info', async (req, res) => {
    try {
        const queryText = "SELECT username FROM users";

        db.query(queryText, [1], (err, results) => {
            if (err) {
                console.error('数据库查询失败:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (results.length > 0) {
                const adminName = results[0].username;
                res.json({ name: adminName });
            } else {
                res.status(404).json({ error: 'Admin user not found' });
            }
        });
    } catch (error) {
        res.status(500).json({ error: '服务器错误' });
    }
});

const system = require('./utils/system');
app.use('/api/system', system);
console.log('系统服务：监控 已启动')

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

app.get('/api/recycle/list', async (req, res) => {
    try {
        const list = await fileUtils.getRecycleList();
        res.json({ success: true, data: list });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false });
    }
});

app.post('/api/recycle/restore', async (req, res) => {
    try {
        const { path } = req.body;
        await fileUtils.restoreFile(path);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

app.post('/api/recycle/delete', async (req, res) => {
    try {
        const { path } = req.body;
        await fileUtils.forceDelete(path);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

app.post('/api/share/create', (req, res) => {
    const { filePath } = req.body;
    const link = fileUtils.createShare(filePath);
    res.json({ success: true, link });
});

app.get('/api/share/:link', async (req, res) => {
    const { link } = req.params;
    const share = fileUtils.getShareList().find(s => s.link === link);
    if (!share) return res.status(404).send('共享不存在');

    share.views++;
    const filePath = fileUtils.safePath(share.filePath);
    res.download(filePath);
});

app.post('/api/share/create', (req, res) => {
    const { filePath, type, code, permission } = req.body;
    const link = fileUtils.createShare(filePath, type, code, permission);
    res.json({ success: true, link });
});

app.get('/api/share/list', (req, res) => {
    res.json({ success: true, data: fileUtils.getShareList() });
});

app.post('/api/share/cancel', (req, res) => {
    const { link } = req.body;
    fileUtils.cancelShare(link);
    res.json({ success: true });
});

app.post('/api/share/info', (req, res) => {
    const { link } = req.body;
    const share = fileUtils.getShareByLink(link);
    if (!share) return res.json({ success: false });
    res.json({ success: true, data: share });
});

app.get('/api/share/:link', (req, res) => {
    const share = fileUtils.getShareByLink(req.params.link);
    if (!share) return res.status(404).send('共享不存在或已取消');
    share.views++;
    res.download(fileUtils.safePath(share.filePath));
});

app.get('/api/share/list', (req, res) => {
    res.json({ success: true, data: fileUtils.getShareList() });
});

app.post('/api/share/cancel', (req, res) => {
    const { link } = req.body;
    fileUtils.cancelShare(link);
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', async () => {
  console.log('HTTP 服务器运行在端口 ' + PORT);

  try {
    const webdav = require('./utils/webdav');
    await webdav.start(3001);
    console.log('===========================================');
    console.log('WebDAV 服务已启动!');
    console.log('服务地址: http://localhost:3001');
    console.log('===========================================');
    console.log('Windows 映射网络驱动器:');
    console.log('  net use Z: \\\\localhost\\webdav /user:username password');
    console.log('');
    console.log('Mac/Linux 挂载:');
    console.log('  mount -t webdav http://localhost:3001 /mnt/webdav');
    console.log('===========================================');
  } catch (err) {
    console.error('WebDAV 启动失败:', err.message);
  }
});
