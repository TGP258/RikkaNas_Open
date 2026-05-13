const mysql = require('mysql2');
const path = require('path');
const fs = require('fs/promises');
const { exec } = require('child_process');

// 数据库连接配置
const dbConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'rikkanas_db'
};

/**
 * 创建数据库连接
 */
const createConnection = () => {
    return mysql.createConnection(dbConfig);
};

/**
 * 获取所有表名
 * @returns {Promise<string[]>} - 表名数组
 */
const getAllTables = async () => {
    return new Promise((resolve, reject) => {
        const connection = createConnection();
        connection.query('SHOW TABLES', (err, results) => {
            if (err) {
                reject(err);
            } else {
                const tables = results.map(item => Object.values(item)[0]);
                resolve(tables);
            }
            connection.end();
        });
    });
};

/**
 * 导出单表数据为INSERT语句
 * @param {string} tableName - 表名
 * @returns {Promise<string>} - INSERT语句
 */
const exportTableData = async (tableName) => {
    return new Promise((resolve, reject) => {
        const connection = createConnection();
        connection.query(`SELECT * FROM ${tableName}`, async (err, results) => {
            if (err) {
                reject(err);
                return;
            }

            if (results.length === 0) {
                resolve(`-- 表 ${tableName} 无数据\n`);
                connection.end();
                return;
            }

            const columns = Object.keys(results[0]);
            const insertStatements = results.map(row => {
                const values = columns.map(col => {
                    const value = row[col];
                    if (value === null) {
                        return 'NULL';
                    } else if (typeof value === 'string') {
                        return `'${value.replace(/'/g, "''")}'`;
                    } else if (typeof value === 'object' && value instanceof Date) {
                        return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
                    } else {
                        return value;
                    }
                });
                return `INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) VALUES (${values.join(', ')});`;
            });

            resolve(`-- 表 ${tableName} 数据\n${insertStatements.join('\n')}\n\n`);
            connection.end();
        });
    });
};

/**
 * 导出数据库结构
 * @returns {Promise<string>} - 建表语句
 */
const exportDatabaseStructure = async () => {
    const tables = await getAllTables();
    const structure = [];

    for (const table of tables) {
        const connection = createConnection();
        const [results] = await connection.query(`SHOW CREATE TABLE ${table}`);
        structure.push(`-- 表 ${table} 结构\n${results[0]['Create Table']}\n\n`);
        connection.end();
    }

    return structure.join('');
};

/**
 * 执行完整数据库备份
 * @returns {Promise<object>} - 备份结果
 */
const backupDatabase = async () => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupDir = path.join(__dirname, '../backup');
        
        await fs.mkdir(backupDir, { recursive: true });
        
        const structure = await exportDatabaseStructure();
        const tables = await getAllTables();
        
        let dataContent = '';
        for (const table of tables) {
            dataContent += await exportTableData(table);
        }

        const header = `-- RikkaNas 数据库备份
-- 备份时间: ${new Date().toLocaleString('zh-CN')}
-- 数据库: ${dbConfig.database}

`;
        
        const sqlContent = header + structure + '\n-- 数据\n' + dataContent;
        const backupFileName = `backup_${dbConfig.database}_${timestamp}.sql`;
        const backupFilePath = path.join(backupDir, backupFileName);
        
        await fs.writeFile(backupFilePath, sqlContent, 'utf-8');

        return {
            success: true,
            filePath: backupFilePath,
            fileName: backupFileName,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('数据库备份失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * 获取备份文件列表
 * @returns {Promise<Array>} - 备份文件列表
 */
const getBackupList = async () => {
    try {
        const backupDir = path.join(__dirname, '../backup');
        const files = await fs.readdir(backupDir);
        const backupFiles = files
            .filter(file => file.endsWith('.sql'))
            .map(file => {
                const filePath = path.join(backupDir, file);
                return fs.stat(filePath).then(stat => ({
                    name: file,
                    path: filePath,
                    size: stat.size,
                    createdAt: stat.birthtime
                }));
            });
        return Promise.all(backupFiles);
    } catch (error) {
        console.error('获取备份列表失败:', error);
        return [];
    }
};

/**
 * 删除备份文件
 * @param {string} fileName - 文件名
 * @returns {Promise<boolean>} - 是否成功
 */
const deleteBackupFile = async (fileName) => {
    try {
        const filePath = path.join(__dirname, '../backup', fileName);
        await fs.unlink(filePath);
        return true;
    } catch (error) {
        console.error('删除备份文件失败:', error);
        return false;
    }
};

module.exports = {
    backupDatabase,
    getBackupList,
    deleteBackupFile,
    getAllTables,
    exportDatabaseStructure,
    exportTableData
};
