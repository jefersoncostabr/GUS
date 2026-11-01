import { jest } from '@jest/globals';

const getSolicitanteModel = jest.fn();
const getEstudioModel = jest.fn();

jest.unstable_mockModule('../../src/models/usuariosmodel.js', () => ({ getSolicitanteModel }));
jest.unstable_mockModule('../../src/models/estudiomodel.js', () => ({ getEstudioModel }));

const { default: MaintenanceController } = await import(
    '../../src/controllers/maintenanceController.js'
);

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

describe('Manutenção restrita ao tenant', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('limpa somente coleções do tenant e não consulta modelos Master', async () => {
        const Aula = { deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }) };
        const Sala = { deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }) };
        const Utilizacao = { deleteMany: jest.fn().mockResolvedValue({ deletedCount: 3 }) };
        const Motivos = { deleteMany: jest.fn().mockResolvedValue({ deletedCount: 4 }) };
        const res = createResponse();

        await MaintenanceController.limparTudo({
            tenantId: 'tenant-a',
            tenantModels: { Aula, Sala, Utilizacao, Motivos }
        }, res);

        for (const model of [Aula, Sala, Utilizacao, Motivos]) {
            expect(model.deleteMany).toHaveBeenCalledWith({});
        }
        expect(getSolicitanteModel).not.toHaveBeenCalled();
        expect(getEstudioModel).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('tenant tenant-a');
        expect(res.body.message).toContain('exceto usuários do Master');
    });

    it('não começa limpeza total se algum modelo tenant está ausente', async () => {
        const Aula = { deleteMany: jest.fn() };
        const res = createResponse();

        await MaintenanceController.limparTudo({
            tenantId: 'tenant-a',
            tenantModels: { Aula }
        }, res);

        expect(res.statusCode).toBe(500);
        expect(Aula.deleteMany).not.toHaveBeenCalled();
    });

    it('retorna erro explícito ao falhar uma limpeza', async () => {
        const failure = new Error('tenant database unavailable');
        const Utilizacao = { deleteMany: jest.fn().mockRejectedValue(failure) };
        const res = createResponse();

        await MaintenanceController.limparUsos({
            tenantModels: { Utilizacao }
        }, res);

        expect(res.statusCode).toBe(500);
        expect(res.body.error).toBe(failure.message);
    });

    it('limpa somente a coleção correspondente nas rotas individuais', async () => {
        const Aula = { deleteMany: jest.fn().mockResolvedValue({}) };
        const Sala = { deleteMany: jest.fn().mockResolvedValue({}) };
        const Utilizacao = { deleteMany: jest.fn().mockResolvedValue({}) };
        const Motivos = { deleteMany: jest.fn().mockResolvedValue({}) };

        const cases = [
            [MaintenanceController.limparAulas, { Aula }, Aula],
            [MaintenanceController.limparSalas, { Sala }, Sala],
            [MaintenanceController.limparUsos, { Utilizacao }, Utilizacao],
            [MaintenanceController.limparMotivos, { Motivos }, Motivos]
        ];

        for (const [handler, tenantModels, expectedModel] of cases) {
            const res = createResponse();
            await handler({ tenantModels }, res);
            expect(res.statusCode).toBe(200);
            expect(expectedModel.deleteMany).toHaveBeenCalledWith({});
        }
    });
});
