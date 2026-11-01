import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jest } from '@jest/globals';
import { runBackup } from '../../scripts/backup_db.js';
import { migrateTenantLifecycle } from '../../scripts/migrate_tenant_lifecycle.js';
import { limparBanco } from '../../scripts/limpar_dados_inconsistentes.js';
import { limparLancamentos } from '../../scripts/limpar_lancamentos_salas.js';
import {
    createSampleRecords,
    repopularLancamentos,
    resolveTenantId
} from '../../scripts/repopular_lancamentos_salas.js';
import { isDirectExecution } from '../../scripts/isDirectExecution.js';

const quietLogger = { log: jest.fn(), error: jest.fn() };

describe('Backup operacional', () => {
    it('recusa executar sem URI antes de criar diretórios ou iniciar mongodump', async () => {
        const mkdirSync = jest.fn();
        const execute = jest.fn();

        await expect(runBackup({
            uri: '',
            fileSystem: { existsSync: jest.fn(() => false), mkdirSync },
            execute,
            logger: quietLogger
        })).rejects.toThrow('MONGO_URI_MASTER');

        expect(mkdirSync).not.toHaveBeenCalled();
        expect(execute).not.toHaveBeenCalled();
    });

    it('cria diretório e chama mongodump com argumentos separados e destino determinístico', async () => {
        const execute = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
        const fileSystem = {
            existsSync: jest.fn(() => false),
            mkdirSync: jest.fn()
        };
        const backupPath = await runBackup({
            uri: 'mongodb://localhost:27017/gus_master?authSource=admin',
            backupDir: 'D:\\temp\\gus-backups',
            fileSystem,
            execute,
            now: new Date('2026-11-01T10:20:30.000Z'),
            logger: quietLogger
        });

        expect(fileSystem.mkdirSync).toHaveBeenCalledWith(
            'D:\\temp\\gus-backups',
            { recursive: true }
        );
        expect(execute).toHaveBeenCalledWith('mongodump', [
            '--uri',
            'mongodb://localhost:27017/gus_master?authSource=admin',
            '--out',
            path.join('D:\\temp\\gus-backups', 'gus_backup_2026-11-01T10-20-30-000Z')
        ]);
        expect(backupPath).toBe(execute.mock.calls[0][1][3]);
    });

    it('propaga falha do mongodump para que o comando retorne erro', async () => {
        await expect(runBackup({
            uri: 'mongodb://localhost/gus_master',
            fileSystem: { existsSync: jest.fn(() => true), mkdirSync: jest.fn() },
            execute: jest.fn().mockRejectedValue(new Error('mongodump failed')),
            logger: quietLogger
        })).rejects.toThrow('mongodump failed');
    });
});

describe('Migração de lifecycle', () => {
    it('aprova apenas tenants sem status e sempre encerra a conexão após sucesso', async () => {
        const connection = { name: 'master' };
        const connect = jest.fn().mockResolvedValue(undefined);
        const disconnect = jest.fn().mockResolvedValue(undefined);
        const updateMany = jest.fn().mockResolvedValue({ modifiedCount: 2 });
        const getModel = jest.fn(() => ({ updateMany }));

        const result = await migrateTenantLifecycle({
            uri: 'mongodb://test/gus_master',
            connect,
            disconnect,
            getModel,
            connection,
            logger: quietLogger
        });

        expect(connect).toHaveBeenCalledWith('mongodb://test/gus_master');
        expect(getModel).toHaveBeenCalledWith(connection);
        expect(updateMany).toHaveBeenCalledWith(
            { $or: [{ approvalStatus: { $exists: false } }, { approvalStatus: null }] },
            { $set: { approvalStatus: 'approved' } }
        );
        expect(result.modifiedCount).toBe(2);
        expect(disconnect).toHaveBeenCalledTimes(1);
    });

    it('não conecta sem URI e fecha a conexão se a consulta falhar', async () => {
        const connect = jest.fn();
        const disconnect = jest.fn().mockResolvedValue(undefined);

        await expect(migrateTenantLifecycle({ uri: '', connect, disconnect }))
            .rejects.toThrow('MONGO_URI_MASTER');
        expect(connect).not.toHaveBeenCalled();

        await expect(migrateTenantLifecycle({
            uri: 'mongodb://test/gus_master',
            connect: jest.fn().mockResolvedValue(undefined),
            disconnect,
            getModel: () => ({ updateMany: jest.fn().mockRejectedValue(new Error('write failed')) }),
            logger: quietLogger
        })).rejects.toThrow('write failed');
        expect(disconnect).toHaveBeenCalledTimes(1);
    });
});

