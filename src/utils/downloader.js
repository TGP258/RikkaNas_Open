import axios from 'axios';

// 下载状态枚举
export const DownloadStatus = {
    IDLE: 'idle',
    DOWNLOADING: 'downloading',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    ERROR: 'error'
};

/**
 * 断点续传下载器
 */
export class ResumableDownloader {
    constructor(options = {}) {
        this.url = options.url || '';
        this.filePath = options.filePath || '';
        this.fileName = options.fileName || 'download.bin';
        this.chunkSize = options.chunkSize || 1024 * 1024; // 1MB
        this.maxRetries = options.maxRetries || 3;
        
        // 下载状态
        this.status = DownloadStatus.IDLE;
        this.progress = 0;
        this.downloadedSize = 0;
        this.totalSize = 0;
        this.speed = 0;
        this.startTime = null;
        
        // 文件相关
        this.fileHandle = null;
        this.writer = null;
        
        // 请求相关
        this.currentChunk = 0;
        this.abortController = null;
        
        // 回调函数
        this.onProgress = options.onProgress || (() => {});
        this.onStatusChange = options.onStatusChange || (() => {});
        this.onComplete = options.onComplete || (() => {});
        this.onError = options.onError || (() => {});
    }
    
    /**
     * 获取下载URL
     */
    getDownloadUrl() {
        if (this.filePath) {
            return `/api/files/download?path=${encodeURIComponent(this.filePath)}`;
        }
        return this.url;
    }
    
