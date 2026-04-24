const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 根目录（storage）
const STORAGE_ROOT = path.resolve(__dirname, '../storage');

// 1. 初始化storage目录（不存在则创建）
// const initStorage = async () => {
//     try {
//         if (!fsSync.existsSync(STORAGE_ROOT)) {
//             await fs.mkdir(STORAGE_ROOT, { recursive: true });
//             console.log(`创建storage目录成功：${STORAGE_ROOT}`);
//         }
//         await initRecycle();
//     } catch (error) {
//         console.error('初始化storage目录失败：', error);
//         throw error;
//     }
// };
const initStorage = async () => {
    try {
        if (!fsSync.existsSync(STORAGE_ROOT)) {
            await fs.mkdir(STORAGE_ROOT, { recursive: true });
            console.log(`创建storage目录成功：${STORAGE_ROOT}`);
        }

        // ✅ 直接在这里创建 recycle，不调用任何外部方法
        const RECYCLE_PATH = path.join(STORAGE_ROOT, 'recycle');
        if (!fsSync.existsSync(RECYCLE_PATH)) {
            await fs.mkdir(RECYCLE_PATH, { recursive: true });
        }

    } catch (error) {
        console.error('初始化storage目录失败：', error);
        throw error;
    }
};

// 2. 安全检查路径
const safePath = (relativePath) => {
    const fullPath = path.resolve(STORAGE_ROOT, relativePath || '');
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
        const fileList = await Promise.all(
            files.map(async (file) => {
                const filePath = path.join(fullPath, file.name);
                const stats = await fs.stat(filePath);
                return {
                    name: file.name,
                    type: file.isDirectory() ? 'folder' : 'file',
                    size: stats.size,
                    mtime: stats.mtime,
                    path: path.relative(STORAGE_ROOT, filePath),
                };
            })
        );
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
    const fileName = `${Date.now()}-${file.originalname}`;
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
        await fs.access(fullPath);
        return fullPath;
    } catch (error) {
        console.error('文件下载失败：', error);
        throw new Error('文件不存在');
    }
};

// // 6. 删除文件/文件夹
// const deleteFile = async (relativePath) => {
//     const fullPath = safePath(relativePath);
//     try {
//         const stats = await fs.stat(fullPath);
//         if (stats.isDirectory()) {
//             await fs.rm(fullPath, { recursive: true, force: true });
//         } else {
//             await fs.unlink(fullPath);
//         }
//         return true;
//     } catch (error) {
//         console.error('删除文件失败：', error);
//         throw error;
//     }
// };
const deleteFile = async (relativePath) => {
    const fullPath = safePath(relativePath);
    const RECYCLE_PATH = path.join(STORAGE_ROOT, 'recycle');

    // 确保回收站目录存在
    if (!fsSync.existsSync(RECYCLE_PATH)) {
        await fs.mkdir(RECYCLE_PATH, { recursive: true });
    }

    // 目标路径：storage/recycle/xxx
    const fileName = path.basename(fullPath);
    const targetPath = path.join(RECYCLE_PATH, fileName);

    try {
        // 移动文件 → 回收站（不是直接删除！）
        await fs.rename(fullPath, targetPath);
        return true;
    } catch (error) {
        console.error('移动到回收站失败：', error);
        throw error;
    }
};

// 7. 重命名
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

// 8. 复制
const copyFile = async (sourceRelativePath, targetRelativePath) => {
    const sourceFullPath = safePath(sourceRelativePath);
    const targetFullPath = safePath(targetRelativePath);
    try {
        const stats = await fs.stat(sourceFullPath);
        if (stats.isDirectory()) {
            await fs.cp(sourceFullPath, targetFullPath, { recursive: true });
        } else {
            await fs.copyFile(sourceFullPath, targetFullPath);
        }
        return true;
    } catch (error) {
        console.error('复制失败：', error);
        throw error;
    }
};

// 9. 移动
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

// 10. 搜索文件（支持AI jpg,png,gif）
const searchFiles = async (keyword, relativePath = '') => {
    const fullPath = safePath(relativePath);
    try {
        const files = await fs.readdir(fullPath, { withFileTypes: true });
        const result = [];
        const keywordList = keyword.split(',').map(k => k.trim().toLowerCase());

        for (const file of files) {
            const filePath = path.join(fullPath, file.name);
            const fileName = file.name.toLowerCase();

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

// 剪贴板
let clipboard = { type: '', path: '' };
const setClipboard = (type, path) => {
    clipboard = { type, path };
    return clipboard;
};
const getClipboard = () => clipboard;

// 创建文件夹
const createFolder = async (folderName, relativePath = '') => {
    const fullDir = safePath(relativePath);
    const fullPath = path.join(fullDir, folderName);
    try {
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

// 上传文件夹
const uploadFolder = async (files, relativePath = '') => {
    const results = [];
    for (const file of files) {
        const fileRelativePath = file.webkitRelativePath || file.originalname;
        const targetRelativePath = path.join(relativePath, fileRelativePath);
        const fullFilePath = safePath(targetRelativePath);
        const dirPath = path.dirname(fullFilePath);

        if (!fsSync.existsSync(dirPath)) {
            await fs.mkdir(dirPath, { recursive: true });
        }

        await fs.writeFile(fullFilePath, file.buffer);
        results.push({
            name: path.basename(fullFilePath),
            path: path.relative(STORAGE_ROOT, fullFilePath)
        });
    }
    return results;
};

// ================== 回收站 ==================
const RECYCLE_PATH = path.join(STORAGE_ROOT, 'recycle');

const getRecycleList = async () => {
    const RECYCLE_PATH = path.join(STORAGE_ROOT, 'recycle');
    if (!fsSync.existsSync(RECYCLE_PATH)) {
        await fs.mkdir(RECYCLE_PATH, { recursive: true });
    }

    const files = await fs.readdir(RECYCLE_PATH, { withFileTypes: true });
    return files.map(f => ({
        name: f.name,
        path: f.name,
        isDir: f.isDirectory()
    }));
};

// 恢复文件
const restoreFile = async (fileName) => {
    const RECYCLE_PATH = path.join(STORAGE_ROOT, 'recycle');
    const src = path.join(RECYCLE_PATH, fileName);
    const target = path.join(STORAGE_ROOT, fileName);
    await fs.rename(src, target);
};

// 彻底删除
const forceDelete = async (fileName) => {
    const RECYCLE_PATH = path.join(STORAGE_ROOT, 'recycle');
    const fullPath = path.join(RECYCLE_PATH, fileName);
    const stats = await fs.stat(fullPath);

    if (stats.isDirectory()) {
        await fs.rm(fullPath, { recursive: true, force: true });
    } else {
        await fs.unlink(fullPath);
    }
};
// ================== 共享 ==================
let shareList = [];

function createShare(filePath, type = 'public', code = '') {
    const link = Math.random().toString(36).slice(2);
    shareList.push({
        link,
        filePath,
        type,
        code,
        views: 0,
        createdAt: new Date()
    });
    return link;
}

function getShareList() {
    return shareList;
}

function cancelShare(link) {
    shareList = shareList.filter(s => s.link !== link);
}

// ✅ 正确导出：所有方法只导出一次！！！
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
    uploadFolder,
    getRecycleList,
    restoreFile,
    forceDelete,
    createShare,
    getShareList,
    cancelShare

};