describe('Limpeza de dados inconsistentes', () => {
    it('remove usos legados e órfãos identificados, preservando registros válidos', async () => {
        const connection = { name: 'test-db' };
        const legacyDeleteMany = jest.fn().mockResolvedValue({ deletedCount: 1 });
        const orphanDeleteMany = jest.fn().mockResolvedValue({ deletedCount: 1 });
        const Solicitante = {
            find: jest.fn().mockResolvedValue([{ _id: 'teacher-1' }])
        };
        const Uso = {
            find: jest.fn().mockResolvedValue([
                { _id: 'valid-usage', solicitante: 'teacher-1' },
                { _id: 'orphan-usage', solicitante: 'missing-teacher' },
                { _id: 'no-owner', solicitante: null }
            ]),
            deleteMany: orphanDeleteMany
        };
        const connect = jest.fn().mockResolvedValue(undefined);
        const disconnect = jest.fn().mockResolvedValue(undefined);

        const result = await limparBanco({
            uri: 'mongodb://test/gus',
            connect,
            disconnect,
            connection,
            getCollection: jest.fn(() => ({ deleteMany: legacyDeleteMany })),
            getSolicitante: jest.fn(() => Solicitante),
            getUso: jest.fn(() => Uso),
            logger: quietLogger
        });

        expect(connect).toHaveBeenCalledWith('mongodb://test/gus');
        expect(legacyDeleteMany).toHaveBeenCalledWith({ solicitante: { $type: 'string' } });
        expect(Solicitante.find).toHaveBeenCalledWith({}, '_id');
        expect(Uso.find).toHaveBeenCalledWith({});
        expect(orphanDeleteMany).toHaveBeenCalledWith({ _id: { $in: ['orphan-usage'] } });
        expect(result).toEqual({ legacyDeletedCount: 1, orphanDeletedCount: 1 });
        expect(disconnect).toHaveBeenCalledTimes(1);
    });

    it('não usa URI local implícita e encerra conexão após falha operacional', async () => {
        const connect = jest.fn();
        await expect(limparBanco({ uri: '', connect }))
            .rejects.toThrow('limpeza cancelada');
        expect(connect).not.toHaveBeenCalled();

        const disconnect = jest.fn().mockResolvedValue(undefined);
        await expect(limparBanco({
            uri: 'mongodb://test/gus',
            connect: jest.fn().mockResolvedValue(undefined),
            disconnect,
            getCollection: () => ({ deleteMany: jest.fn().mockRejectedValue(new Error('delete failed')) }),
            logger: quietLogger
        })).rejects.toThrow('delete failed');
        expect(disconnect).toHaveBeenCalledTimes(1);
    });
});

describe('Limpeza de lançamentos do tenant', () => {
    it('exige tenant e usa exclusivamente os modelos da conexão desse tenant', async () => {
        const tenantConnection = {
            name: 'tenant-a',
            readyState: 1,
            close: jest.fn().mockResolvedValue(undefined)
        };
        const resolveConnection = jest.fn().mockResolvedValue(tenantConnection);
        const Uso = {
            countDocuments: jest.fn().mockResolvedValue(4),
            deleteMany: jest.fn().mockResolvedValue({ deletedCount: 4 })
        };
        const Aula = {
            countDocuments: jest.fn().mockResolvedValue(2),
            deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 })
        };
        const getUsoRegular = jest.fn(() => Uso);
        const getAula = jest.fn(() => Aula);

        await expect(limparLancamentos({
            environment: {},
            resolveConnection,
            getUsoRegular,
            getAula,
            logger: quietLogger
        })).rejects.toThrow('TENANT_ID');
        expect(resolveConnection).not.toHaveBeenCalled();

        const result = await limparLancamentos({
            environment: { TENANT_DB_NAME: 'gus_tenant_studio_a' },
            resolveConnection,
            getUsoRegular,
            getAula,
            logger: quietLogger
        });

        expect(resolveConnection).toHaveBeenCalledWith('studio_a');
        expect(getUsoRegular).toHaveBeenCalledWith(tenantConnection);
        expect(getAula).toHaveBeenCalledWith(tenantConnection);
        expect(Uso.deleteMany).toHaveBeenCalledWith({});
        expect(Aula.deleteMany).toHaveBeenCalledWith({});
        expect(result).toEqual({
            tenantId: 'studio_a',
            usosAntes: 4,
            aulasAntes: 2,
            usosRemovidos: 4,
            aulasRemovidas: 2
        });
        expect(tenantConnection.close).toHaveBeenCalledTimes(1);
    });
});

