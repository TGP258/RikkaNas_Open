const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // 用于生成临时文件名，需安装：npm i uuid

// 根目录（storage）
const STORAGE_ROOT = path.resolve(__dirname, '../storage');

// 1. 初始化storage目录（不存在则创建）
const initStorage = async () => {
  try {
    if (!fsSync.existsSync(STORAGE_ROOT)) {
      await fs.mkdir(STORAGE_ROOT, { recursive: true });
      console.log(`创建storage目录成功：${STORAGE_ROOT}`);
    }
  } catch (error) {
    console.error('初始化storage目录失败：', error);
    throw error;
  }
};

// 2. 安全检查路径（防止路径遍历攻击）
const safePath = (relativePath) => {
  const fullPath = path.resolve(STORAGE_ROOT, relativePath || '');
  // 确保路径在storage目录内
  if (!fullPath.startsWith(STORAGE_ROOT)) {
    throw new Error('非法路径，禁止访问');
  }
  return fullPath;
};

// 3. 获取目录文件列表
const getFileList = async (relativePath = '') => {
  const fullPath = safePath(relativePath);
  try {
    const files = await fs.readdir(fullPath, { withFileTypes: true });
    // 整理文件/文件夹信息
    const fileList = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(fullPath, file.name);
        const stats = await fs.stat(filePath);
        return {
          name: file.name,
          type: file.isDirectory() ? 'folder' : 'file',
          size: stats.size, // 字节
          mtime: stats.mtime, // 修改时间
          path: path.relative(STORAGE_ROOT, filePath), // 相对路径
        };
      })
    );
    // 排序：文件夹在前，按名称排序
    return fileList.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('获取文件列表失败：', error);
    throw error;
  }
};

// 4. 文件上传
const uploadFile = async (file, relativePath = '') => {
  const fullDir = safePath(relativePath);
  const fileName = `${Date.now()}-${file.originalname}`; // 避免重名
  const fullPath = path.join(fullDir, fileName);
  try {
    await fs.writeFile(fullPath, file.buffer);
    return { name: fileName, path: path.relative(STORAGE_ROOT, fullPath) };
  } catch (error) {
    console.error('文件上传失败：', error);
    throw error;
  }
};

// 5. 文件下载
const downloadFile = async (relativePath) => {
  const fullPath = safePath(relativePath);
  try {
    // 检查文件是否存在
    await fs.access(fullPath);
    return fullPath;
  } catch (error) {
    console.error('文件下载失败：', error);
    throw new Error('文件不存在');
  }
};

// 6. 删除文件/文件夹
const deleteFile = async (relativePath) => {
  const fullPath = safePath(relativePath);
  try {
    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      // 删除文件夹（递归）
      await fs.rm(fullPath, { recursive: true, force: true });
    } else {
      // 删除文件
      await fs.unlink(fullPath);
    }
    return true;
  } catch (error) {
    console.error('删除文件失败：', error);
    throw error;
  }
};

// 7. 重命名文件/文件夹
const renameFile = async (oldRelativePath, newName) => {
  const oldFullPath = safePath(oldRelativePath);
  const newFullPath = path.join(path.dirname(oldFullPath), newName);
  try {
    await fs.rename(oldFullPath, newFullPath);
    return {
      oldPath: oldRelativePath,
      newPath: path.relative(STORAGE_ROOT, newFullPath),
    };
  } catch (error) {
    console.error('重命名失败：', error);
    throw error;
  }
};

// 8. 复制文件/文件夹
const copyFile = async (sourceRelativePath, targetRelativePath) => {
  const sourceFullPath = safePath(sourceRelativePath);
  const targetFullPath = safePath(targetRelativePath);
  try {
    const stats = await fs.stat(sourceFullPath);
    if (stats.isDirectory()) {
      // 复制文件夹（递归）
      await fs.cp(sourceFullPath, targetFullPath, { recursive: true });
    } else {
      // 复制文件
      await fs.copyFile(sourceFullPath, targetFullPath);
    }
    return true;
  } catch (error) {
    console.error('复制失败：', error);
    throw error;
  }
};

