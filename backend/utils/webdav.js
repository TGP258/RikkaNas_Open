const http = require('http');
const path = require('path');
const fs = require('fs');
const url = require('url');
const crypto = require('crypto');

const STORAGE_ROOT = path.resolve(__dirname, '../storage');

class RikkaWebDAVServer {
    constructor() {
        this.server = null;
        this.port = 3001;
    }

    resolveDiskPath(rel) {
        const root = STORAGE_ROOT;
        if (!rel) return root;
        rel = rel.replace(/^\\+/g, '/');
        rel = rel.replace(/^\/+/, '');
        return path.join(root, rel);
    }

    async start(port = 3001) {
        this.port = port;

        return new Promise((resolve, reject) => {
            try {
                if (!fs.existsSync(STORAGE_ROOT)) {
                    fs.mkdirSync(STORAGE_ROOT, { recursive: true });
                }

                this.server = http.createServer((req, res) => {
                    this.handleRequest(req, res);
                });

                this.server.listen(this.port, '0.0.0.0', () => {
                    console.log('========================================');
                    console.log('WebDAV 服务已启动！');
                    console.log(`服务地址: http://0.0.0.0:${this.port}`);
                    console.log('');
                    console.log('使用说明:');
                    console.log('   Windows 资源管理器地址栏输入:');
                    console.log(`   \\\\localhost@ssl\\${this.port}`);
                    console.log('');
                    console.log('   Mac/Linux 挂载:');
                    console.log(`   mount -t webdav http://localhost:${this.port} /mnt/webdav`);
                    console.log('========================================');
                    resolve(this.port);
                });

                this.server.on('error', (err) => {
                    console.error('WebDAV 服务器错误:', err);
                    reject(err);
                });

            } catch (error) {
                console.error('启动 WebDAV 服务器失败:', error);
                reject(error);
            }
        });
    }

    handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        let pathname = decodeURIComponent(parsedUrl.pathname);
        pathname = pathname.replace(/\\/g, '/').replace(/\/+/g, '/');

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, HEAD, POST, PUT, DELETE, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Depth, Destination, Overwrite, Lock-Token, Timeout, If');
        res.setHeader('DAV', '1,2');
        res.setHeader('MS-Author-Via', 'DAV');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        const diskPath = this.resolveDiskPath(pathname);

