# RikkaNas

基于 Vue 3 和 Node.js 的个人 NAS 文件管理系统，支持文件管理、加密保险库、文件共享、WebDAV 挂载等功能。

## 功能特性

### 文件管理
- 文件/文件夹上传、下载、移动、重命名、删除
- 大文件分片上传与断点续传
- 删除文件自动移入回收站，支持恢复和彻底删除
- 文件夹创建、删除、移动操作
- 多关键词模糊搜索（逗号分隔）

### 加密保险库 (RikkaVault)
- **AES-256-GCM** 文件加密存储
- **PBKDF2-SHA512** 密钥派生（100,000 次迭代）
- 容器密钥与元数据密钥分离，独立派生
- 文件内容与元数据分别加密
- 支持文件夹层级结构加密存储
- 登录时自动同步 storage 到加密容器

### 文件共享
- 公开共享与私密共享（提取码验证）
- 共享链接管理，支持取消共享
- 访问次数统计

### 文件预览
- PDF、Office 文档在线预览
- 图片、音视频在线播放

### 系统管理
- 用户注册/登录/管理（bcryptjs 密码哈希）
- 系统硬件信息监控（CPU、磁盘、网络）
- INI 配置文件编辑
- WebDAV 服务（支持 Windows/Mac/Linux 挂载为网络驱动器）

## 技术栈

| 层级   | 技术                            |
| ------ | ------------------------------- |
| 前端   | Vue 3.5、Vite 7、Pinia 3、Vue Router 4、Axios |
| 后端   | Node.js 20+、Express 5、MySQL 8 |
| 加密   | Node.js crypto（AES-256-GCM、PBKDF2） |
| 预览   | PDF.js、Mammoth（docx）、SheetJS（xlsx） |

## 项目结构

```
RikkaNas_Open/
├── backend/
│   ├── config/              # 用户配置文件 (user_settings.ini)
│   ├── routes/              # API 路由
│   │   ├── fileRoutes.js    # 文件操作接口
│   │   ├── vaultRoutes.js   # 加密保险库接口
│   │   └── iniRoutes.js     # 配置编辑接口
│   ├── utils/               # 工具模块
│   │   ├── vault.js         # 加密保险库核心（AES-256-GCM）
│   │   ├── fileUtils.js     # 文件操作与保险库同步
│   │   ├── upload.js        # 前端分片上传辅助
│   │   ├── md5Check.js      # MD5 文件去重
│   │   ├── webdav.js        # WebDAV 服务
│   │   ├── system.js        # 系统信息监控
│   │   └── officeConverter.js
│   ├── storage/             # 明文文件存储
│   ├── vault/               # 加密保险库容器
│   │   ├── container RikkaVault   # 保险库标记文件
│   │   ├── metadata.db            # 加密元数据
│   │   ├── salt.bin               # PBKDF2 盐值
│   │   └── file_*.enc             # 加密文件数据
│   ├── server.js            # 后端入口
│   └── package.json
├── src/                     # Vue 前端源码
│   ├── api/                 # API 请求封装
│   ├── components/          # Vue 组件
│   ├── views/               # 页面视图
│   ├── router/              # 路由配置
│   ├── stores/              # Pinia 状态管理
│   └── assets/              # 静态资源
├── public/                  # 公共静态文件
├── .env                     # 环境变量
├── Dockerfile
├── docker-compose.yml
├── vite.config.js
└── package.json
```

## 环境要求

- Node.js >= 20.19.0
- MySQL >= 8.0
- npm >= 10.0

## 快速开始

### 1. 安装依赖

```sh
# 前端依赖
npm install

# 后端依赖
cd backend
npm install
cd ..
```

### 2. 配置环境变量

编辑 `.env` 文件：

```env
DB_PASSWORD=your_mysql_password
DEFAULT_VAULT_PASSWORD=your_strong_vault_password
AI_API_KEY=your_aliyun_api_key    # 可选，AI 搜索功能需要
```

### 3. 创建数据库

```sql
CREATE DATABASE rikkanas_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

用户表和共享表会在服务启动时自动创建。

### 4. 启动服务

```sh
# 启动后端（端口 3000）
cd backend
node server.js

