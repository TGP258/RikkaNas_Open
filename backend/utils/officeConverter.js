const fs = require('fs');
const path = require('path');
const libre = require('libreoffice-convert');

const convertOfficeToPdf = async (inputPath) => {
    return new Promise((resolve, reject) => {
        const outputPath = inputPath + '.pdf';
        
        console.log(`[OfficeConverter] 尝试转换文件: ${inputPath}`);
        console.log(`[OfficeConverter] 输出路径: ${outputPath}`);
        
        if (fs.existsSync(outputPath)) {
            console.log(`[OfficeConverter] 检测到已存在的PDF缓存`);
            const inputStat = fs.statSync(inputPath);
            const outputStat = fs.statSync(outputPath);
            if (outputStat.mtime > inputStat.mtime) {
                console.log(`[OfficeConverter] 使用缓存文件`);
                resolve(outputPath);
                return;
            }
        }

        if (!fs.existsSync(inputPath)) {
            console.error(`[OfficeConverter] 文件不存在: ${inputPath}`);
            reject(new Error(`文件不存在: ${inputPath}`));
            return;
        }

        try {
            const file = fs.readFileSync(inputPath);
            console.log(`[OfficeConverter] 文件读取成功，大小: ${file.length} bytes`);
            
            libre.convert(file, '.pdf', undefined, (err, done) => {
                if (err) {
                    console.error(`[OfficeConverter] 转换失败: ${err.message}`);
                    console.error(`[OfficeConverter] 错误堆栈: ${err.stack}`);
                    reject(err);
                } else {
                    console.log(`[OfficeConverter] 转换成功，输出大小: ${done.length} bytes`);
                    fs.writeFileSync(outputPath, done);
                    resolve(outputPath);
                }
            });
        } catch (readErr) {
            console.error(`[OfficeConverter] 读取文件失败: ${readErr.message}`);
            reject(readErr);
        }
    });
};

const isOfficeFile = (filename) => {
    const ext = path.extname(filename).toLowerCase();
    return ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp'].includes(ext);
};

module.exports = {
    convertOfficeToPdf,
    isOfficeFile
};