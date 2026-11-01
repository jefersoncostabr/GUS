import mongoose from 'mongoose';
import { getSolicitanteModel } from '../src/models/usuariosmodel.js';
import { getUsoModel } from '../src/models/utilizacaomodel.js';
import { isDirectExecution } from './isDirectExecution.js';

import 'dotenv/config';

export async function limparBanco({
    uri = process.env.MONGO_URI,
    connect = mongoose.connect.bind(mongoose),
    disconnect = mongoose.disconnect.bind(mongoose),
    getCollection = (connection, name) => connection.collection(name),
    getSolicitante = getSolicitanteModel,
    getUso = getUsoModel,
    connection = mongoose.connection,
    logger = console
} = {}) {
    if (!uri) throw new Error('MONGO_URI não está configurada; limpeza cancelada.');

    await connect(uri);
    try {
        logger.log('Conectado ao MongoDB para limpeza...');

        const Solicitante = getSolicitante(connection);
        const Uso = getUso(connection);
        const collectionUsos = getCollection(connection, 'usosdesala');

        const resultadoStrings = await collectionUsos.deleteMany({
            solicitante: { $type: 'string' }
        });

        if (resultadoStrings.deletedCount > 0) {
            logger.log(`Removidos ${resultadoStrings.deletedCount} agendamentos com formato antigo (String).`);
        } else {
            logger.log('Nenhum agendamento com formato de String encontrado.');
        }

        const usuariosValidos = await Solicitante.find({}, '_id');
        const listaIdsValidos = new Set(usuariosValidos.map((usuario) => usuario._id.toString()));
        const todosAgendamentos = await Uso.find({});
        const idsParaRemover = todosAgendamentos
            .filter((uso) => uso.solicitante && !listaIdsValidos.has(uso.solicitante.toString()))
            .map((uso) => uso._id);

        if (idsParaRemover.length > 0) {
            await Uso.deleteMany({ _id: { $in: idsParaRemover } });
            logger.log(`Removidos ${idsParaRemover.length} agendamentos órfãos (usuário não existe mais).`);
        } else {
            logger.log('Nenhum agendamento órfão encontrado.');
        }

        logger.log('Limpeza concluída!');
        return { legacyDeletedCount: resultadoStrings.deletedCount, orphanDeletedCount: idsParaRemover.length };
    } finally {
        await disconnect();
    }
}

if (isDirectExecution(import.meta.url)) {
    limparBanco().catch((error) => {
        console.error('Erro na limpeza:', error);
        process.exitCode = 1;
    });
}