# 新终端，启动前端（端口 5173）
cd ..
npm run dev
```

访问地址：http://localhost:5173

### 服务端口

| 服务       | 端口  | 说明                          |
| ---------- | ----- | ----------------------------- |
| 前端开发   | 5173  | Vite dev server               |
| 后端 API   | 3000  | Express REST API              |
| WebDAV     | 3003  | 网络驱动器挂载                |

## Docker 部署

```sh
docker-compose up -d
```

服务端口：
- 后端 API: http://localhost:3000
- WebDAV: http://localhost:3001

## API 接口

### 用户认证
| 方法 | 路径                 | 说明       |
| ---- | -------------------- | ---------- |
| POST | `/api/register`      | 用户注册   |
| POST | `/api/login`         | 用户登录   |
| GET  | `/api/check-has-users` | 检查是否有用户 |
| GET  | `/api/user/profile`  | 获取用户信息 |
| POST | `/api/user/update`   | 更新用户信息 |

### 文件操作
| 方法   | 路径                    | 说明             |
| ------ | ----------------------- | ---------------- |
| GET    | `/api/files/list`       | 获取文件列表     |
| POST   | `/api/files/upload`     | 上传文件         |
| GET    | `/api/files/download`   | 下载文件         |
| GET    | `/api/files/preview`    | 文件预览         |
| DELETE | `/api/files/delete`     | 删除（到回收站） |
| POST   | `/api/files/move`       | 移动文件         |
| POST   | `/api/files/rename`     | 重命名           |
| POST   | `/api/files/create-folder` | 创建文件夹    |
| GET    | `/api/files/search`     | 搜索文件         |

### 大文件分片上传
| 方法 | 路径                          | 说明           |
| ---- | ----------------------------- | -------------- |
| POST | `/api/files/upload-chunk`     | 上传单个分片   |
| POST | `/api/files/check-chunks`     | 检查已上传分片 |
| POST | `/api/files/merge-chunks`     | 合并分片       |
| POST | `/api/files/check-exists-by-md5` | MD5 查重    |

### 加密保险库
| 方法 | 路径                      | 说明           |
| ---- | ------------------------- | -------------- |
| GET  | `/api/vault/status`       | 获取保险库状态 |
| POST | `/api/vault/create`       | 创建保险库     |
| POST | `/api/vault/unlock`       | 解锁保险库     |
| POST | `/api/vault/lock`         | 锁定保险库     |
| POST | `/api/vault/upload`       | 上传到保险库   |
| GET  | `/api/vault/download`     | 从保险库下载   |
| GET  | `/api/vault/list`         | 列出保险库文件 |
| POST | `/api/vault/delete`       | 删除保险库文件 |
| POST | `/api/vault/rename`       | 重命名         |
| POST | `/api/vault/create-folder` | 创建文件夹    |
| POST | `/api/vault/delete-folder` | 删除文件夹    |
| POST | `/api/vault/rename-folder` | 重命名文件夹  |

### 共享管理
| 方法 | 路径                | 说明         |
| ---- | ------------------- | ------------ |
| POST | `/api/share/create` | 创建共享链接 |
| GET  | `/api/share/list`   | 共享列表     |
| POST | `/api/share/cancel` | 取消共享     |
| GET  | `/api/share/:link`  | 访问共享文件 |

### 回收站
| 方法 | 路径                   | 说明         |
| ---- | ---------------------- | ------------ |
| GET  | `/api/recycle/list`    | 回收站列表   |
| POST | `/api/recycle/restore` | 恢复文件     |
| POST | `/api/recycle/delete`  | 彻底删除     |

### 系统管理
| 方法 | 路径                        | 说明           |
| ---- | --------------------------- | -------------- |
| GET  | `/api/system/stats`         | 系统硬件信息   |
| GET  | `/api/system/ip`            | 本机局域网 IP  |
| GET  | `/api/ini/get`              | 获取 INI 配置  |
| POST | `/api/ini/save`             | 保存 INI 配置  |
| GET  | `/api/admin/users`          | 用户列表       |
| POST | `/api/admin/users/add`      | 添加用户       |
| POST | `/api/admin/users/update`   | 更新用户       |
| POST | `/api/admin/users/reset-pwd` | 重置密码      |
| POST | `/api/admin/users/delete`   | 删除用户       |

## 加密保险库工作原理

1. **创建阶段**：用户设定密码 → PBKDF2 派生两个密钥（容器密钥 & 元数据密钥）→ salt 写入 `salt.bin`
2. **存储阶段**：文件内容用容器密钥 AES-256-GCM 加密 → 写入 `file_N.enc`；目录结构/文件名用元数据密钥 AES-256-GCM 加密 → 写入 `metadata.db`
3. **读取阶段**：用户输入密码 → 派生密钥 → 先解密元数据获取文件索引 → 再解密具体文件内容
4. **同步机制**：用户登录时，storage 明文区自动同步到加密保险库；同时也支持从保险库释放回 storage

## 已知问题

> 以下问题已在代码审查中发现，可根据需要修复：

1. **`fileUtils.js` 中 `DEFAULT_VAULT_PASSWORD` 未定义** — `unlockAndRelease()`、`syncStorageToVault()` 等函数引用了不存在的变量，会导致 `ReferenceError`。需从 `process.env` 读取或定义常量。
2. **保险库路由未注册** — `server.js` 中未 `app.use('/api/vault', vaultRoutes)`，导致保险库 REST API 不可用。
3. **`vault.js` 中 `encryptFileName()` 返回值未使用** — 在 `addFile()` 中调用后丢弃，属冗余代码。
4. **`vault.js` 中 `deriveKey()` 的 `info` 变量未被使用** — `pbkdf2Sync` 不支持 info 参数（该参数属于 HKDF），不影响功能。

## 许可证

MIT License