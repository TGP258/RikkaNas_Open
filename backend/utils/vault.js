const crypto = require('crypto');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const VAULT_DIR = path.join(__dirname, '../vault');
const VAULT_FILE = path.join(VAULT_DIR, 'container RikkaVault');
const METADATA_FILE = path.join(VAULT_DIR, 'metadata.db');
const SALT_FILE = path.join(VAULT_DIR, 'salt.bin');
const ITERATIONS = 100000;
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const BLOCK_SIZE = 64 * 1024;

class VaultManager {
    constructor() {
        this.containerKey = null;
        this.metadataKey = null;
        this.isUnlocked = false;
        this.containerHandle = null;
    }

    async init() {
        try {
            if (!fsSync.existsSync(VAULT_DIR)) {
                await fs.mkdir(VAULT_DIR, { recursive: true });
            }
        } catch (error) {
            console.error('初始化保险库目录失败:', error);
        }
    }

    async createVault(password) {
        if (this.isUnlocked) {
            throw new Error('保险库已解锁，请先锁定');
        }

        if (fsSync.existsSync(VAULT_FILE)) {
            throw new Error('保险库已存在，请使用解锁');
        }

        if (!fsSync.existsSync(VAULT_DIR)) {
            await fs.mkdir(VAULT_DIR, { recursive: true });
        }

        const salt = crypto.randomBytes(SALT_LENGTH);
        const containerKey = this.deriveKey(password, salt, 'container');
        const metadataKey = this.deriveKey(password, salt, 'metadata');

        const emptyMetadata = {
            version: 1,
            files: {},
            folders: {},
            nextId: 1
        };

        const encryptedMetadata = this.encryptMetadata(JSON.stringify(emptyMetadata), metadataKey);

        await fs.writeFile(SALT_FILE, salt);
        await fs.writeFile(METADATA_FILE, encryptedMetadata);
        await fs.writeFile(VAULT_FILE, Buffer.alloc(0));

        this.containerKey = containerKey;
        this.metadataKey = metadataKey;
        this.isUnlocked = true;
        this.currentMetadata = emptyMetadata;

        return { success: true, message: '保险库创建成功' };
    }

    async unlockVault(password) {
        if (this.isUnlocked) {
            return { success: true, message: '保险库已解锁', alreadyUnlocked: true };
        }

        if (!fsSync.existsSync(SALT_FILE) || !fsSync.existsSync(METADATA_FILE)) {
            return { success: false, error: '保险库不存在，请先创建', needsCreate: true };
        }

        try {
            const salt = await fs.readFile(SALT_FILE);
            const containerKey = this.deriveKey(password, salt, 'container');
            const metadataKey = this.deriveKey(password, salt, 'metadata');

            const encryptedMetadata = await fs.readFile(METADATA_FILE);
            const metadataJson = this.decryptMetadata(encryptedMetadata, metadataKey);
            const metadata = JSON.parse(metadataJson);

            this.containerKey = containerKey;
            this.metadataKey = metadataKey;
            this.isUnlocked = true;
            this.currentMetadata = metadata;

            return { success: true, message: '解锁成功', metadata };
        } catch (error) {
            this.containerKey = null;
            this.metadataKey = null;
            return { success: false, error: '密码错误，解锁失败' };
        }
    }

    async lockVault() {
        if (!this.isUnlocked) {
            return { success: true, message: '保险库已锁定' };
        }

        if (this.currentMetadata) {
            await this.saveMetadata();
        }

        this.containerKey = null;
        this.metadataKey = null;
        this.isUnlocked = false;
        this.currentMetadata = null;

        return { success: true, message: '保险库已锁定' };
    }

    deriveKey(password, salt, purpose) {
        const info = Buffer.from(`RikkaVault-${purpose}`);
        return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512').toString('hex');
    }

    encryptBuffer(data, keyHex) {
        const key = Buffer.from(keyHex, 'hex');
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

        const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
        const tag = cipher.getAuthTag();

        return Buffer.concat([iv, tag, encrypted]);
    }

    decryptBuffer(encryptedData, keyHex) {
        const key = Buffer.from(keyHex, 'hex');
        const iv = encryptedData.subarray(0, IV_LENGTH);
        const tag = encryptedData.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
        const encrypted = encryptedData.subarray(IV_LENGTH + TAG_LENGTH);

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);

