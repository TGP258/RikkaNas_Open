const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { isMd5Exists } = require('./md5Check');
const vault = require('./vault');

// 根目录（storage）
const STORAGE_ROOT = path.resolve(__dirname, '../storage');

// 保险库默认密码
const DEFAULT_VAULT_PASSWORD = 'RikkaVault@2024';

// 初始化存储目录
const initStorage = async () => {
    try {
        if (!fsSync.existsSync(STORAGE_ROOT)) {
            await fs.mkdir(STORAGE_ROOT, { recursive: true });
            console.log(`创建storage目录成功：${STORAGE_ROOT}`);
        }

        const RECYCLE_PATH = path.join(STORAGE_ROOT, 'recycle');
        if (!fsSync.existsSync(RECYCLE_PATH)) {
            await fs.mkdir(RECYCLE_PATH, { recursive: true });
        }

    } catch (error) {
        console.error('初始化storage目录失败：', error);
        throw error;
    }
};

// 解锁保险库并释放文件到storage
const unlockAndRelease = async () => {
    try {
        const status = vault.getStatus();
        if (!status.exists) {
            console.log('保险库不存在，无需释放');
            return { success: true, released: 0 };
        }

        if (!status.isUnlocked) {
            console.log('解锁保险库...');
            const result = await vault.unlockVault(DEFAULT_VAULT_PASSWORD);
            if (!result.success) {
                return { success: false, error: result.error };
            }
        }

        // 释放文件到storage
        console.log('正在释放保险库文件到storage...');
        const released = await releaseVaultToStorage();
        console.log(`已释放 ${released} 个文件`);
        return { success: true, released };
    } catch (error) {
        console.error('解锁并释放保险库失败:', error);
        return { success: false, error: error.message };
    }
};

// 将保险库中的文件释放到storage
const releaseVaultToStorage = async () => {
    try {
        const result = await vault.listFiles('');
        const allFiles = [...result.folders, ...result.files];
        let releasedCount = 0;

        for (const item of allFiles) {
            if (item.type === 'folder') {
                // 创建文件夹
                const folderPath = path.join(STORAGE_ROOT, item.path);
                if (!fsSync.existsSync(folderPath)) {
                    await fs.mkdir(folderPath, { recursive: true });
                }
            } else {
                // 释放文件
                const fileData = await vault.getFile(item.path);
                if (fileData) {
                    const filePath = path.join(STORAGE_ROOT, item.path);
                    const fileDir = path.dirname(filePath);
                    if (!fsSync.existsSync(fileDir)) {
                        await fs.mkdir(fileDir, { recursive: true });
                    }
                    await fs.writeFile(filePath, fileData.buffer);
                    releasedCount++;
                }
            }
        }

        return releasedCount;
    } catch (error) {
        console.error('释放文件失败:', error);
        return 0;
    }
};

// 安全检查路径
const safePath = (relativePath) => {
    const fullPath = path.resolve(STORAGE_ROOT, relativePath || '');
    if (!fullPath.startsWith(STORAGE_ROOT)) {
        throw new Error('非法路径，禁止访问');
    }
    return fullPath;
};

// 检查文件是否存在
const checkFileExists = async (basePath, filename) => {
    const fullPath = safePath(basePath ? `${basePath}/${filename}` : filename);
    return fsSync.existsSync(fullPath);
};

// 获取文件完整路径（用于预览）
const getFullFilePath = async (filePath) => {
    const fullPath = safePath(filePath);
    if (!fsSync.existsSync(fullPath)) {
        throw new Error('文件不存在');
    }
    return fullPath;
};

// 获取目录文件列表
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

// 将storage目录同步到加密容器
const syncStorageToVault = async () => {
    try {
        const status = vault.getStatus();
        if (!status.exists) {
            console.log('保险库不存在，创建新保险库...');
            await vault.createVault(DEFAULT_VAULT_PASSWORD);
        } else if (!status.isUnlocked) {
            console.log('解锁保险库...');
            await vault.unlockVault(DEFAULT_VAULT_PASSWORD);
        }

        // 遍历storage目录
        const syncDirectory = async (dirPath, relativePath = '') => {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

                if (entry.isDirectory()) {
                    // 同步文件夹
                    await vault.addFolder(entry.name, relativePath);
                    await syncDirectory(fullPath, entryRelativePath);
                } else if (entry.isFile()) {
                    // 同步文件
                    const fileBuffer = await fs.readFile(fullPath);
                    await vault.addFile(fileBuffer, entry.name, relativePath);
                }
            }
        };

        // 清空保险库（如果有旧数据）
        const currentFiles = await vault.listFiles('');
        for (const file of currentFiles.files) {
            await vault.deleteFile(file.path);
        }
        for (const folder of currentFiles.folders) {
            await vault.deleteFolder(folder.path);
        }

        // 同步storage目录
        await syncDirectory(STORAGE_ROOT);
        console.log('同步storage到保险库完成');
        return { success: true };
    } catch (error) {
        console.error('同步到保险库失败:', error);
        return { success: false, error: error.message };
    }
};

