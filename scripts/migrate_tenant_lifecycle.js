import 'dotenv/config';
import mongoose from 'mongoose';
import { getEstudioModel } from '../src/models/estudiomodel.js';
import { isDirectExecution } from './isDirectExecution.js';

export async function migrateTenantLifecycle({
    uri = process.env.MONGO_URI_MASTER,
    connect = mongoose.connect.bind(mongoose),
    disconnect = mongoose.disconnect.bind(mongoose),
    getModel = getEstudioModel,
    connection = mongoose.connection,
    logger = console
} = {}) {
    if (!uri) throw new Error('MONGO_URI_MASTER não está configurada.');

    await connect(uri);
    try {
        const Estudio = getModel(connection);
        const resultado = await Estudio.updateMany(
            { $or: [{ approvalStatus: { $exists: false } }, { approvalStatus: null }] },
            { $set: { approvalStatus: 'approved' } }
        );

        logger.log(`Migração concluída. Tenants aprovados: ${resultado.modifiedCount}. Trial retroativo: nenhum.`);
        return resultado;
    } finally {
        await disconnect();
    }
}

if (isDirectExecution(import.meta.url)) {
    migrateTenantLifecycle().catch((error) => {
        console.error(`Falha na migração de lifecycle: ${error.message}`);
        process.exitCode = 1;
    });
}