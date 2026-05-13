import axios from 'axios';

// 根据当前页面的主机名动态设置后端地址
const getBackendUrl = () => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:3000`;
};

// 创建axios实例，直接请求后端（不走Vite代理）
const apiClient = axios.create({
    baseURL: getBackendUrl(),
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

export const getFileList = (path = '') => {
    return apiClient.get('/api/files/list', { params: { path } });
};

export const deleteFile = (path) => {
    return apiClient.delete('/api/files/delete', { data: { path } });
};

export const downloadFile = (path) => {
    return apiClient.get('/api/files/download', { params: { path }, responseType: 'blob' }).then(response => {
        // 获取文件名
        const contentDisposition = response.headers['content-disposition'];
        let fileName = 'download';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+)"/);
            if (match && match[1]) {
                fileName = decodeURIComponent(match[1]);
            }
        }
        
        // 创建下载链接
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        return response;
    });
};

// 重命名
export const renameFile = (oldPath, newName) => {
    return apiClient.post('/api/files/rename', { oldPath, newName });
};

// 设置剪贴板（复制/剪切）
export const setClipboard = (type, path) => {
    return apiClient.post('/api/files/clipboard', { type, path });
};

// 粘贴文件
export const pasteFile = (targetPath) => {
    return apiClient.post('/api/files/paste', { targetPath });
};

// 搜索文件
export const searchFiles = (keyword, path = '') => {
    return apiClient.get('/api/files/search', { params: { keyword, path } });
};

// ===== 新增：创建文件夹 =====
export const createFolder = (folderName, path = '') => {
    return apiClient.post('/api/files/create-folder', { folderName, path });
};

// 将字符串编码为 base64
const encodeFileName = (str) => {
    const utf8Bytes = new TextEncoder().encode(str);
    let binary = '';
    utf8Bytes.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary);
};

// ===== 文件上传（支持文件夹） =====
export const uploadFile = async (files, path = '') => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.webkitRelativePath) {
            // 文件夹上传：编码webkitRelativePath，文件名用 __NAME__ 标记原始文件名
            const encodedPath = encodeFileName(file.webkitRelativePath);
            const finalName = `__PATH__${encodedPath}__NAME__${file.name}`;
            const fileContent = file.slice();
            const fileWithPath = new File([fileContent], finalName, { type: file.type });
            formData.append('file', fileWithPath);
        } else {
            // 单文件上传：文件名用 __NAME__ 标记原始文件名
            const encodedName = encodeFileName(file.name);
            const finalName = `__NAME__${encodedName}`;
            const fileContent = file.slice();
            const fileWithName = new File([fileContent], finalName, { type: file.type });
            formData.append('file', fileWithName);
        }
    }
    formData.append('path', path);
    return apiClient.post('/api/files/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};

// 获取本机局域网IP
export const getLocalIp = () => {
    return apiClient.get('/api/system/ip');
};

// 检查文件是否存在
export const checkFileExists = (path, filename, md5 = null) => {
    return apiClient.post('/api/files/check-exists', { path, filename, md5 });
};

// 纯JavaScript MD5实现
const md5 = (input) => {
    const rotateLeft = (value, shift) => (value << shift) | (value >>> (32 - shift));
    
    const addUnsigned = (x, y) => {
        const lsw = (x & 0xFFFF) + (y & 0xFFFF);
        const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    };

    const F = (x, y, z) => (x & y) | (~x & z);
    const G = (x, y, z) => (x & z) | (y & ~z);
    const H = (x, y, z) => x ^ y ^ z;
    const I = (x, y, z) => y ^ (x | ~z);

    const FF = (a, b, c, d, x, s, ac) => addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, F(b, c, d)), addUnsigned(x, ac)), s), b);
    const GG = (a, b, c, d, x, s, ac) => addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, G(b, c, d)), addUnsigned(x, ac)), s), b);
    const HH = (a, b, c, d, x, s, ac) => addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, H(b, c, d)), addUnsigned(x, ac)), s), b);
    const II = (a, b, c, d, x, s, ac) => addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, I(b, c, d)), addUnsigned(x, ac)), s), b);

    const convertToWordArray = (str) => {
        const lMessageLength = str.length;
        const lNumberOfWords_temp1 = lMessageLength + 8;
        const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
        const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
        const lWordArray = new Array(lNumberOfWords - 1);
        let lBytePosition = 0;
        let lByteCount = 0;
        
        while (lByteCount < lMessageLength) {
            const lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition));
            lByteCount++;
        }
        
        const lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
        lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
        lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
        
        return lWordArray;
    };

    const wordToHex = (lValue) => {
        const wordToHexValue = [];
        const lByte = [];
        
        for (let i = 0; i <= 3; i++) {
            lByte[i] = (lValue >>> (8 * i)) & 0xFF;
            wordToHexValue[i] = "0123456789abcdef".charAt(lByte[i] >> 4) + "0123456789abcdef".charAt(lByte[i] & 0x0F);
        }
        
        return wordToHexValue.join('');
    };

    let x = [];
    let k, AA, BB, CC, DD, a, b, c, d;
    const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
    const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
    const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
    const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

    const inputStr = typeof input === 'string' ? input : String.fromCharCode(...new Uint8Array(input));
    x = convertToWordArray(inputStr);

    a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;

    for (k = 0; k < x.length; k += 16) {
        AA = a; BB = b; CC = c; DD = d;
        a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
        d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
        c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
        b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
        a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
        d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
        c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
        b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
        a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
        d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
        c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
        b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
        a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
        d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
        c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
        b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
        a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
        d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
        c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
        b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
        a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
        d = GG(d, a, b, c, x[k + 10], S22, 0x02441453);
        c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
        b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
        a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
        d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
        c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
        b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
        a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
        d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
        c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
        b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
        a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
        d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
        c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
        b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
        a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
        d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
        c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
        b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
        a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
        d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
        c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
        b = HH(b, c, d, a, x[k + 6], S34, 0x04881D05);
        a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
        d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
        c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
        b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
        a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
        d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
        c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
        b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
        a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
        d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
        c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
        b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
        a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
        d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
        c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
        b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
        a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
        d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
        c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
        b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
        a = addUnsigned(a, AA);
        b = addUnsigned(b, BB);
        c = addUnsigned(c, CC);
        d = addUnsigned(d, DD);
    }

    return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
};

// 计算文件MD5值
export const calculateFileMd5 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const arrayBuffer = e.target.result;
            try {
                const hash = md5(arrayBuffer);
                resolve(hash);
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};