// 文件上传（路由层已解码文件名）
const uploadFile = async (file, relativePath = '') => {
    try {
        // 优先使用路由层已解码的文件名
        const finalFileName = file.decodedFileName || file.originalname;
        const finalRelativePath = file.decodedRelativePath || relativePath;
        const finalDir = safePath(finalRelativePath);
        const finalPath = path.join(finalDir, finalFileName);

        // 确保目录存在
        if (!fsSync.existsSync(finalDir)) {
            await fs.mkdir(finalDir, { recursive: true });
        }

        await fs.writeFile(finalPath, file.buffer);
        const stats = await fs.stat(finalPath);

        // 同步到保险库
        const status = vault.getStatus();
        if (status.exists && status.isUnlocked) {
            await vault.addFile(file.buffer, finalFileName, finalRelativePath);
        }

        return {
            name: finalFileName,
            path: path.relative(STORAGE_ROOT, finalPath),
            size: stats.size
        };
    } catch (error) {
        console.error('上传文件失败：', error);
        throw error;
    }
};

// 文件夹上传
const uploadFolder = async (files, relativePath = '') => {
    const results = [];

    for (const file of files) {
        try {
            const result = await uploadFile(file, relativePath);
            results.push(result);
        } catch (error) {
            console.error(`上传文件 ${file.originalname} 失败：`, error);
        }
    }

    return results;
};

// 下载文件（支持断点续传）
const downloadFile = async (req, res, filePath) => {
    const fullPath = safePath(filePath);
    try {
        const stats = await fs.stat(fullPath);
        const fileSize = stats.size;
        const fileName = path.basename(filePath);
        
        // 设置基础响应头
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Accept-Ranges', 'bytes');
        
        // 检查是否有Range请求
        const range = req.headers.range;
        if (range) {
            // 解析Range请求：bytes=start-end
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            
            if (start >= fileSize) {
                res.status(416).json({ success: false, error: '请求范围无效' });
                return;
            }
            
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(fullPath, { start, end });
            
            res.status(206); // Partial Content
            res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
            res.setHeader('Content-Length', chunksize);
            
            file.pipe(res);
        } else {
            // 完整下载
            res.setHeader('Content-Length', fileSize);
            res.sendFile(fullPath);
        }
    } catch (error) {
        console.error('下载文件失败：', error);
        res.status(404).json({ success: false, error: '文件不存在' });
    }
};

// 删除文件
const deleteFile = async (filePath) => {
    const fullPath = safePath(filePath);
    try {
        await fs.unlink(fullPath);

        // 同步到保险库
        const status = vault.getStatus();
        if (status.exists && status.isUnlocked) {
            await vault.deleteFile(filePath);
        }

        return true;
    } catch (error) {
        console.error('删除文件失败：', error);
        throw error;
    }
};

// 重命名文件
const renameFile = async (oldPath, newName) => {
    const fullOldPath = safePath(oldPath);
    const parentPath = path.dirname(fullOldPath);
    const fullNewPath = path.join(parentPath, newName);

    try {
        await fs.rename(fullOldPath, fullNewPath);

        // 同步到保险库
        const status = vault.getStatus();
        if (status.exists && status.isUnlocked) {
            await vault.renameFile(oldPath, newName);
        }

        return true;
    } catch (error) {
        console.error('重命名文件失败：', error);
        throw error;
    }
};

// 创建文件夹
const createFolder = async (folderName, relativePath = '') => {
    const fullPath = safePath(relativePath ? `${relativePath}/${folderName}` : folderName);
    try {
        if (!fsSync.existsSync(fullPath)) {
            await fs.mkdir(fullPath, { recursive: true });
        }

        // 同步到保险库
        const status = vault.getStatus();
        if (status.exists && status.isUnlocked) {
            await vault.addFolder(folderName, relativePath);
        }

        return {
            name: folderName,
            path: relativePath ? `${relativePath}/${folderName}` : folderName
        };
    } catch (error) {
        console.error('创建文件夹失败：', error);
        throw error;
    }
};

// 删除文件夹
const deleteFolder = async (folderPath) => {
    const fullPath = safePath(folderPath);
    try {
        await fs.rm(fullPath, { recursive: true });

        // 同步到保险库
        const status = vault.getStatus();
        if (status.exists && status.isUnlocked) {
            await vault.deleteFolder(folderPath);
        }

        return true;
    } catch (error) {
        console.error('删除文件夹失败：', error);
        throw error;
    }
};

// 重命名文件夹
const renameFolder = async (oldPath, newName) => {
    const fullOldPath = safePath(oldPath);
    const parentPath = path.dirname(fullOldPath);
    const fullNewPath = path.join(parentPath, newName);

    try {
        await fs.rename(fullOldPath, fullNewPath);

        // 同步到保险库
        const status = vault.getStatus();
        if (status.exists && status.isUnlocked) {
            await vault.renameFolder(oldPath, newName);
        }

        return true;
    } catch (error) {
        console.error('重命名文件夹失败：', error);
        throw error;
    }
};

module.exports = {
    initStorage,
    unlockAndRelease,
    syncStorageToVault,
    safePath,
    checkFileExists,
    getFileList,
    uploadFile,
    uploadFolder,
    downloadFile,
    deleteFile,
    renameFile,
    createFolder,
    deleteFolder,
    renameFolder,
    isMd5Exists,
    getFullFilePath
};
