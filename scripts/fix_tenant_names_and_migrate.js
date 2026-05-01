import 'dotenv/config';
import mongoose from 'mongoose';
import { getTenantConnection } from '../src/config/connectionFactory.js';
import { getEstudioModel } from '../src/models/estudiomodel.js';
import { getSolicitanteModel } from '../src/models/usuariosmodel.js';
import { getSalaModel } from '../src/models/salaModel.js';
import { getAulaModel } from '../src/models/aulaModel.js';
import { getUsoModel } from '../src/models/utilizacaomodel.js';

/**
 * Script: fix_tenant_names_and_migrate.js
 * - Detecta `Estudio` com `tenantDbName` > 38 bytes
 * - Gera um novo `tenantDbName` curto
 * - Tenta copiar coleções do DB antigo para o novo (quando possível)
 * - Atualiza registros `Estudio` e `Solicitante` no Master
 *
 * USO:
 *  # Dry run (não altera nada):
 *  node scripts/fix_tenant_names_and_migrate.js --dry-run
 *
 *  # Executa a migração (faça backup antes):
 *  node scripts/fix_tenant_names_and_migrate.js
 *
 * Requisitos de env vars (no .env):
 *  - MONGO_URI_MASTER (uri completa do master, ex: mongodb+srv://user:pwd@cluster/myMasterDB)
 *  - MONGO_URI_BASE   (uri base sem nome do DB, ex: mongodb+srv://user:pwd@cluster)
 */

const DRY_RUN = process.argv.includes('--dry-run');
const prefix = 'gus_tenant_';
const MAX_DBNAME_BYTES = 38;

function gerarTenantDbName(estudioName) {
    const maxDbNameLength = MAX_DBNAME_BYTES;
    const maxIdLength = maxDbNameLength - prefix.length;

    let slug = estudioName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '');

    const unique = Date.now().toString(36);
    let id = `${slug}-${unique}`;
    if (id.length > maxIdLength) {
        id = id.slice(0, maxIdLength - 1 - unique.length) + '-' + unique;
    }
    id = id.replace(/-+$/, '');
    return `${prefix}${id}`;
}

async function connectMaster() {
    const uri = process.env.MONGO_URI_MASTER;
    if (!uri) throw new Error('MONGO_URI_MASTER não definido');
    console.log('[MASTER] Conectando ao Master DB...');
    await mongoose.connect(uri);
    console.log('[MASTER] Conectado.');
}

