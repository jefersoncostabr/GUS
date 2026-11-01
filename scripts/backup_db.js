import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { promisify } from 'node:util';
import { isDirectExecution } from './isDirectExecution.js';

dotenv.config();

const executeFile = promisify(execFile);

export async function runBackup({
    uri = process.env.MONGO_URI_MASTER,
    backupDir = path.join(process.cwd(), 'backups'),
    fileSystem = fs,
    execute = executeFile,
    now = new Date(),
    logger = console
} = {}) {
    if (!uri) throw new Error('MONGO_URI_MASTER não está configurada.');

    if (!fileSystem.existsSync(backupDir)) {
        fileSystem.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `gus_backup_${timestamp}`);

    logger.log('Iniciando backup do banco de dados...');
    await execute('mongodump', ['--uri', uri, '--out', backupPath]);
    logger.log(`Backup concluído com sucesso em: ${backupPath}`);

    return backupPath;
}

if (isDirectExecution(import.meta.url)) {
    runBackup().catch((error) => {
        console.error(`Erro ao realizar backup: ${error.message}`);
        process.exitCode = 1;
    });
}