import { jest } from '@jest/globals';

const getSolicitanteModel = jest.fn();
const getEstudioModel = jest.fn();

jest.unstable_mockModule('../../src/models/usuariosmodel.js', () => ({ getSolicitanteModel }));
jest.unstable_mockModule('../../src/models/estudiomodel.js', () => ({ getEstudioModel }));

const {
    getAgendamentosMes,
    getAgendamentosSemana,
    getAulasRegulares,
    getTodosProfessores,
    getUsosPorProfessor
} = await import('../../src/controllers/relatoriosController.js');

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

function createPopulateQuery(data) {
    const query = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(data),
        then: (resolve, reject) => Promise.resolve(data).then(resolve, reject)
    };
    return query;
}

describe('Relatórios de agendamentos', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('consulta a semana de domingo a sábado incluindo mudança de ano', async () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-01-01T12:00:00'));
        const data = [{ _id: 'uso-1' }];
        const query = createPopulateQuery(data);
        const Uso = { find: jest.fn(() => query) };
        const Solicitante = { modelName: 'Solicitante' };
        getSolicitanteModel.mockReturnValue(Solicitante);
        const res = createResponse();

        await getAgendamentosSemana({ tenantModels: { Utilizacao: Uso } }, res);

        expect(Uso.find).toHaveBeenCalledWith({
            dia: { $in: ['28/12', '29/12', '30/12', '31/12', '01/01', '02/01', '03/01'] }
        });
        expect(query.populate).toHaveBeenCalledWith({
            path: 'solicitante',
            model: Solicitante,
            select: 'solicitante email'
        });
        expect(res.statusCode).toBe(200);
        expect(res.body).toBe(data);
    });

    it('consulta todos os dias de fevereiro em ano bissexto', async () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2028-02-10T12:00:00'));
        const query = createPopulateQuery([]);
        const Uso = { find: jest.fn(() => query) };
        getSolicitanteModel.mockReturnValue({});
        const res = createResponse();

        await getAgendamentosMes({ tenantModels: { Utilizacao: Uso } }, res);

        const dias = Uso.find.mock.calls[0][0].dia.$in;
        expect(dias).toHaveLength(29);
        expect(dias[0]).toBe('01/02');
        expect(dias[28]).toBe('29/02');
        expect(res.statusCode).toBe(200);
    });

    it('filtra relatório de professor pelo ID informado', async () => {
        const data = [{ _id: 'uso-1' }];
        const query = createPopulateQuery(data);
        const Uso = { find: jest.fn(() => query) };
        const Solicitante = {};
        getSolicitanteModel.mockReturnValue(Solicitante);
        const res = createResponse();

        await getUsosPorProfessor({
            params: { id: 'professor-id' },
            tenantModels: { Utilizacao: Uso }
        }, res);

        expect(Uso.find).toHaveBeenCalledWith({ solicitante: 'professor-id' });
        expect(query.populate).toHaveBeenCalledWith(expect.objectContaining({
            path: 'solicitante',
            model: Solicitante
        }));
        expect(res.body).toBe(data);
    });

    it('escopa lista de professores ao tenant do administrador e exclui senhas', async () => {
        const data = [{ _id: 'teacher-1', solicitante: 'Ana' }];
        const Solicitante = { find: jest.fn().mockResolvedValue(data) };
        getSolicitanteModel.mockReturnValue(Solicitante);
        const res = createResponse();

        await getTodosProfessores({
            session: { user: { role: 'admin', tenantDbName: 'gus_tenant_a' } }
        }, res);

        expect(Solicitante.find).toHaveBeenCalledWith(
            { tenantDbName: 'gus_tenant_a' },
            '-senha'
        );
        expect(res.statusCode).toBe(200);
        expect(res.body).toBe(data);
    });

    it('formata relatório de aulas com número da sala e valida dependências', async () => {
        const lesson = {
            _id: 'lesson-1',
            sala: 'room-id',
            estudio: { nome: 'Studio A' },
            professor: { solicitante: 'Ana' }
        };
        const lessonQuery = {
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([lesson])
        };
        const Aula = { find: jest.fn(() => lessonQuery) };
        const Sala = {
            find: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([{ _id: 'room-id', numero: 4 }])
            })
        };
        getSolicitanteModel.mockReturnValue({});
        getEstudioModel.mockReturnValue({});
        const res = createResponse();

        await getAulasRegulares({ tenantModels: { Aula, Sala } }, res);

        expect(Aula.find).toHaveBeenCalledWith({});
        expect(Sala.find).toHaveBeenCalledWith({}, 'numero');
        expect(lessonQuery.populate).toHaveBeenCalledTimes(2);
        expect(res.body[0]).toMatchObject({
            _id: 'lesson-1',
            sala: 4,
            estudio: { nome: 'Studio A' },
            professor: { solicitante: 'Ana' }
        });

        const missingModels = createResponse();
        await getAulasRegulares({ tenantModels: { Aula } }, missingModels);
        expect(missingModels.statusCode).toBe(500);
        expect(Sala.find).toHaveBeenCalledTimes(1);
    });
});
