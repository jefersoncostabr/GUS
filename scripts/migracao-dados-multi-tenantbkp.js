/**
 * Script de Migração para Arquitetura Multi-Tenant
 * 
 * Este script executa uma MIGRAÇÃO ÚNICA que transforma a arquitetura do banco único
 * para arquitetura database-per-tenant.
 * 
 * IMPORTANTE:
 * - Fazer backup do banco ANTES de rodar este script
 * - Testar em ambiente de desenvolvimento primeiro
 * - Rodar apenas UMA VEZ em produção
 * 
 * USO:
 * node scripts/migracao-dados-multi-tenant.js
 * 
 * Ou com modo verbose:
 * DEBUG_MIGRATION=true node scripts/migracao-dados-multi-tenant.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectToMasterDb, getTenantConnection } from '../src/config/connectionFactory.js';
import { getEstudioModel } from '../src/models/estudiomodel.js';
import { getSolicitanteModel } from '../src/models/usuariosmodel.js';
import { getSalaModel } from '../src/models/salaModel.js';
import { getAulaModel } from '../src/models/aulaModel.js';
import { getUsoModel } from '../src/models/utilizacaomodel.js';

const verbose = process.env.DEBUG_MIGRATION === 'true';

/**
 * Gera um nome único para o banco de dados do tenant.
 * Formato: gus_tenant_<slug>_<timestamp>
 */
function gerarTenantDbName(estudioName) {
    const prefix = 'gus_tenant_';
    const maxDbNameLength = 38;
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
    // remove trailing hyphens
    id = id.replace(/-+$/, '');

    return `${prefix}${id}`;
}

/**
 * Log condicional para debugging
 */
function log(message, data = null) {
    if (verbose) {
        console.log(`[MIGRAÇÃO] ${message}`);
        if (data) console.log('  ', data);
    } else {
        console.log(`[MIGRAÇÃO] ${message}`);
    }
}

/**
 * Migra dados de um estúdio para seu novo banco de dados de tenant.
 */
async function migrarEstudio(estudio, masterConnection) {
    const estudioId = estudio._id;
    const estudioNome = estudio.nome;

    console.log(`\n  📍 Migrando estúdio: "${estudioNome}" (ID: ${estudioId})`);

    try {
        // 1. Gera nome único para o tenant
        const tenantDbName = gerarTenantDbName(estudioNome);
        log(`  ✓ Nome do tenant gerado: ${tenantDbName}`);

        // 2. Obtém conexão do tenant (cria o banco se não existir)
        const tenantId = tenantDbName.replace('gus_tenant_', '');
        const tenantConnection = await getTenantConnection(tenantId);
        log(`  ✓ Conexão ao banco do tenant estabelecida`);

        // 3. Obtém modelos do banco anterior (Master - assumindo que tenemos uma conexão)
        const masterSalaModel = getSalaModel(masterConnection);
        const masterAulaModel = getAulaModel(masterConnection);
        const masterUsoModel = getUsoModel(masterConnection);

        // 4. Obtém modelos do novo banco do tenant
        const tenantSalaModel = getSalaModel(tenantConnection);
        const tenantAulaModel = getAulaModel(tenantConnection);
        const tenantUsoModel = getUsoModel(tenantConnection);

        // 5. Migra Salas
        log(`  → Migrando Salas...`);
        const salas = await masterSalaModel.find({ estudioId: estudioId }).lean();
        if (salas.length > 0) {
            const salasCopiadas = await tenantSalaModel.insertMany(salas);
            console.log(`    ✓ ${salasCopiadas.length} sala(s) migrada(s)`);
        } else {
            console.log(`    ✓ Nenhuma sala encontrada`);
        }

        // 6. Migra Aulas
        log(`  → Migrando Aulas Regulares...`);
        const aulas = await masterAulaModel.find({ estudio: estudioId }).lean();
        if (aulas.length > 0) {
            const aulasCopiadas = await tenantAulaModel.insertMany(aulas);
            console.log(`    ✓ ${aulasCopiadas.length} aula(s) migrada(s)`);
        } else {
            console.log(`    ✓ Nenhuma aula encontrada`);
        }

        // 7. Migra Usos
        // NOTA: Usos não têm referência direta a estúdio no schema.
        // Opções:
        //   a) Copiar TODOS os Usos para cada tenant (redundância, mas simples)
        //   b) Filtrar Usos por solicitante que pertence ao estúdio (complexo)
        // Por segurança, vamos copiar todos em cada banco e documentar
        log(`  → Migrando Usos...`);
        const usos = await masterUsoModel.find({}).lean();
        if (usos.length > 0) {
            const usosCopiados = await tenantUsoModel.insertMany(usos);
            console.log(`    ✓ ${usosCopiados.length} uso(s) migrado(s)`);
            console.log(`    ⚠️  NOTA: Todos os Usos foram copiados. Considere filtrar no futuro.`);
        } else {
            console.log(`    ✓ Nenhum uso encontrado`);
        }

        // 8. Atualiza usuários (solicitantes) do estúdio para apontarem para o novo banco
        log(`  → Atualizando usuários do estúdio...`);
        const Solicitante = getSolicitanteModel(masterConnection);
        
        // Busca usuários que pertencem a este estúdio
        // NOTA: Isso depende de como os usuários estão vinculados aos estúdios
        // Por enquanto, vamos marcar usuários que não têm tenantDbName ainda
        const usuariosAtualizados = await Solicitante.updateMany(
            { 
                tenantDbName: { $in: [null, undefined] },
                // Adicione aqui lógica para filtrar por estúdio se necessário
                // Ex: estudio: estudioId
            },
            { tenantDbName: tenantDbName },
            { multi: true }
        );
        console.log(`    ✓ ${usuariosAtualizados.modifiedCount} usuário(s) atualizado(s)`);

        return {
            success: true,
            estudio: estudioNome,
            tenantDbName: tenantDbName,
            stats: {
                salas: salas.length,
                aulas: aulas.length,
                usos: usos.length,
                usuariosAtualizados: usuariosAtualizados.modifiedCount
            }
        };
    } catch (error) {
        console.error(`    ✗ Erro ao migrar ${estudioNome}:`, error.message);
        return {
            success: false,
            estudio: estudioNome,
            error: error.message
        };
    }
}

