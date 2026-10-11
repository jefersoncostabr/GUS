import mongoose from 'mongoose';
import 'dotenv/config';
import { getTenantConnection } from '../src/config/connectionFactory.js';
import { getUsoRegularModel } from '../src/models/usoRegularModel.js';
import { getAulaModel } from '../src/models/aulaModel.js';

function resolveTenantId() {
    const tenantId = process.env.TENANT_ID || process.env.TENANT || process.env.TENANT_DB_NAME;
    if (!tenantId) {
        throw new Error('Defina TENANT_ID, TENANT ou TENANT_DB_NAME antes de executar este script.');
    }

    return tenantId.startsWith('gus_tenant_') ? tenantId.replace(/^gus_tenant_/, '') : tenantId;
}

async function limparLancamentos() {
    const tenantId = resolveTenantId();
    const tenantConnection = await getTenantConnection(tenantId);
    const Uso = getUsoRegularModel(tenantConnection);
    const Aula = getAulaModel(tenantConnection);

    const usosAntes = await Uso.countDocuments();
    const aulasAntes = await Aula.countDocuments();

    const resultadosUso = await Uso.deleteMany({});
    const resultadosAula = await Aula.deleteMany({});

    console.log(`Tenant: ${tenantId}`);
    console.log(`Usos antes: ${usosAntes} | removidos: ${resultadosUso.deletedCount}`);
    console.log(`Aulas regulares antes: ${aulasAntes} | removidas: ${resultadosAula.deletedCount}`);
    console.log('Limpeza concluída. Usuários, estúdios e professores do tenant foram preservados.');
}

try {
    await limparLancamentos();
    process.exit(0);
} catch (error) {
    console.error('Erro ao limpar lançamentos de salas:', error.message);
    process.exit(1);
}
