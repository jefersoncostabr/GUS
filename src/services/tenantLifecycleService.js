import mongoose from 'mongoose';
import { dropTenantDatabase } from '../config/connectionFactory.js';

export async function excluirBancoTenant(tenantDbName) {
    await dropTenantDatabase(tenantDbName);
}

export async function invalidarSessoesTenant(tenantDbName) {
    const sessoes = mongoose.connection.collection('sessions_gus');
    const documentos = await sessoes.find({}, { projection: { session: 1 } }).toArray();
    const idsParaRemover = [];

    for (const documento of documentos) {
        try {
            const sessao = typeof documento.session === 'string'
                ? JSON.parse(documento.session)
                : documento.session;
            if (sessao?.user?.tenantDbName === tenantDbName) idsParaRemover.push(documento._id);
        } catch (error) {
            console.warn(`Sessão ${documento._id} não pôde ser interpretada durante a exclusão do tenant.`);
        }
    }

    if (!idsParaRemover.length) return 0;
    const resultado = await sessoes.deleteMany({ _id: { $in: idsParaRemover } });
    return resultado.deletedCount || 0;
}