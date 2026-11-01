import { jest } from '@jest/globals';
import { createTenantMiddleware } from '../../middleware/tenantMiddleware.js';

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

function createHarness({ registry, resolveTenantConnection } = {}) {
    const masterConnection = { name: 'master' };
    const tenantRegistryQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(registry)
    };
    const getEstudioModel = jest.fn(() => ({
        findOne: jest.fn(() => tenantRegistryQuery)
    }));
    const modelFactory = (name) => jest.fn((connection) => ({
        name,
        connection
    }));
    const dependencies = {
        masterConnection,
        getEstudioModel,
        getTenantConnection: resolveTenantConnection || jest.fn(async (tenantId) => ({ name: tenantId })),
        getSolicitanteModel: jest.fn(),
        getUsoRegularModel: modelFactory('Utilizacao'),
        getSalaModel: modelFactory('Sala'),
        getAulaModel: modelFactory('Aula'),
        getMotivosModel: modelFactory('Motivos')
    };
    const middleware = createTenantMiddleware(dependencies);

    return {
        middleware,
        dependencies,
        tenantRegistryQuery
    };
}

async function runMiddleware(middleware, user) {
    const req = { session: user ? { user } : {} };
    const res = createResponse();
    const next = jest.fn();

    await middleware(req, res, next);
    return { req, res, next };
}

describe('Isolamento de tenant', () => {
    it('usa o tenant da sessão e injeta modelos da conexão correspondente', async () => {
        const registryByDb = {
            gus_tenant_studio_a: {
                _id: 'studio-a-id',
                approvalStatus: 'approved'
            },
            gus_tenant_studio_b: {
                _id: 'studio-b-id',
                approvalStatus: 'pending',
                trialEndsAt: new Date('2030-01-01T00:00:00.000Z')
            }
        };
        const connections = {
            studio_a: { name: 'studio_a' },
            studio_b: { name: 'studio_b' }
        };
        const getTenantConnection = jest.fn(async (tenantId) => connections[tenantId]);
        const masterConnection = { name: 'master' };
        const modelsCreated = [];
        const modelFactory = (name) => jest.fn((connection) => {
            const model = { name, connection };
            modelsCreated.push(model);
            return model;
        });
        const queries = [];
        const getEstudioModel = jest.fn(() => ({
            findOne(query) {
                queries.push(query);
                return {
                    select() {
                        return this;
                    },
                    lean: async () => registryByDb[query.tenantDbName]
                };
            }
        }));
        const middleware = createTenantMiddleware({
            masterConnection,
            getTenantConnection,
            getEstudioModel,
            getSolicitanteModel: jest.fn(),
            getUsoRegularModel: modelFactory('Utilizacao'),
            getSalaModel: modelFactory('Sala'),
            getAulaModel: modelFactory('Aula'),
            getMotivosModel: modelFactory('Motivos')
        });

        const tenantA = await runMiddleware(middleware, {
            _id: 'user-a',
            solicitante: 'Ana',
            tenantDbName: 'gus_tenant_studio_a'
        });
        const tenantB = await runMiddleware(middleware, {
            _id: 'user-b',
            solicitante: 'Bia',
            tenantDbName: 'gus_tenant_studio_b'
        });

        expect(getTenantConnection).toHaveBeenNthCalledWith(1, 'studio_a');
        expect(getTenantConnection).toHaveBeenNthCalledWith(2, 'studio_b');
        expect(queries).toEqual([
            { tenantDbName: 'gus_tenant_studio_a' },
            { tenantDbName: 'gus_tenant_studio_b' }
        ]);
        expect(tenantA.req.tenantConnection).toBe(connections.studio_a);
        expect(tenantB.req.tenantConnection).toBe(connections.studio_b);
        expect(tenantA.req.tenantModels.Sala.connection).toBe(connections.studio_a);
        expect(tenantB.req.tenantModels.Sala.connection).toBe(connections.studio_b);
        expect(tenantA.req.tenantModels.Sala).not.toBe(tenantB.req.tenantModels.Sala);
        expect(tenantA.req.tenantLifecycle.approvalStatus).toBe('approved');
        expect(tenantB.req.tenantLifecycle.trialEndsAt).toEqual(registryByDb.gus_tenant_studio_b.trialEndsAt);
        expect(tenantA.next).toHaveBeenCalledTimes(1);
        expect(tenantB.next).toHaveBeenCalledTimes(1);
        expect(modelsCreated).toHaveLength(8);
    });

    it('não conecta a um tenant quando a sessão não tem usuário associado', async () => {
        const { middleware, dependencies } = createHarness({});

        const { next, res } = await runMiddleware(middleware, null);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.statusCode).toBeUndefined();
        expect(dependencies.getTenantConnection).not.toHaveBeenCalled();
        expect(dependencies.getEstudioModel).not.toHaveBeenCalled();
    });

    it('não consulta nem conecta tenant quando o usuário não tem tenant associado', async () => {
        const { middleware, dependencies } = createHarness({});
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        let result;
        try {
            result = await runMiddleware(middleware, {
                _id: 'admin-id',
                solicitante: 'Admin',
                role: 'admin'
            });
        } finally {
            warnSpy.mockRestore();
        }

        expect(result.next).toHaveBeenCalledTimes(1);
        expect(result.res.statusCode).toBeUndefined();
        expect(dependencies.getTenantConnection).not.toHaveBeenCalled();
        expect(dependencies.getEstudioModel).not.toHaveBeenCalled();
    });

    it('não conecta a um tenant quando o registro Master não existe', async () => {
        const { middleware, dependencies } = createHarness({ registry: null });
        const { req, res, next } = await runMiddleware(middleware, {
            solicitante: 'Ana',
            tenantDbName: 'gus_tenant_missing'
        });

        expect(res.statusCode).toBe(403);
        expect(res.body.error).toMatch(/não está mais disponível/);
        expect(next).not.toHaveBeenCalled();
        expect(dependencies.getTenantConnection).not.toHaveBeenCalled();
    });

    it.each(['deleting', 'provisioning'])(
        'bloqueia tenant em estado %s antes de abrir o banco',
        async (approvalStatus) => {
            const { middleware, dependencies } = createHarness({
                registry: { _id: 'studio-id', approvalStatus }
            });
            const { res, next } = await runMiddleware(middleware, {
                solicitante: 'Ana',
                tenantDbName: 'gus_tenant_studio'
            });

            expect(res.statusCode).toBe(423);
            expect(next).not.toHaveBeenCalled();
            expect(dependencies.getTenantConnection).not.toHaveBeenCalled();
        }
    );

    it('retorna erro explícito se a conexão do tenant falhar', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { middleware } = createHarness({
            registry: { _id: 'studio-id', approvalStatus: 'approved' },
            resolveTenantConnection: jest.fn().mockRejectedValue(new Error('connection failed'))
        });

        let result;
        try {
            result = await runMiddleware(middleware, {
                solicitante: 'Ana',
                tenantDbName: 'gus_tenant_studio'
            });
        } finally {
            errorSpy.mockRestore();
        }

        expect(result.res.statusCode).toBe(500);
        expect(result.res.body.details).toBe('connection failed');
        expect(result.next).not.toHaveBeenCalled();
    });
});