    /**
     * 获取文件大小
     */
    async getFileSize() {
        try {
            const response = await axios.head(this.getDownloadUrl());
            const contentLength = response.headers['content-length'];
            return contentLength ? parseInt(contentLength, 10) : 0;
        } catch (error) {
            console.error('获取文件大小失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取已下载的字节数（从本地文件）
     */
    async getDownloadedBytes() {
        if (!this.fileHandle) {
            return 0;
        }
        try {
            const file = await this.fileHandle.getFile();
            return file.size;
        } catch (error) {
            return 0;
        }
    }
    
    /**
     * 开始下载
     */
    async start() {
        if (this.status === DownloadStatus.DOWNLOADING) {
            return;
        }
        
        this.status = DownloadStatus.DOWNLOADING;
        this.startTime = Date.now();
        this.currentChunk = 0;
        
        this.notifyStatusChange();
        
        try {
            // 获取文件大小
            this.totalSize = await this.getFileSize();
            
            // 创建或打开本地文件
            await this.createOrOpenFile();
            
            // 获取已下载大小
            this.downloadedSize = await this.getDownloadedBytes();
            this.currentChunk = Math.floor(this.downloadedSize / this.chunkSize);
            
            // 如果已经下载完成，直接返回
            if (this.downloadedSize >= this.totalSize) {
                this.complete();
                return;
            }
            
            // 开始分块下载
            await this.downloadChunks();
        } catch (error) {
            this.handleError(error);
        }
    }
    
    /**
     * 创建或打开本地文件
     */
    async createOrOpenFile() {
        if (typeof window !== 'undefined' && window.showSaveFilePicker) {
            // 使用File System Access API
            this.fileHandle = await window.showSaveFilePicker({
                suggestedName: this.fileName,
                types: [{
                    description: 'All Files',
                    accept: { '*/*': [] }
                }]
            });
        } else {
            // 回退到传统下载方式
            this.fileHandle = null;
        }
    }
    
    /**
     * 分块下载
     */
    async downloadChunks() {
        while (this.status === DownloadStatus.DOWNLOADING && this.downloadedSize < this.totalSize) {
            const start = this.currentChunk * this.chunkSize;
            const end = Math.min(start + this.chunkSize - 1, this.totalSize - 1);
            
            await this.downloadChunk(start, end);
            this.currentChunk++;
        }
        
        if (this.status === DownloadStatus.DOWNLOADING && this.downloadedSize >= this.totalSize) {
            this.complete();
        }
    }
    
    /**
     * 下载单个块
     */
    async downloadChunk(start, end) {
        let retries = 0;
        
        while (retries < this.maxRetries) {
            try {
                this.abortController = new AbortController();
                
                const response = await axios.get(this.getDownloadUrl(), {
                    headers: {
                        Range: `bytes=${start}-${end}`
                    },
                    responseType: 'blob',
                    signal: this.abortController.signal,
                    onDownloadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            const chunkProgress = progressEvent.loaded / progressEvent.total;
                            const totalProgress = (this.downloadedSize + (end - start + 1) * chunkProgress) / this.totalSize;
                            this.updateProgress(totalProgress);
                        }
                    }
                });
                
                // 写入文件
                await this.writeChunk(response.data);
                this.downloadedSize += response.data.size;
                
                this.updateProgress(this.downloadedSize / this.totalSize);
                return;
                
            } catch (error) {
                retries++;
                if (retries >= this.maxRetries) {
                    throw error;
                }
                // 重试前等待一段时间
                await this.sleep(Math.pow(2, retries) * 1000);
            }
        }
    }
    
    /**
     * 写入文件块
     */
    async writeChunk(blob) {
        if (!this.fileHandle) {
            // 回退到传统下载
            this.traditionalDownload();
            return;
        }
        
        const writable = await this.fileHandle.createWritable({ keepExistingData: true });
        await writable.write({ type: 'write', position: this.downloadedSize, data: blob });
        await writable.close();
    }
    
    /**
     * 传统下载方式（不支持断点续传）
     */
    async traditionalDownload() {
        try {
            const response = await axios.get(this.getDownloadUrl(), {
                responseType: 'blob',
                onDownloadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        this.updateProgress(progressEvent.loaded / progressEvent.total);
                    }
                }
            });
            
            // 从响应头获取Content-Type
            const contentType = response.headers['content-type'] || 'application/octet-stream';
            
            // 创建正确类型的blob
            const blob = new Blob([response.data], { type: contentType });
            
            // 从响应头获取文件名
            let fileName = this.fileName;
            const contentDisposition = response.headers['content-disposition'];
            if (contentDisposition) {
                // 尝试从Content-Disposition头中提取文件名
                const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (match && match[1]) {
                    let extractedFileName = match[1].replace(/['"]/g, '');
                    // 如果是URL编码的，解码
                    try {
                        extractedFileName = decodeURIComponent(extractedFileName);
                    } catch (e) {
                        // 解码失败，保持原样
                    }
                    fileName = extractedFileName || fileName;
                }
            }
            
            this.createDownloadLink(blob, fileName);
            this.complete();
        } catch (error) {
            this.handleError(error);
        }
    }
    
    /**
     * 创建下载链接
     */
    createDownloadLink(blob, fileName) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // 确保文件名包含正确的扩展名
        // 如果文件名不包含扩展名，尝试从Content-Type推断
        if (!fileName.includes('.')) {
            const ext = this.getExtensionFromContentType(blob.type);
            fileName = `${fileName}${ext}`;
        }
        
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
    
    /**
     * 从Content-Type推断文件扩展名
     */
    getExtensionFromContentType(contentType) {
        const extMap = {
            'text/plain': '.txt',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
            'application/vnd.ms-excel': '.xls',
            'application/pdf': '.pdf',
            'text/html': '.html',
            'application/json': '.json',
            'application/javascript': '.js',
            'text/css': '.css'
        };
        return extMap[contentType] || '.bin';
    }
    
    /**
     * 暂停下载
     */
    pause() {
        if (this.status === DownloadStatus.DOWNLOADING) {
            this.status = DownloadStatus.PAUSED;
            if (this.abortController) {
                this.abortController.abort();
            }
            this.notifyStatusChange();
        }
    }
    
    /**
     * 继续下载
     */
    resume() {
        if (this.status === DownloadStatus.PAUSED) {
            this.start();
        }
    }
    
    /**
     * 取消下载
     */
    cancel() {
        this.status = DownloadStatus.IDLE;
        if (this.abortController) {
            this.abortController.abort();
        }
        this.notifyStatusChange();
    }
    
    /**
     * 完成下载
     */
    complete() {
        this.status = DownloadStatus.COMPLETED;
        this.progress = 100;
        this.notifyStatusChange();
        this.onComplete(this.fileName);
    }
    
    /**
     * 处理错误
     */
    handleError(error) {
        this.status = DownloadStatus.ERROR;
        this.notifyStatusChange();
        this.onError(error);
    }
    
    /**
     * 更新进度
     */
    updateProgress(progress) {
        this.progress = Math.round(progress * 100);
        
        // 计算下载速度
        if (this.startTime) {
            const elapsed = (Date.now() - this.startTime) / 1000;
            if (elapsed > 0) {
                this.speed = this.downloadedSize / elapsed;
            }
        }
        
        this.onProgress({
            progress: this.progress,
            downloadedSize: this.downloadedSize,
            totalSize: this.totalSize,
            speed: this.speed
        });
    }
    
    /**
     * 通知状态变化
     */
    notifyStatusChange() {
        this.onStatusChange({
            status: this.status,
            progress: this.progress,
            downloadedSize: this.downloadedSize,
            totalSize: this.totalSize,
            speed: this.speed
        });
    }
    
    /**
     * 等待指定时间
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 格式化文件大小
     */
    static formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * 格式化速度
     */
    static formatSpeed(bytesPerSecond) {
        return this.formatSize(bytesPerSecond) + '/s';
    }
}

/**
 * 简化的下载函数
 */
export const downloadFile = async (filePath, options = {}) => {
    const downloader = new ResumableDownloader({
        filePath,
        fileName: options.fileName || filePath.split('/').pop() || 'download.bin',
        chunkSize: options.chunkSize,
        maxRetries: options.maxRetries,
        onProgress: options.onProgress,
        onStatusChange: options.onStatusChange,
        onComplete: options.onComplete,
        onError: options.onError
    });
    
    await downloader.start();
    return downloader;
};

export default ResumableDownloader;