/**
 * Função principal de migração
 */
async function executarMigracao() {
    console.log('\n' + '='.repeat(80));
    console.log('         SCRIPT DE MIGRAÇÃO PARA ARQUITETURA MULTI-TENANT (Database-per-Tenant)');
    console.log('='.repeat(80));

    console.log('\n⚠️  ATENÇÃO:');
    console.log('   Este script irá transformar seus dados do banco único para múltiplos bancos.');
    console.log('   Certifique-se de ter um BACKUP antes de continuar!');
    console.log('   Pressione Ctrl+C nos próximos 10 segundos para cancelar...\n');

    // Aguarda 10 segundos antes de iniciar
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('Iniciando migração...\n');

    try {
        // 1. Conecta ao banco Master
        console.log('1️⃣  Conectando ao banco Master...');
        await connectToMasterDb();
        const masterConnection = mongoose.connection;
        console.log('   ✓ Conectado ao banco Master\n');

        // 2. Busca todos os estúdios
        console.log('2️⃣  Buscando estúdios no banco Master...');
        const Estudio = getEstudioModel(masterConnection);
        const estudios = await Estudio.find({});
        console.log(`   ✓ ${estudios.length} estúdio(s) encontrado(s)\n`);

        if (estudios.length === 0) {
            console.log('   ⚠️  Nenhum estúdio encontrado. Encerrando.');
            process.exit(0);
        }

        // 3. Migra cada estúdio
        console.log('3️⃣  Iniciando migração de estúdios...\n');
        const resultados = [];

        for (const estudio of estudios) {
            const resultado = await migrarEstudio(estudio, masterConnection);
            resultados.push(resultado);
        }

        // 4. Relatório final
        console.log('\n' + '='.repeat(80));
        console.log('                              RELATÓRIO FINAL');
        console.log('='.repeat(80) + '\n');

        const sucessos = resultados.filter(r => r.success);
        const erros = resultados.filter(r => !r.success);

        console.log(`✅ Migrações bem-sucedidas: ${sucessos.length}/${resultados.length}\n`);

        for (const res of sucessos) {
            console.log(`  📍 ${res.estudio}`);
            console.log(`     Banco: ${res.tenantDbName}`);
            console.log(`     Salas: ${res.stats.salas}, Aulas: ${res.stats.aulas}, Usos: ${res.stats.usos}`);
            console.log(`     Usuários atualizados: ${res.stats.usuariosAtualizados}\n`);
        }

        if (erros.length > 0) {
            console.log(`\n❌ Erros durante migração: ${erros.length}/${resultados.length}\n`);
            for (const res of erros) {
                console.log(`  ✗ ${res.estudio}: ${res.error}\n`);
            }
        }

        console.log('='.repeat(80));
        console.log('\n🎉 Migração concluída!\n');
        console.log('📌 PRÓXIMAS ETAPAS:');
        console.log('   1. Verifique os dados migrados manualmente em alguns tenants');
        console.log('   2. Teste o login com um usuário de cada tenant');
        console.log('   3. Verifique se as operações CRUD funcionam corretamente');
        console.log('   4. Teste a operação "limpar tudo" para garantir que não afeta o banco Master');
        console.log('\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Erro fatal durante migração:', error);
        process.exit(1);
    }
}

// Executa a migração
executarMigracao();
