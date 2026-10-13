import 'dotenv/config';
import mongoose from 'mongoose';
import { getEstudioModel } from '../src/models/estudiomodel.js';

async function main() {
    if (!process.env.MONGO_URI_MASTER) throw new Error('MONGO_URI_MASTER não está configurada.');

    await mongoose.connect(process.env.MONGO_URI_MASTER);
    const Estudio = getEstudioModel(mongoose.connection);
    const resultado = await Estudio.updateMany(
        { $or: [{ approvalStatus: { $exists: false } }, { approvalStatus: null }] },
        { $set: { approvalStatus: 'approved' } }
    );

    console.log(`Migração concluída. Tenants aprovados: ${resultado.modifiedCount}. Trial retroativo: nenhum.`);
}

main()
    .catch((error) => {
        console.error(`Falha na migração de lifecycle: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });