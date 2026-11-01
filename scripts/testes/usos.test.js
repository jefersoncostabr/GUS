import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { getUsoModel } from '../../src/models/utilizacaomodel.js';

const getSolicitanteModel = jest.fn();
jest.unstable_mockModule('../../src/models/usuariosmodel.js', () => ({
    getSolicitanteModel
}));

const {
    atualizarUso,
    criarUso,
    deletarUso,
    listarUsos
} = await import('../../src/controllers/usoController.js');

function createResponse() {
    return {
        statusCode: undefined,
        body: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
}

function createUsageModel({
    records = [],
    count = records.length,
    saveError,
    updateResult,
    deleteError
} = {}) {
    const savedDocuments = [];
    class Usage {
        constructor(document) {
            Object.assign(this, document);
        }

        async save() {
            if (saveError) throw saveError;
            savedDocuments.push(this);
            return this;
        }
    }

    Usage.savedDocuments = savedDocuments;
    Usage.countDocuments = jest.fn().mockResolvedValue(count);
    Usage.find = jest.fn();
    Usage.findById = jest.fn();
    Usage.findByIdAndUpdate = jest.fn().mockResolvedValue(updateResult);
    Usage.findByIdAndDelete = jest.fn().mockImplementation(async () => {
        if (deleteError) throw deleteError;
        return { deletedCount: 1 };
    });

    return Usage;
}

function createListQuery(data) {
    const query = {
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(data)
    };
    return query;
}

const quietConsole = () => jest.spyOn(console, 'log').mockImplementation(() => {});

describe('Criação de agendamentos', () => {
    it('declara índice único por sala, dia e horário no schema', () => {
        const isolatedMongoose = new mongoose.Mongoose();
        const connection = isolatedMongoose.createConnection();

        try {
            const Uso = getUsoModel(connection);
            expect(Uso.schema.indexes()).toContainEqual([
                { sala: 1, dia: 1, hora: 1 },
                expect.objectContaining({ unique: true })
            ]);
        } finally {
            connection.destroy();
        }
    });

    it('cria uso com solicitante da sessão e normaliza a data', async () => {
        const Usage = createUsageModel();
        const req = {
            tenantModels: { Utilizacao: Usage },
            session: { user: { _id: 'user-id' } },
            body: {
                sala: 'Sala 1',
                dia: '2026-05-07',
                hora: '09:00',
                motivo: 'Aula'
            }
        };
        const res = createResponse();
        const logSpy = quietConsole();

        try {
            await criarUso(req, res);
        } finally {
            logSpy.mockRestore();
        }

        expect(res.statusCode).toBe(201);
        expect(res.body).toMatchObject({
            solicitante: 'user-id',
            sala: 'Sala 1',
            dia: '07/05/26',
            hora: '09:00',
            motivo: 'Aula'
        });
        expect(Usage.savedDocuments).toHaveLength(1);
    });

    it('rejeita campos obrigatórios ausentes sem salvar', async () => {
        const Usage = createUsageModel();
        const res = createResponse();

        await criarUso({
            tenantModels: { Utilizacao: Usage },
            session: { user: { _id: 'user-id' } },
            body: { sala: 'Sala 1', dia: '2026-05-07', hora: '09:00' }
        }, res);

        expect(res.statusCode).toBe(400);
        expect(Usage.savedDocuments).toHaveLength(0);
    });

    it('retorna conflito quando o índice de unicidade rejeita duplicidade', async () => {
        const Usage = createUsageModel({ saveError: { code: 11000 } });
        const res = createResponse();
        const logSpy = quietConsole();

        try {
            await criarUso({
                tenantModels: { Utilizacao: Usage },
                session: { user: { _id: 'user-id' } },
                body: {
                    sala: 'Sala 1',
                    dia: '07/05/26',
                    hora: '09:00',
                    motivo: 'Aula'
                }
            }, res);
        } finally {
            logSpy.mockRestore();
        }

        expect(res.statusCode).toBe(409);
        expect(res.body.message).toMatch(/Já existe um agendamento/);
    });
});

describe('Paginação e filtros de agendamentos', () => {
    beforeEach(() => {
        getSolicitanteModel.mockReset();
    });

    it('aplica valores padrão, ordenação e formato da resposta', async () => {
        const data = [{ _id: 'uso-1' }];
        const query = createListQuery(data);
        const Usage = createUsageModel({ count: 6 });
        Usage.find.mockReturnValue(query);
        getSolicitanteModel.mockReturnValue({});
        const res = createResponse();

        await listarUsos({
            tenantModels: { Utilizacao: Usage },
            query: {}
        }, res);

        expect(Usage.countDocuments).toHaveBeenCalledWith({});
        expect(Usage.find).toHaveBeenCalledWith({});
        expect(query.sort).toHaveBeenCalledWith({ _id: -1 });
        expect(query.skip).toHaveBeenCalledWith(0);
        expect(query.limit).toHaveBeenCalledWith(5);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            data,
            page: 1,
            limit: 5,
            totalItems: 6,
            totalPages: 2
        });
    });

    it('aplica filtros e paginação solicitados', async () => {
        const query = createListQuery([]);
        const Usage = createUsageModel({ count: 30 });
        Usage.find.mockReturnValue(query);
        const solicitante = { _id: 'user-1' };
        getSolicitanteModel.mockReturnValue({
            find: jest.fn().mockResolvedValue([solicitante])
        });
        const res = createResponse();

        await listarUsos({
            tenantModels: { Utilizacao: Usage },
            query: {
                solicitante: 'ana',
                sala: 'Sala 1',
                estudio: 'Ignorado quando sala informada',
                dia: '07/05/26',
                hora: '09:00',
                motivo: 'Aula',
                page: '2',
                limit: '10'
            }
        }, res);

        const expectedFilter = {
            solicitante: { $in: ['user-1'] },
            sala: 'Sala 1',
            dia: '07/05/26',
            hora: '09:00',
            motivo: 'Aula'
        };
        expect(Usage.countDocuments).toHaveBeenCalledWith(expectedFilter);
        expect(Usage.find).toHaveBeenCalledWith(expectedFilter);
        expect(query.skip).toHaveBeenCalledWith(10);
        expect(query.limit).toHaveBeenCalledWith(10);
        expect(res.body).toMatchObject({ page: 2, limit: 10, totalItems: 30, totalPages: 3 });
    });

    it('escapa o nome de estúdio usado para filtrar salas', async () => {
        const query = createListQuery([]);
        const Usage = createUsageModel({ count: 0 });
        Usage.find.mockReturnValue(query);
        getSolicitanteModel.mockReturnValue({});
        const res = createResponse();

        await listarUsos({
            tenantModels: { Utilizacao: Usage },
            query: { estudio: 'A+B' }
        }, res);

        const filter = Usage.countDocuments.mock.calls[0][0];
        expect(filter.sala).toEqual({ $regex: /^A\+B[|:]/ });
    });

    it('limita o tamanho da página, corrige página fora do intervalo e limita negativos', async () => {
        const query = createListQuery([]);
        const Usage = createUsageModel({ count: 101 });
        Usage.find.mockReturnValue(query);
        getSolicitanteModel.mockReturnValue({});

        const tooLarge = createResponse();
        await listarUsos({
            tenantModels: { Utilizacao: Usage },
            query: { page: '999', limit: '500' }
        }, tooLarge);
        expect(query.skip).toHaveBeenLastCalledWith(100);
        expect(query.limit).toHaveBeenLastCalledWith(100);
        expect(tooLarge.body).toMatchObject({ page: 2, limit: 100, totalPages: 2 });

        const negativeValues = createResponse();
        await listarUsos({
            tenantModels: { Utilizacao: Usage },
            query: { page: '-2', limit: '-5' }
        }, negativeValues);
        expect(query.skip).toHaveBeenLastCalledWith(0);
        expect(query.limit).toHaveBeenLastCalledWith(1);
        expect(negativeValues.body).toMatchObject({ page: 1, limit: 1 });
    });

    it('retorna pelo menos uma página quando não existem agendamentos', async () => {
        const query = createListQuery([]);
        const Usage = createUsageModel({ count: 0 });
        Usage.find.mockReturnValue(query);
        getSolicitanteModel.mockReturnValue({});
        const res = createResponse();

        await listarUsos({
            tenantModels: { Utilizacao: Usage },
            query: { page: '10' }
        }, res);

        expect(res.body).toEqual({
            data: [],
            page: 1,
            limit: 5,
            totalItems: 0,
            totalPages: 1
        });
    });
});