// 9. 剪切（移动）文件/文件夹
const moveFile = async (sourceRelativePath, targetRelativePath) => {
  const sourceFullPath = safePath(sourceRelativePath);
  const targetFullPath = safePath(targetRelativePath);
  try {
    await fs.rename(sourceFullPath, targetFullPath);
    return true;
  } catch (error) {
    console.error('剪切失败：', error);
    throw error;
  }
};

// 10. 搜索文件/文件夹 【支持AI输出：jpg,png,gif】
const searchFiles = async (keyword, relativePath = '') => {
    const fullPath = safePath(relativePath);
    try {
        const files = await fs.readdir(fullPath, { withFileTypes: true });
        const result = [];

        // 👇 只加了这一行：拆分逗号分隔的关键词
        const keywordList = keyword.split(',').map(k => k.trim().toLowerCase());

        for (const file of files) {
            const filePath = path.join(fullPath, file.name);
            const fileName = file.name.toLowerCase();

            // 👇 修改匹配逻辑：支持多个关键词 + 后缀匹配
            const isMatched = keywordList.some(key => {
                if (fileName.includes(key.toLowerCase())) return true;
                if (fileName.endsWith(`.${key.toLowerCase()}`)) return true;
                return false;
            });

            if (isMatched) {
                const stats = await fs.stat(filePath);
                result.push({
                    name: file.name,
                    type: file.isDirectory() ? 'folder' : 'file',
                    path: path.relative(STORAGE_ROOT, filePath),
                });
            }

            // 递归搜索子文件夹（完全保留）
            if (file.isDirectory()) {
                const subResult = await searchFiles(keyword, path.relative(STORAGE_ROOT, filePath));
                result.push(...subResult);
            }
        }
        return result;
    } catch (error) {
        console.error('搜索失败：', error);
        throw error;
    }
};

// 临时存储剪切/复制的文件（内存中，重启失效，生产环境可改用数据库）
let clipboard = {
  type: '', // 'copy' | 'cut'
  path: '',
};

// ===== 新增：创建文件夹 =====
const createFolder = async (folderName, relativePath = '') => {
    const fullDir = safePath(relativePath);
    const fullPath = path.join(fullDir, folderName);
    try {
        // 检查文件夹是否已存在
        if (fsSync.existsSync(fullPath)) {
            throw new Error('文件夹已存在');
        }
        await fs.mkdir(fullPath, { recursive: true });
        return {
            name: folderName,
            path: path.relative(STORAGE_ROOT, fullPath)
        };
    } catch (error) {
        console.error('创建文件夹失败：', error);
        throw error;
    }
};


// ===== 新增：递归上传文件夹（处理前端上传的文件夹） =====
const uploadFolder = async (files, relativePath = '') => {
    const results = [];
    for (const file of files) {
        // 1. 核心修复：获取文件夹上传时的相对路径（如 "test/1.txt"、"test/sub/2.jpg"）
        const fileRelativePath = file.webkitRelativePath || file.originalname;
        // 2. 拼接目标路径：当前上传目录 + 文件夹内的相对路径
        const targetRelativePath = path.join(relativePath, fileRelativePath);
        // 3. 安全检查路径（防止越权）
        const fullFilePath = safePath(targetRelativePath);
        // 4. 获取文件所在目录（确保目录存在）
        const dirPath = path.dirname(fullFilePath);

        // 5. 递归创建目录（关键：保留层级结构）
        if (!fsSync.existsSync(dirPath)) {
            await fs.mkdir(dirPath, { recursive: true });
        }

        // 6. 写入文件（保留原目录结构）
        await fs.writeFile(fullFilePath, file.buffer);
        results.push({
            name: path.basename(fullFilePath),
            path: path.relative(STORAGE_ROOT, fullFilePath)
        });
    }
    return results;
};


// 11. 设置剪贴板
const setClipboard = (type, path) => {
  clipboard = { type, path };
  return clipboard;
};

// 12. 获取剪贴板
const getClipboard = () => clipboard;

module.exports = {
  initStorage,
  getFileList,
  uploadFile,
  downloadFile,
  deleteFile,
  renameFile,
  copyFile,
  moveFile,
  searchFiles,
  setClipboard,
  getClipboard,
  safePath,
  createFolder,
  uploadFolder
};