describe('Repopulação de lançamentos do tenant', () => {
    it('normaliza o identificador e gera datas/valores determinísticos', () => {
        expect(resolveTenantId({ TENANT_ID: 'gus_tenant_studio_a' })).toBe('studio_a');
        expect(() => resolveTenantId({})).toThrow('TENANT_ID');

        const sample = createSampleRecords({
            estudio: { _id: 'studio-id' },
            salas: [{ numero: 7 }],
            usuarios: [{ _id: 'teacher-id' }],
            now: new Date(2026, 9, 30)
        });

        expect(sample.usos).toHaveLength(3);
        expect(sample.usos[0]).toMatchObject({
            solicitante: 'teacher-id',
            sala: 'studio-id|7',
            dia: '31/10/26'
        });
        expect(sample.usos[2].dia).toBe('02/11/26');
        expect(sample.aulas).toHaveLength(2);
        expect(sample.aulas[1].professor).toBe('teacher-id');
    });

    it('não conecta a tenant nenhum sem URI Master configurada', async () => {
        const resolveConnection = jest.fn();
        await expect(repopularLancamentos({
            environment: { TENANT_ID: 'tenant-a' },
            mongooseClient: { connection: { readyState: 0 } },
            resolveConnection
        })).rejects.toThrow('MONGO_URI_MASTER');
        expect(resolveConnection).not.toHaveBeenCalled();
    });

    it('cria fixtures somente nos modelos do tenant informado', async () => {
        const tenantConnection = {
            name: 'tenant-a',
            readyState: 1,
            close: jest.fn().mockResolvedValue(undefined)
        };
        const masterConnection = { name: 'master' };
        const estudio = { _id: 'studio-id', nome: 'Studio A' };
        const salas = [{ numero: 7 }, { numero: 8 }];
        const usuarios = [{ _id: 'teacher-a' }, { _id: 'teacher-b' }];
        const Uso = { create: jest.fn(async (record) => record) };
        const Aula = { create: jest.fn(async (record) => record) };
        const mongooseClient = { connection: { readyState: 1 } };
        const findSala = {
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(salas)
        };
        const findUsuarios = {
            limit: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(usuarios)
        };

        const result = await repopularLancamentos({
            environment: { TENANT: 'gus_tenant_tenant_a' },
            mongooseClient,
            resolveConnection: jest.fn().mockResolvedValue(tenantConnection),
            getEstudio: () => ({
                findOne: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(estudio) }))
            }),
            getSolicitante: () => ({ find: jest.fn(() => findUsuarios) }),
            getSala: () => ({ find: jest.fn(() => findSala) }),
            getUsoRegular: (connection) => {
                expect(connection).toBe(tenantConnection);
                return Uso;
            },
            getAula: (connection) => {
                expect(connection).toBe(tenantConnection);
                return Aula;
            },
            now: () => new Date(2026, 9, 30),
            logger: quietLogger
        });

        expect(Uso.create).toHaveBeenCalledTimes(3);
        expect(Aula.create).toHaveBeenCalledTimes(2);
        expect(Uso.create.mock.calls[0][0]).toMatchObject({
            sala: 'studio-id|7',
            solicitante: 'teacher-a'
        });
        expect(Aula.create.mock.calls[1][0].professor).toBe('teacher-b');
        expect(result).toEqual({ tenantId: 'tenant_a', usosCriados: 3, aulasCriadas: 2 });
        expect(tenantConnection.close).toHaveBeenCalledTimes(1);
    });
});

describe('Execução explícita dos scripts', () => {
    it('identifica execução direta sem disparar a rotina ao importar o módulo', () => {
        expect(isDirectExecution(import.meta.url, ['node', fileURLToPath(import.meta.url)])).toBe(true);
        expect(isDirectExecution(import.meta.url, ['node', 'D:\\project\\scripts\\other.js'])).toBe(false);
    });
});