describe('Permissões sobre agendamentos', () => {
    const bodyEdicao = {
        sala: 'Sala 2',
        dia: '2026-06-08',
        hora: '10:00',
        motivo: 'Ensaio',
        solicitante: 'outro-usuario'
    };

    it('permite atualizar o próprio uso sem permitir alterar o proprietário', async () => {
        const usoExistente = { solicitante: 'user-id' };
        const usoAtualizado = { _id: 'uso-id', solicitante: 'user-id', sala: 'Sala 2' };
        const Usage = createUsageModel({ updateResult: usoAtualizado });
        Usage.findById.mockResolvedValue(usoExistente);
        const res = createResponse();
        const logSpy = quietConsole();

        try {
            await atualizarUso({
                tenantModels: { Utilizacao: Usage },
                session: { user: { _id: 'user-id', role: 'user' } },
                params: { id: 'uso-id' },
                body: bodyEdicao
            }, res);
        } finally {
            logSpy.mockRestore();
        }

        expect(Usage.findByIdAndUpdate).toHaveBeenCalledWith(
            'uso-id',
            { sala: 'Sala 2', dia: '08/06/26', hora: '10:00', motivo: 'Ensaio' },
            { new: true, runValidators: true }
        );
        expect(res.statusCode).toBe(200);
    });

    it('nega atualizar ou excluir o uso de outro usuário', async () => {
        const Usage = createUsageModel();
        Usage.findById.mockResolvedValue({ solicitante: 'owner-id' });
        const updateResponse = createResponse();

        await atualizarUso({
            tenantModels: { Utilizacao: Usage },
            session: { user: { _id: 'other-id', role: 'user' } },
            params: { id: 'uso-id' },
            body: bodyEdicao
        }, updateResponse);

        const deleteResponse = createResponse();
        await deletarUso({
            tenantModels: { Utilizacao: Usage },
            session: { user: { _id: 'other-id', role: 'user' } },
            params: { id: 'uso-id' }
        }, deleteResponse);

        expect(updateResponse.statusCode).toBe(403);
        expect(deleteResponse.statusCode).toBe(403);
        expect(Usage.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(Usage.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('permite ao administrador gerenciar uso de outro usuário no tenant', async () => {
        const Usage = createUsageModel({ updateResult: { _id: 'uso-id' } });
        Usage.findById.mockResolvedValue({ solicitante: 'owner-id' });
        const res = createResponse();
        const logSpy = quietConsole();

        try {
            await atualizarUso({
                tenantModels: { Utilizacao: Usage },
                session: { user: { _id: 'admin-id', role: 'admin' } },
                params: { id: 'uso-id' },
                body: bodyEdicao
            }, res);
        } finally {
            logSpy.mockRestore();
        }

        expect(res.statusCode).toBe(200);
        expect(Usage.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    });

    it('permite ao proprietário excluir seu próprio agendamento', async () => {
        const Usage = createUsageModel();
        Usage.findById.mockResolvedValue({ solicitante: 'user-id' });
        const res = createResponse();

        await deletarUso({
            tenantModels: { Utilizacao: Usage },
            session: { user: { _id: 'user-id', role: 'user' } },
            params: { id: 'uso-id' }
        }, res);

        expect(Usage.findByIdAndDelete).toHaveBeenCalledWith('uso-id');
        expect(res.statusCode).toBe(200);
    });

    it('retorna 404 para uso inexistente e 401 para sessão ausente', async () => {
        const Usage = createUsageModel();
        Usage.findById.mockResolvedValue(null);
        const missing = createResponse();
        await deletarUso({
            tenantModels: { Utilizacao: Usage },
            session: { user: { _id: 'user-id', role: 'user' } },
            params: { id: 'missing' }
        }, missing);
        expect(missing.statusCode).toBe(404);

        const unauthenticated = createResponse();
        await deletarUso({
            tenantModels: { Utilizacao: Usage },
            session: {},
            params: { id: 'uso-id' }
        }, unauthenticated);
        expect(unauthenticated.statusCode).toBe(401);
    });
});
