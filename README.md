

# RikkaNas-Front

基于Vue3和Node.js的个人文件管理系统
## 项目开发环境
前端：
```sh
npm install
```
后端：
```sh
cd backend
   npm install
```
## 项目启动方法

前端：

```sh
npm run dev
```

后端：

```sh
node backend/server.js 
```

首次连接需要手动建表，自动建表脚本暂时无法使用

## 数据库建表语句

建立数据库：

```sql
CREATE DATABASE rikkanas_db;
USE rikkanas_db;
```

建立用户表：

```sql
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_name VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL UNIQUE,
  userrole INT,
  account VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## 项目结构

| 目录                            | 注释                                                |
| ------------------------------- | --------------------------------------------------- |
| **public/**                     | 静态文件目录                                        |
| `public/favicon.ico`            | 网站的图标。                                        |
| `public/index.html`             | 应用的主 HTML 文件                                  |
| **src/**                        | 源代码目录，存放应用的主要代码。                    |
| `src/assets/`                   | 存放静态资源，如图像、字体等。                      |
| `src/assets/logo.png`           | LOGO文件。                                          |
| `src/components/`               | 存放 Vue 组件，每个组件都是一个独立的 `.vue` 文件。 |
| `src/components/HelloWorld.vue` | 默认生成的示例组件。                                |
| `src/views/`                    | 存放视图组件，每个视图都是一个独立的 `.vue` 文件。  |
| `src/views/Home.vue`            | 默认生成的主页组件。                                |
| `src/router/`                   | 存放路由配置文件。                                  |
| `src/router/index.js`           | 路由的配置文件，定义了应用的路由规则。              |
| `src/App.vue`                   | 根组件，整个应用的入口组件。                        |
| `src/main.js`                   |                                                     |