        return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    }

    encryptMetadata(json, keyHex) {
        const data = Buffer.from(json, 'utf8');
        return this.encryptBuffer(data, keyHex);
    }

    decryptMetadata(encryptedData, keyHex) {
        const decrypted = this.decryptBuffer(encryptedData, keyHex);
        return decrypted.toString('utf8');
    }

    async saveMetadata() {
        if (!this.isUnlocked || !this.currentMetadata) {
            return;
        }
        const encryptedMetadata = this.encryptMetadata(JSON.stringify(this.currentMetadata), this.metadataKey);
        await fs.writeFile(METADATA_FILE, encryptedMetadata);
    }

    async addFile(fileBuffer, fileName, relativePath = '') {
        if (!this.isUnlocked) {
            throw new Error('保险库未解锁');
        }

        const fileId = `file_${this.currentMetadata.nextId++}`;
        const encFileName = this.encryptFileName(fileName);

        const encryptedData = this.encryptBuffer(fileBuffer, this.containerKey);

        const fileEntry = {
            id: fileId,
            originalName: fileName,
            size: fileBuffer.length,
            createdAt: new Date().toISOString(),
            dataPath: `${fileId}.enc`
        };

        const dataFilePath = path.join(VAULT_DIR, `${fileId}.enc`);
        await fs.writeFile(dataFilePath, encryptedData);

        const pathKey = relativePath ? `${relativePath}/${fileName}` : fileName;
        this.currentMetadata.files[pathKey] = fileEntry;

        await this.saveMetadata();

        return {
            id: fileId,
            name: fileName,
            path: pathKey,
            size: fileBuffer.length
        };
    }

    async getFile(filePath) {
        if (!this.isUnlocked) {
            throw new Error('保险库未解锁');
        }

        const fileEntry = this.currentMetadata.files[filePath];
        if (!fileEntry) {
            return null;
        }

        const dataFilePath = path.join(VAULT_DIR, `${fileEntry.id}.enc`);
        const encryptedData = await fs.readFile(dataFilePath);
        const decryptedData = this.decryptBuffer(encryptedData, this.containerKey);

        return {
            buffer: decryptedData,
            name: fileEntry.originalName,
            size: fileEntry.size
        };
    }

    async deleteFile(filePath) {
        if (!this.isUnlocked) {
            throw new Error('保险库未解锁');
        }

        const fileEntry = this.currentMetadata.files[filePath];
        if (!fileEntry) {
            return false;
        }

        const dataFilePath = path.join(VAULT_DIR, `${fileEntry.id}.enc`);
        try {
            await fs.unlink(dataFilePath);
        } catch (e) {}

        delete this.currentMetadata.files[filePath];
        await this.saveMetadata();

        return true;
    }

    async addFolder(folderName, relativePath = '') {
        if (!this.isUnlocked) {
            throw new Error('保险库未解锁');
        }

        const folderId = `folder_${this.currentMetadata.nextId++}`;
        const pathKey = relativePath ? `${relativePath}/${folderName}` : folderName;

        this.currentMetadata.folders[pathKey] = {
            id: folderId,
            name: folderName,
            createdAt: new Date().toISOString()
        };

        await this.saveMetadata();

        return { id: folderId, name: folderName, path: pathKey };
    }

    async deleteFolder(folderPath) {
        if (!this.isUnlocked) {
            throw new Error('保险库未解锁');
        }

        if (this.currentMetadata.folders[folderPath]) {
            delete this.currentMetadata.folders[folderPath];
        }

        for (const filePath of Object.keys(this.currentMetadata.files)) {
            if (filePath.startsWith(folderPath + '/')) {
                await this.deleteFile(filePath);
            }
        }

        await this.saveMetadata();
        return true;
    }

    async listFiles(relativePath = '') {
        if (!this.isUnlocked) {
            throw new Error('保险库未解锁');
        }

        const files = [];
        const folders = [];

        const prefix = relativePath ? relativePath + '/' : '';

        for (const [filePath, entry] of Object.entries(this.currentMetadata.files)) {
            if (filePath.startsWith(prefix)) {
                const remainder = filePath.substring(prefix.length);
                if (!remainder.includes('/')) {
                    files.push({
                        name: entry.originalName,
                        path: filePath,
                        type: 'file',
                        size: entry.size,
                        createdAt: entry.createdAt
                    });
                }
            }
        }

        for (const [folderPath, entry] of Object.entries(this.currentMetadata.folders)) {
            if (folderPath.startsWith(prefix)) {
                const remainder = folderPath.substring(prefix.length);
                if (!remainder.includes('/')) {
                    folders.push({
                        name: entry.name,
                        path: folderPath,
                        type: 'folder',
                        createdAt: entry.createdAt
                    });
                }
            }
        }

        return { files, folders };
    }

    async renameFile(oldPath, newName) {
        if (!this.isUnlocked) {
            throw new Error('保险库未解锁');
        }

        const fileEntry = this.currentMetadata.files[oldPath];
        if (!fileEntry) {
            return false;
        }

        const parentPath = oldPath.includes('/') ? oldPath.substring(0, oldPath.lastIndexOf('/')) : '';
        const newPath = parentPath ? `${parentPath}/${newName}` : newName;

        fileEntry.originalName = newName;
        this.currentMetadata.files[newPath] = fileEntry;
        delete this.currentMetadata.files[oldPath];

        await this.saveMetadata();
        return true;
    }

    async renameFolder(oldPath, newName) {
        if (!this.isUnlocked) {
            throw new Error('保险库未解锁');
        }

        const folderEntry = this.currentMetadata.folders[oldPath];
        if (!folderEntry) {
            return false;
        }

        const parentPath = oldPath.includes('/') ? oldPath.substring(0, oldPath.lastIndexOf('/')) : '';
        const newPath = parentPath ? `${parentPath}/${newName}` : newName;

        folderEntry.name = newName;
        this.currentMetadata.folders[newPath] = folderEntry;
        delete this.currentMetadata.folders[oldPath];

        const filesToRename = {};
        for (const [filePath, entry] of Object.entries(this.currentMetadata.files)) {
            if (filePath.startsWith(oldPath + '/')) {
                const newFilePath = filePath.replace(oldPath, newPath);
                filesToRename[newFilePath] = entry;
                delete this.currentMetadata.files[filePath];
            }
        }

        for (const [newFilePath, entry] of Object.entries(filesToRename)) {
            this.currentMetadata.files[newFilePath] = entry;
        }

        await this.saveMetadata();
        return true;
    }

    encryptFileName(fileName) {
        const key = this.metadataKey;
        return this.encryptBuffer(Buffer.from(fileName, 'utf8'), key).toString('hex');
    }

    getStatus() {
        return {
            exists: fsSync.existsSync(VAULT_FILE),
            isUnlocked: this.isUnlocked,
            hasPassword: fsSync.existsSync(SALT_FILE)
        };
    }
}

const vault = new VaultManager();
vault.init();

module.exports = vault;