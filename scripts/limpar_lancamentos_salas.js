import mongoose from 'mongoose';
import 'dotenv/config';
import { getTenantConnection } from '../src/config/connectionFactory.js';
import { getUsoRegularModel } from '../src/models/usoRegularModel.js';
import { getAulaModel } from '../src/models/aulaModel.js';
import { isDirectExecution } from './isDirectExecution.js';

export function resolveTenantId(environment = process.env) {
    const tenantId = environment.TENANT_ID || environment.TENANT || environment.TENANT_DB_NAME;
    if (!tenantId) {
        throw new Error('Defina TENANT_ID, TENANT ou TENANT_DB_NAME antes de executar este script.');
    }

    return tenantId.startsWith('gus_tenant_') ? tenantId.replace(/^gus_tenant_/, '') : tenantId;
}

export async function limparLancamentos({
    environment = process.env,
    resolveConnection = getTenantConnection,
    getUsoRegular = getUsoRegularModel,
    getAula = getAulaModel,
    logger = console
} = {}) {
    const tenantId = resolveTenantId(environment);
    const tenantConnection = await resolveConnection(tenantId);
    try {
        const Uso = getUsoRegular(tenantConnection);
        const Aula = getAula(tenantConnection);

        const usosAntes = await Uso.countDocuments();
        const aulasAntes = await Aula.countDocuments();

        const resultadosUso = await Uso.deleteMany({});
        const resultadosAula = await Aula.deleteMany({});

        logger.log(`Tenant: ${tenantId}`);
        logger.log(`Usos antes: ${usosAntes} | removidos: ${resultadosUso.deletedCount}`);
        logger.log(`Aulas regulares antes: ${aulasAntes} | removidos: ${resultadosAula.deletedCount}`);
        logger.log('Limpeza concluída. Usuários, estúdios e professores do tenant foram preservados.');

        return {
            tenantId,
            usosAntes,
            aulasAntes,
            usosRemovidos: resultadosUso.deletedCount,
            aulasRemovidas: resultadosAula.deletedCount
        };
    } finally {
        if (tenantConnection.readyState === 1) await tenantConnection.close();
    }
}

if (isDirectExecution(import.meta.url)) {
    limparLancamentos().catch((error) => {
        console.error('Erro ao limpar lançamentos de salas:', error.message);
        process.exitCode = 1;
    });
}
