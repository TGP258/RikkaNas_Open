const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { isMd5Exists } = require('./md5Check');
const vault = require('./vault');

// 根目录（storage）
const STORAGE_ROOT = path.resolve(__dirname, '../storage');

// MIME类型映射
const MIME_TYPES = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.flv': 'video/x-flv',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.flac': 'audio/flac',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip'
};

// 获取文件的MIME类型
const getMimeType = (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TYPES[ext] || 'application/octet-stream';
};

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
        // 确保保险库已解锁
        const vaultStatus = vault.getStatus();
        if (!vaultStatus.isUnlocked) {
            console.log('保险库已锁定，尝试解锁...');
            await vault.unlockVault(DEFAULT_VAULT_PASSWORD);
        }

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
            console.log('创建完成，解锁保险库...');
            await vault.unlockVault(DEFAULT_VAULT_PASSWORD);
        } else if (!status.isUnlocked) {
            console.log('解锁保险库...');
            await vault.unlockVault(DEFAULT_VAULT_PASSWORD);
        }

        // 确保保险库已解锁
        const currentStatus = vault.getStatus();
        if (!currentStatus.isUnlocked) {
            console.log('保险库未解锁，尝试解锁...');
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
        
        // 构建最终目录路径（基于storage根目录）
        const finalDir = finalRelativePath 
            ? safePath(finalRelativePath) 
            : STORAGE_ROOT;
        const finalPath = path.join(finalDir, finalFileName);

        // 确保目录存在（递归创建）
        await fs.mkdir(finalDir, { recursive: true });

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
        // 使用RFC 5987编码支持中文文件名
        const encodedFileName = encodeURIComponent(fileName);
        res.setHeader('Content-Disposition', `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`);
        res.setHeader('Content-Type', getMimeType(filePath));
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
            const file = fsSync.createReadStream(fullPath, { start, end });
            
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

// 搜索文件（支持多关键词，逗号分隔）
const searchFiles = async (keyword, relativePath = '') => {
    const fullPath = safePath(relativePath);
    const results = [];
    const keywords = keyword.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
    
    const searchDirectory = async (dir) => {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const entryPath = path.join(dir, entry.name);
                const entryRelativePath = path.relative(STORAGE_ROOT, entryPath);
                
                // 检查文件名是否匹配任何关键词
                const nameLower = entry.name.toLowerCase();
                const matches = keywords.some(keyword => 
                    nameLower.includes(keyword)
                );
                
                if (matches) {
                    const stats = await fs.stat(entryPath);
                    results.push({
                        name: entry.name,
                        type: entry.isDirectory() ? 'folder' : 'file',
                        size: stats.size,
                        mtime: stats.mtime,
                        path: entryRelativePath,
                    });
                }
                
                // 递归搜索子目录
                if (entry.isDirectory()) {
                    await searchDirectory(entryPath);
                }
            }
        } catch (error) {
            console.error(`搜索目录失败 ${dir}：`, error);
        }
    };
    
    await searchDirectory(fullPath);
    
    // 按文件夹优先、名称排序
    return results.sort((a, b) => {
        if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });
};

// === 大文件分片上传相关 ===
const CHUNK_TEMP_DIR = path.resolve(__dirname, '../temp-chunks');

// 确保临时目录存在
const ensureTempDir = async () => {
    if (!fsSync.existsSync(CHUNK_TEMP_DIR)) {
        await fs.mkdir(CHUNK_TEMP_DIR, { recursive: true });
    }
};

// 获取分片存储路径
const getChunkPath = (md5, index) => {
    return path.join(CHUNK_TEMP_DIR, `${md5}_chunk_${index}`);
};

// 上传单个分片
const uploadChunk = async (chunkBuffer, md5, index) => {
    await ensureTempDir();
    const chunkPath = getChunkPath(md5, index);
    await fs.writeFile(chunkPath, chunkBuffer);
    return { success: true };
};

