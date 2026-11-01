import mongoose from 'mongoose';
import 'dotenv/config';
import { getTenantConnection } from '../src/config/connectionFactory.js';
import { getEstudioModel } from '../src/models/estudiomodel.js';
import { getSolicitanteModel } from '../src/models/usuariosmodel.js';
import { getSalaModel } from '../src/models/salaModel.js';
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

export function proximoDia(dataBase, dias) {
    const data = new Date(dataBase);
    data.setDate(data.getDate() + dias);
    const yyyy = data.getFullYear();
    const mm = String(data.getMonth() + 1).padStart(2, '0');
    const dd = String(data.getDate()).padStart(2, '0');
    return `${dd}/${mm}/${String(yyyy).slice(-2)}`;
}

export function createSampleRecords({ estudio, salas, usuarios, now = new Date() }) {
    const valorSalaUso = (sala) => `${estudio._id}|${sala.numero}`;
    return {
        usos: [
            { solicitante: usuarios[0]._id, sala: valorSalaUso(salas[0]), dia: proximoDia(now, 1), hora: '09:00', motivo: 'Particular' },
            { solicitante: usuarios[0]._id, sala: valorSalaUso(salas[1] || salas[0]), dia: proximoDia(now, 2), hora: '14:30', motivo: 'Ensaio' },
            { solicitante: usuarios[0]._id, sala: valorSalaUso(salas[2] || salas[0]), dia: proximoDia(now, 3), hora: '18:00', motivo: 'Reunião' }
        ],
        aulas: [
            { estudio: estudio._id, sala: String(salas[0].numero), diaSemana: 'segunda', horaInicio: '09:00', modalidade: 'Aula Regular', professor: usuarios[0]._id },
            { estudio: estudio._id, sala: String(salas[1]?.numero || salas[0].numero), diaSemana: 'quarta', horaInicio: '16:00', modalidade: 'Aula Regular', professor: usuarios[1]?._id || usuarios[0]._id }
        ]
    };
}

export async function repopularLancamentos({
    environment = process.env,
    mongooseClient = mongoose,
    resolveConnection = getTenantConnection,
    getEstudio = getEstudioModel,
    getSolicitante = getSolicitanteModel,
    getSala = getSalaModel,
    getUsoRegular = getUsoRegularModel,
    getAula = getAulaModel,
    now = () => new Date(),
    logger = console
} = {}) {
    const tenantId = resolveTenantId(environment);
    const masterUri = environment.MONGO_URI_MASTER || environment.MONGO_URI;
    const masterAlreadyConnected = mongooseClient.connection.readyState === 1;
    if (!masterAlreadyConnected && !masterUri) {
        throw new Error('MONGO_URI_MASTER ou MONGO_URI deve estar configurada.');
    }

    let tenantConnection;
    let ownsMasterConnection = false;
    try {
        tenantConnection = await resolveConnection(tenantId);
        let masterConnection = mongooseClient.connection;
        if (!masterAlreadyConnected) {
            await mongooseClient.connect(masterUri);
            ownsMasterConnection = true;
            masterConnection = mongooseClient.connection;
        }

        const Estudio = getEstudio(masterConnection);
        const Solicitante = getSolicitante(masterConnection);
        const tenantDbName = `gus_tenant_${tenantId}`;
        const estudio = await Estudio.findOne({ tenantDbName }).lean();
        if (!estudio) {
            throw new Error(`Nenhum estúdio encontrado para o tenant ${tenantDbName}.`);
        }

        const Sala = getSala(tenantConnection);
        const Uso = getUsoRegular(tenantConnection);
        const Aula = getAula(tenantConnection);
        const salas = await Sala.find({ estudioId: estudio._id }).sort({ numero: 1 }).limit(5).lean();
        const usuarios = await Solicitante.find({}).limit(10).lean();
        if (!salas.length) {
            throw new Error(`Nenhuma sala vinculada ao estúdio ${estudio.nome} foi encontrada no tenant.`);
        }
        if (!usuarios.length) {
            throw new Error('Nenhum usuário encontrado no Master. Cadastre usuários antes de repopular.');
        }

        const { usos, aulas } = createSampleRecords({ estudio, salas, usuarios, now: now() });
        const usosInseridos = await Promise.all(usos.map((item) => Uso.create(item)));
        const aulasInseridas = await Promise.all(aulas.map((item) => Aula.create(item)));

        logger.log(`Tenant: ${tenantId}`);
        logger.log(`Usos criados: ${usosInseridos.length}`);
        logger.log(`Aulas regulares criadas: ${aulasInseridas.length}`);
        logger.log('Repopulação concluída.');

        return { tenantId, usosCriados: usosInseridos.length, aulasCriadas: aulasInseridas.length };
    } finally {
        if (tenantConnection?.readyState === 1) await tenantConnection.close();
        if (ownsMasterConnection) await mongooseClient.disconnect();
    }
}

if (isDirectExecution(import.meta.url)) {
    repopularLancamentos().catch((error) => {
        console.error('Erro ao repopular lançamentos de salas:', error.message);
        process.exitCode = 1;
    });
}
