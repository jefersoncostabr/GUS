import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script de Backup Automatizado (mongodump)
 * Este script realiza o dump completo do cluster MongoDB.
 * Certifique-se de ter o 'database-tools' do MongoDB instalado no sistema.
 */

const MONGO_URI = process.env.MONGO_URI_MASTER;
const BACKUP_DIR = path.join(process.cwd(), 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(BACKUP_DIR, `gus_backup_${timestamp}`);

const command = `mongodump --uri="${MONGO_URI}" --out="${backupPath}"`;

console.log('🚀 Iniciando backup do banco de dados...');

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error(`❌ Erro ao realizar backup: ${error.message}`);
        return;
    }
    console.log(`✅ Backup concluído com sucesso em: ${backupPath}`);
});