async function createRawConnection(dbName) {
    // Usa MONGO_URI_BASE para conectar diretamente ao DB (sem validação do factory)
    const base = process.env.MONGO_URI_BASE;
    if (!base) throw new Error('MONGO_URI_BASE não definido');
    const uri = base.replace(/\/$/, '') + '/' + dbName;
    const conn = mongoose.createConnection(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await conn.asPromise();
    return conn;
}

async function migrate() {
    await connectMaster();
    const masterConn = mongoose.connection;
    const EstudioModel = getEstudioModel(masterConn);
    const SolicitanteModel = getSolicitanteModel(masterConn);

    // busca estúdios que tenham campo tenantDbName (pode não existir se o esquema antigo não guardava)
    const estudios = await EstudioModel.find({ tenantDbName: { $exists: true, $ne: null } }).lean();
    const problematicEstudios = estudios.filter(e => e.tenantDbName && e.tenantDbName.length > MAX_DBNAME_BYTES);

    // além dos estúdios, procure usuários individuais que tenham nomes antigos inválidos
    const solicitantes = await SolicitanteModel.find({ tenantDbName: { $exists: true, $ne: null } }).lean();
    const problematicUsers = solicitantes.filter(u => u.tenantDbName && u.tenantDbName.length > MAX_DBNAME_BYTES);

    if (problematicEstudios.length === 0 && problematicUsers.length === 0) {
        console.log('Nenhum estúdio ou usuário com tenantDbName maior que', MAX_DBNAME_BYTES);
        process.exit(0);
    }

    console.log(`Encontrados ${problematicEstudios.length} estúdio(s) problemático(s) e ${problematicUsers.length} usuário(s) problemático(s)`);

    // iremos lidar primeiro com estúdios para gerar um novoName base, depois com usuários
    for (const estudio of problematicEstudios) {
        const oldName = estudio.tenantDbName;
        console.log('\n---\nEstúdio:', estudio.nome);
        console.log('tenantDbName atual:', oldName, `(len=${oldName.length})`);

        let newName = gerarTenantDbName(estudio.nome);

        // Garante unicidade no Master
        let exists = await EstudioModel.findOne({ tenantDbName: newName });
        if (exists) {
            // adiciona sufixo curto aleatório
            const suffix = Math.random().toString(36).slice(2,6);
            newName = newName.slice(0, MAX_DBNAME_BYTES - 1 - suffix.length) + '-' + suffix;
        }

        console.log('Novo tenantDbName proposto:', newName, `(len=${newName.length})`);

        // Tenta conectar ao banco antigo (pode falhar se Atlas recusar)
        let oldConn = null;
        let copiedCollections = [];
        try {
            console.log('[OLD] Tentando conectar ao DB antigo:', oldName);
            oldConn = await createRawConnection(oldName);
            console.log('[OLD] Conexão estabelecida. Iniciando cópia de coleções.');

            // Modelos no tenant (usar os builders com a connection antiga)
            const OldSala = getSalaModel(oldConn);
            const OldAula = getAulaModel(oldConn);
            const OldUso = getUsoModel(oldConn);

            // Cria nova conexão via factory (usa validação e cache)
            const tenantId = newName.replace(prefix, '');
            console.log('[NEW] Criando/obtendo conexão para:', newName);
            const newConn = await getTenantConnection(tenantId);

            const NewSala = getSalaModel(newConn);
            const NewAula = getAulaModel(newConn);
            const NewUso = getUsoModel(newConn);

            if (!DRY_RUN) {
                const salas = await OldSala.find({}).lean();
                if (salas.length) {
                    await NewSala.insertMany(salas);
                    copiedCollections.push('salas');
                    console.log(`  ✓ Copiadas ${salas.length} salas`);
                }

                const aulas = await OldAula.find({}).lean();
                if (aulas.length) {
                    await NewAula.insertMany(aulas);
                    copiedCollections.push('aulas');
                    console.log(`  ✓ Copiadas ${aulas.length} aulas`);
                }

                const usos = await OldUso.find({}).lean();
                if (usos.length) {
                    await NewUso.insertMany(usos);
                    copiedCollections.push('usos');
                    console.log(`  ✓ Copiados ${usos.length} usos`);
                }
            } else {
                console.log('  (dry-run) Pulando cópia de coleções');
            }

            // fecha conexões de tenant (a factory mantém cache para newConn)
            await oldConn.close();
            console.log('[OLD] Conexão antiga fechada.');
        } catch (err) {
            console.error('[OLD] Não foi possível conectar ou copiar do DB antigo:', err.message);
            if (oldConn) {
                try { await oldConn.close(); } catch(e){}
            }
        }

        // Atualiza registros no Master
        if (!DRY_RUN) {
            console.log('[MASTER] Atualizando registros com novo tenantDbName...');
            await EstudioModel.updateOne({ _id: estudio._id }, { $set: { tenantDbName: newName } });
            await SolicitanteModel.updateMany({ tenantDbName: oldName }, { $set: { tenantDbName: newName } });
            console.log('  ✓ Registros atualizados no Master');
        } else {
            console.log('(dry-run) Pulando atualização no Master');
        }

        console.log(`Resultado: novoName=${newName} | copiado: ${copiedCollections.join(', ') || 'nenhum'}`);
    }

    // agora tratar usuários isolados (se existir algum tenantDbName que não está anexado a Estudio)
    for (const user of problematicUsers) {
        // se o usuário já foi tratado acima porque pertence a um dos estúdios problemáticos, pule
        const matched = problematicEstudios.find(e => e.tenantDbName === user.tenantDbName);
        if (matched) continue;

        console.log('\n---\nUsuário isolado:', user.solicitante);
        const oldName = user.tenantDbName;
        console.log('tenantDbName atual (usuário):', oldName, `(len=${oldName.length})`);

        const estudioName = user.estudio || user.estudioName || 'desconhecido';
        let newName = gerarTenantDbName(estudioName);
        let exists = await EstudioModel.findOne({ tenantDbName: newName });
        if (exists) {
            const suffix = Math.random().toString(36).slice(2,6);
            newName = newName.slice(0, MAX_DBNAME_BYTES - 1 - suffix.length) + '-' + suffix;
        }

        console.log('Novo tenantDbName proposto (usuário):', newName, `(len=${newName.length})`);

        // não vamos copiar coleções (não temos um studio associado necessariamente)
        if (!DRY_RUN) {
            console.log('[MASTER] Atualizando usuário somente...');
            await SolicitanteModel.updateOne({ _id: user._id }, { $set: { tenantDbName: newName } });
            console.log('  ✓ Usuário atualizado no Master');
        } else {
            console.log('(dry-run) Pulando atualização de usuário');
        }

        console.log(`Resultado usuário: novoName=${newName}`);
    }

    console.log('\nProcesso concluído (modo ' + (DRY_RUN ? 'dry-run' : 'exec') + ').');
    process.exit(0);
}

migrate().catch(err => {
    console.error('Erro fatal no script:', err);
    process.exit(1);
});
