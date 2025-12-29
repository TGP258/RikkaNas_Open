// backend/server.js
const express = require('express');
const iniRoutes = require('./routes/iniRoutes');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg'); // 从 'pg' 库中导入 Pool

const app = express();
app.use(cors());
app.use(express.json());
// app.use(express.json());
// 可选：配置跨域（开发环境）
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

        res.json({
            message: '登录成功',
            user: {
                id: user.id,
                username: user.username,
                device_name: user.device_name,
                account: user.account
            }
        });
    });
});
app.get('/api/admin/info', async (req, res) => {
    try {
        // 使用 MySQL 的参数占位符 '?'
        const queryText = "SELECT username FROM users WHERE userrole = 1";

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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('服务器运行在端口' + PORT);
});