        if (req.method === 'PROPFIND') {
            this.handlePropFind(req, res, pathname, diskPath);
        } else if (req.method === 'GET' || req.method === 'HEAD') {
            this.handleGet(req, res, pathname, diskPath);
        } else if (req.method === 'PUT') {
            this.handlePut(req, res, pathname, diskPath);
        } else if (req.method === 'DELETE') {
            this.handleDelete(req, res, pathname, diskPath);
        } else if (req.method === 'MKCOL') {
            this.handleMkcol(req, res, pathname, diskPath);
        } else if (req.method === 'MOVE') {
            this.handleMove(req, res, pathname, diskPath);
        } else {
            res.writeHead(405);
            res.end();
        }
    }

    handlePropFind(req, res, pathname, diskPath) {
        if (!fs.existsSync(diskPath)) {
            res.writeHead(404);
            res.end();
            return;
        }

        const stats = fs.statSync(diskPath);
        const isDir = stats.isDirectory();

        const depth = req.headers.depth || 'infinity';

        let xml = '<?xml version="1.0" encoding="utf-8"?>';
        xml += '<D:multistatus xmlns:D="DAV:">';

        if (isDir) {
            xml += this.createResponseXml(pathname, diskPath, stats, 'collection');
            if (depth !== '0') {
                const files = fs.readdirSync(diskPath);
                for (const file of files) {
                    const filePath = path.join(diskPath, file);
                    const fileStats = fs.statSync(filePath);
                    const relativePath = pathname === '/' ? '/' + file : pathname + '/' + file;
                    const resourceType = fileStats.isDirectory() ? 'collection' : '';
                    xml += this.createResponseXml(relativePath, filePath, fileStats, resourceType);
                }
            }
        } else {
            xml += this.createResponseXml(pathname, diskPath, stats, '');
        }

        xml += '</D:multistatus>';

        res.writeHead(207, { 'Content-Type': 'text/xml; charset=utf-8' });
        res.end(xml);
    }

    createResponseXml(href, diskPath, stats, resourceType) {
        const encodedHref = href.replace(/ /g, '%20');
        let xml = '<D:response>';
        xml += `<D:href>${encodedHref}</D:href>`;
        xml += '<D:propstat>';
        xml += '<D:prop>';
        xml += `<D:displayname>${path.basename(href)}</D:displayname>`;
        xml += `<D:getcontentlength>${stats.size}</D:getcontentlength>`;
        xml += `<D:getlastmodified>${stats.mtime.toUTCString()}</D:getlastmodified>`;
        xml += `<D:creationdate>${stats.birthtime.toISOString()}</D:creationdate>`;
        xml += `<D:resourcetype><D:${resourceType || 'resource'}/></D:resourcetype>`;
        xml += `<D:getcontenttype>${this.getContentType(diskPath)}</D:getcontenttype>`;
        xml += '</D:prop>';
        xml += '<D:status>HTTP/1.1 200 OK</D:status>';
        xml += '</D:propstat>';
        xml += '</D:response>';
        return xml;
    }

    getContentType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const types = {
            '.html': 'text/html', '.htm': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
            '.json': 'application/json', '.xml': 'text/xml', '.txt': 'text/plain',
            '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
            '.pdf': 'application/pdf', '.zip': 'application/zip', '.doc': 'application/msword',
            '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.avi': 'video/x-msvideo'
        };
        return types[ext] || 'application/octet-stream';
    }

    handleGet(req, res, pathname, diskPath) {
        if (!fs.existsSync(diskPath)) {
            res.writeHead(404);
            res.end();
            return;
        }

        const stats = fs.statSync(diskPath);
        if (stats.isDirectory()) {
            this.handlePropFind(req, res, pathname, diskPath);
            return;
        }

        const stream = fs.createReadStream(diskPath);
        res.writeHead(200, {
            'Content-Type': this.getContentType(diskPath),
            'Content-Length': stats.size
        });
        stream.pipe(res);
    }

    handlePut(req, res, pathname, diskPath) {
        const dir = path.dirname(diskPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const stream = fs.createWriteStream(diskPath);
        req.on('data', chunk => stream.write(chunk));
        req.on('end', () => {
            stream.end();
            res.writeHead(201);
            res.end();
        });
        req.on('error', () => {
            stream.destroy();
            res.writeHead(500);
            res.end();
        });
    }

    handleDelete(req, res, pathname, diskPath) {
        if (!fs.existsSync(diskPath)) {
            res.writeHead(404);
            res.end();
            return;
        }

        try {
            if (fs.statSync(diskPath).isDirectory()) {
                fs.rmSync(diskPath, { recursive: true });
            } else {
                fs.unlinkSync(diskPath);
            }
            res.writeHead(204);
            res.end();
        } catch (err) {
            res.writeHead(500);
            res.end();
        }
    }

    handleMkcol(req, res, pathname, diskPath) {
        if (fs.existsSync(diskPath)) {
            res.writeHead(405);
            res.end();
            return;
        }

        try {
            fs.mkdirSync(diskPath, { recursive: true });
            res.writeHead(201);
            res.end();
        } catch (err) {
            res.writeHead(500);
            res.end();
        }
    }

    handleMove(req, res, pathname, diskPath) {
        const destination = req.headers.destination;
        if (!destination) {
            res.writeHead(400);
            res.end();
            return;
        }

        const destPath = this.resolveDiskPath(new url.URL(destination).pathname);

        if (!fs.existsSync(diskPath)) {
            res.writeHead(404);
            res.end();
            return;
        }

        try {
            const destDir = path.dirname(destPath);
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }

            if (fs.existsSync(destPath)) {
                if (fs.statSync(destPath).isDirectory()) {
                    fs.rmSync(destPath, { recursive: true });
                } else {
                    fs.unlinkSync(destPath);
                }
            }

            fs.renameSync(diskPath, destPath);
            res.writeHead(201);
            res.end();
        } catch (err) {
            res.writeHead(500);
            res.end();
        }
    }

    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => resolve());
            } else {
                resolve();
            }
        });
    }
}

const webdavServer = new RikkaWebDAVServer();
module.exports = webdavServer;