// 检查已上传的分片
const checkUploadedChunks = async (md5) => {
    await ensureTempDir();
    const uploaded = [];
    
    try {
        const files = await fs.readdir(CHUNK_TEMP_DIR);
        for (const file of files) {
            if (file.startsWith(`${md5}_chunk_`)) {
                const index = parseInt(file.split('_chunk_')[1]);
                uploaded.push(index);
            }
        }
    } catch (error) {
        console.error('检查分片失败：', error);
    }
    
    return uploaded.sort((a, b) => a - b);
};

// 合并分片
const mergeChunks = async (md5, filename, totalChunks, relativePath = '') => {
    await ensureTempDir();
    
    const finalPath = relativePath 
        ? path.join(STORAGE_ROOT, relativePath, filename)
        : path.join(STORAGE_ROOT, filename);
    
    // 确保目标目录存在
    const finalDir = path.dirname(finalPath);
    if (!fsSync.existsSync(finalDir)) {
        await fs.mkdir(finalDir, { recursive: true });
    }
    
    // 创建写入流
    const writeStream = fsSync.createWriteStream(finalPath);
    
    for (let i = 0; i < totalChunks; i++) {
        const chunkPath = getChunkPath(md5, i);
        if (!fsSync.existsSync(chunkPath)) {
            throw new Error(`分片 ${i} 不存在`);
        }
        
        const chunkBuffer = await fs.readFile(chunkPath);
        writeStream.write(chunkBuffer);
        // 删除已合并的分片
        await fs.unlink(chunkPath);
    }
    
    writeStream.end();
    
    return new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
            resolve({ success: true, path: finalPath });
        });
        writeStream.on('error', reject);
    });
};

// 清理过期分片（可在定时任务中调用）
const cleanExpiredChunks = async (expireHours = 24) => {
    await ensureTempDir();
    const now = Date.now();
    const expireMs = expireHours * 60 * 60 * 1000;
    
    try {
        const files = await fs.readdir(CHUNK_TEMP_DIR);
        for (const file of files) {
            const filePath = path.join(CHUNK_TEMP_DIR, file);
            const stats = await fs.stat(filePath);
            if (now - stats.mtimeMs > expireMs) {
                await fs.unlink(filePath);
            }
        }
    } catch (error) {
        console.error('清理过期分片失败：', error);
    }
};

// 获取回收站文件列表
const getRecycleList = async () => {
    const RECYCLE_PATH = path.join(STORAGE_ROOT, 'recycle');
    try {
        if (!fsSync.existsSync(RECYCLE_PATH)) {
            return [];
        }
        const files = await fs.readdir(RECYCLE_PATH, { withFileTypes: true });
        const fileList = await Promise.all(
            files.map(async (file) => {
                const filePath = path.join(RECYCLE_PATH, file.name);
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
        console.error('获取回收站列表失败：', error);
        return [];
    }
};

// 共享列表（内存存储，可扩展为数据库存储）
let shareList = [];

// 生成分享链接
const createShare = (filePath, type = 'public', code = '', permission = 'read') => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let link = '';
    for (let i = 0; i < 8; i++) {
        link += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const shareItem = {
        id: uuidv4(),
        link,
        filePath,
        type,
        code,
        permission,
        views: 0,
        createdAt: new Date().toISOString()
    };
    
    shareList.push(shareItem);
    return link;
};

// 获取分享列表
const getShareList = () => {
    return shareList;
};

// 取消分享
const cancelShare = (link) => {
    const index = shareList.findIndex(s => s.link === link);
    if (index !== -1) {
        shareList.splice(index, 1);
        return true;
    }
    return false;
};

module.exports = {
    initStorage,
    unlockAndRelease,
    releaseVaultToStorage,
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
    getFullFilePath,
    searchFiles,
    uploadChunk,
    checkUploadedChunks,
    mergeChunks,
    cleanExpiredChunks,
    getRecycleList,
    getShareList,
    createShare,
    cancelShare
};