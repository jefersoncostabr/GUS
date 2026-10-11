import mongoose from 'mongoose';
import 'dotenv/config';
import { getTenantConnection } from '../src/config/connectionFactory.js';
import { getEstudioModel } from '../src/models/estudiomodel.js';
import { getSolicitanteModel } from '../src/models/usuariosmodel.js';
import { getSalaModel } from '../src/models/salaModel.js';
import { getUsoRegularModel } from '../src/models/usoRegularModel.js';
import { getAulaModel } from '../src/models/aulaModel.js';

function resolveTenantId() {
    const tenantId = process.env.TENANT_ID || process.env.TENANT || process.env.TENANT_DB_NAME;
    if (!tenantId) {
        throw new Error('Defina TENANT_ID, TENANT ou TENANT_DB_NAME antes de executar este script.');
    }

    return tenantId.startsWith('gus_tenant_') ? tenantId.replace(/^gus_tenant_/, '') : tenantId;
}

function proximoDia(dataBase, dias) {
    const data = new Date(dataBase);
    data.setDate(data.getDate() + dias);
    const yyyy = data.getFullYear();
    const mm = String(data.getMonth() + 1).padStart(2, '0');
    const dd = String(data.getDate()).padStart(2, '0');
    return `${dd}/${mm}/${String(yyyy).slice(-2)}`;
}

async function repopularLancamentos() {
    const tenantId = resolveTenantId();
    const tenantConnection = await getTenantConnection(tenantId);

    const masterConnection = mongoose.connection.readyState === 1 ? mongoose.connection : await mongoose.connect(process.env.MONGO_URI_MASTER || process.env.MONGO_URI || 'mongodb://localhost:27017/gus');
    const Estudio = getEstudioModel(masterConnection);
    const Solicitante = getSolicitanteModel(masterConnection);

    const tenantDbName = `gus_tenant_${tenantId}`;
    const estudio = await Estudio.findOne({ tenantDbName }).lean();
    if (!estudio) {
        throw new Error(`Nenhum estúdio encontrado para o tenant ${tenantDbName}.`);
    }

    const Sala = getSalaModel(tenantConnection);
    const Uso = getUsoRegularModel(tenantConnection);
    const Aula = getAulaModel(tenantConnection);

    const salas = await Sala.find({ estudioId: estudio._id }).sort({ numero: 1 }).limit(5).lean();
    const usuarios = await Solicitante.find({}).limit(10).lean();
    if (!salas.length) {
        throw new Error(`Nenhuma sala vinculada ao estúdio ${estudio.nome} foi encontrada no tenant.`);
    }
    if (!usuarios.length) {
        throw new Error('Nenhum usuário encontrado no Master. Cadastre usuários antes de repopular.');
    }

    const hoje = new Date();
    const valorSalaUso = (sala) => `${estudio._id}|${sala.numero}`;
    const dadosUso = [
        { sala: valorSalaUso(salas[0]), dia: proximoDia(hoje, 1), hora: '09:00', motivo: 'Particular' },
        { sala: valorSalaUso(salas[1] || salas[0]), dia: proximoDia(hoje, 2), hora: '14:30', motivo: 'Ensaio' },
        { sala: valorSalaUso(salas[2] || salas[0]), dia: proximoDia(hoje, 3), hora: '18:00', motivo: 'Reunião' }
    ];

    const dadosAula = [
        { sala: String(salas[0].numero), diaSemana: 'segunda', horaInicio: '09:00', modalidade: 'Aula Regular', professor: usuarios[0]._id },
        { sala: String(salas[1]?.numero || salas[0].numero), diaSemana: 'quarta', horaInicio: '16:00', modalidade: 'Aula Regular', professor: usuarios[1]?._id || usuarios[0]._id }
    ];

    const usosInseridos = await Promise.all(
        dadosUso.map((item) => Uso.create({
            solicitante: usuarios[0]._id,
            sala: item.sala,
            dia: item.dia,
            hora: item.hora,
            motivo: item.motivo,
        }))
    );

    const aulasInseridas = await Promise.all(
        dadosAula.map((item) => Aula.create({
            estudio: estudio._id,
            sala: item.sala,
            diaSemana: item.diaSemana,
            horaInicio: item.horaInicio,
            modalidade: item.modalidade,
            professor: item.professor,
        }))
    );

    console.log(`Tenant: ${tenantId}`);
    console.log(`Usos criados: ${usosInseridos.length}`);
    console.log(`Aulas regulares criadas: ${aulasInseridas.length}`);
    console.log('Repopulação concluída.');
}

try {
    await repopularLancamentos();
    process.exit(0);
} catch (error) {
    console.error('Erro ao repopular lançamentos de salas:', error.message);
    process.exit(1);
}
