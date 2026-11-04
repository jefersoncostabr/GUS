import 'dotenv/config';
import mongoose from 'mongoose';
import { isDirectExecution } from './isDirectExecution.js';

const indexName = 'tenantDbName_1';
const indexKey = { tenantDbName: 1 };
const partialFilterExpression = { tenantDbName: { $type: 'string' } };

function isTenantDbNameIndex(index) {
    const keys = Object.entries(index.key || {});
    return keys.length === 1 && keys[0][0] === 'tenantDbName' && keys[0][1] === 1;
}

function isCorrectIndex(index) {
    return index.unique === true
        && index.partialFilterExpression?.tenantDbName?.$type === 'string';
}

export async function migrateEstudioTenantDbNameIndex({
    uri = process.env.MONGO_URI_MASTER,
    connect = mongoose.connect.bind(mongoose),
    disconnect = mongoose.disconnect.bind(mongoose),
    connection = mongoose.connection,
    logger = console
} = {}) {
    if (!uri) throw new Error('MONGO_URI_MASTER não está configurada.');

    await connect(uri);
    try {
        const collection = connection.collection('estudios');
        let indexes;
        try {
            indexes = await collection.indexes();
        } catch (error) {
            if (error.code !== 26 && error.codeName !== 'NamespaceNotFound') throw error;
            indexes = [];
        }

        const existingIndex = indexes.find(isTenantDbNameIndex);
        if (existingIndex && !isCorrectIndex(existingIndex)) {
            await collection.dropIndex(existingIndex.name);
        }

        if (!existingIndex || !isCorrectIndex(existingIndex)) {
            await collection.createIndex(indexKey, {
                name: indexName,
                unique: true,
                partialFilterExpression
            });
        }

        logger.log('Índice único de tenantDbName atualizado; estúdios sem tenant podem coexistir.');
    } finally {
        await disconnect();
    }
}

if (isDirectExecution(import.meta.url)) {
    migrateEstudioTenantDbNameIndex().catch((error) => {
        console.error(`Falha na migração do índice de estúdios: ${error.message}`);
        process.exitCode = 1;
    });
}
