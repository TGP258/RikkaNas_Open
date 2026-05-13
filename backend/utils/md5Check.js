const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// MD5文件去重检查
// 通过计算文件MD5值，判断是否已存在相同文件，避免重复存储

/**
 * 计算文件的MD5值
 * @param {string} filePath - 文件路径
 * @returns {Promise<string>} - MD5哈希值
 */
const calculateFileMd5 = (filePath) => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (chunk) => {
            hash.update(chunk);
        });

        stream.on('end', () => {
            resolve(hash.digest('hex'));
        });

        stream.on('error', (error) => {
            reject(error);
        });
    });
};

/**
 * 检查文件MD5是否已存在
 * @param {string} md5 - 文件MD5值
 * @returns {boolean} - 是否已存在
 */
const isMd5Exists = async (md5) => {
    try {
        const md5FilePath = path.join(__dirname, '../storage/.md5-index');
        if (!fs.existsSync(md5FilePath)) {
            return false;
        }
        const content = await fs.readFile(md5FilePath, 'utf-8');
        const md5List = content.split('\n').filter(line => line.trim());
        return md5List.includes(md5);
    } catch (error) {
        console.error('检查MD5失败:', error);
        return false;
    }
};

/**
 * 保存文件MD5到索引
 * @param {string} md5 - 文件MD5值
 * @param {string} filePath - 文件存储路径
 */
const saveMd5Index = async (md5, filePath) => {
    try {
        const md5FilePath = path.join(__dirname, '../storage/.md5-index');
        const record = `${md5}:${filePath}\n`;
        await fs.appendFile(md5FilePath, record, 'utf-8');
    } catch (error) {
        console.error('保存MD5索引失败:', error);
    }
};

/**
 * 获取MD5对应的文件路径
 * @param {string} md5 - 文件MD5值
 * @returns {Promise<string|null>} - 文件路径
 */
const getFilePathByMd5 = async (md5) => {
    try {
        const md5FilePath = path.join(__dirname, '../storage/.md5-index');
        if (!fs.existsSync(md5FilePath)) {
            return null;
        }
        const content = await fs.readFile(md5FilePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        for (const line of lines) {
            const [hash, filePath] = line.split(':');
            if (hash === md5) {
                return filePath;
            }
        }
        return null;
    } catch (error) {
        console.error('查询MD5失败:', error);
        return null;
    }
};

module.exports = {
    calculateFileMd5,
    isMd5Exists,
    saveMd5Index,
    getFilePathByMd5
};
