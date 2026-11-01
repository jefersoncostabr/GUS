import { jest } from '@jest/globals';

const getEstudioModel = jest.fn();
const getSolicitanteModel = jest.fn();
const excluirBancoTenant = jest.fn();
const invalidarSessoesTenant = jest.fn();

jest.unstable_mockModule('../../src/models/estudiomodel.js', () => ({ getEstudioModel }));
jest.unstable_mockModule('../../src/models/usuariosmodel.js', () => ({ getSolicitanteModel }));
jest.unstable_mockModule('../../src/services/tenantLifecycleService.js', () => ({
    excluirBancoTenant,
    invalidarSessoesTenant
}));

const {
    aprovarTenant,
    excluirTenant,
    listarTenants,
    listarTenantsPendentes,
    reprovarTenant
} = await import('../../src/controllers/platformTenantController.js');

const tenantId = '507f1f77bcf86cd799439011';
const tenantDbName = 'gus_tenant_studio-123abc';

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

function queryResult(value) {
    return {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(value)
    };
}

function setupPlatformModel() {
    const estudioModel = {
        find: jest.fn(),
        findOneAndUpdate: jest.fn(),
        findById: jest.fn(),
        deleteOne: jest.fn(),
        updateOne: jest.fn()
    };
    const solicitanteModel = { deleteMany: jest.fn() };
    getEstudioModel.mockReturnValue(estudioModel);
    getSolicitanteModel.mockReturnValue(solicitanteModel);
    excluirBancoTenant.mockReset().mockResolvedValue(undefined);
    invalidarSessoesTenant.mockReset().mockResolvedValue(0);
    return { estudioModel, solicitanteModel };
}

describe('Listagem e aprovação de tenants', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('lista tenants e normaliza status legado ausente para approved', async () => {
        const { estudioModel } = setupPlatformModel();
        const legacyTenant = { _id: tenantId, nome: 'Estúdio Antigo' };
        estudioModel.find.mockReturnValue(queryResult([legacyTenant]));
        const res = createResponse();

        await listarTenants({}, res);

        expect(estudioModel.find).toHaveBeenCalledWith({
            tenantDbName: { $type: 'string', $ne: '' }
        });
        expect(res.statusCode).toBe(200);
        expect(res.body[0]).toMatchObject({
            _id: tenantId,
            approvalStatus: 'approved'
        });
    });

    it('lista somente tenants pendentes na ordem de criação crescente', async () => {
        const { estudioModel } = setupPlatformModel();
        estudioModel.find.mockReturnValue(queryResult([{ _id: tenantId, approvalStatus: 'pending' }]));
        const res = createResponse();

        await listarTenantsPendentes({}, res);

        expect(estudioModel.find).toHaveBeenCalledWith({
            tenantDbName: { $type: 'string', $ne: '' },
            approvalStatus: 'pending'
        });
        expect(estudioModel.find.mock.results[0].value.sort).toHaveBeenCalledWith({ createdAt: 1 });
        expect(res.statusCode).toBe(200);
    });

    it('aprova tenant válido, registra responsável e limpa dados de reprovação', async () => {
        const { estudioModel } = setupPlatformModel();
        const updated = queryResult({ _id: tenantId, approvalStatus: 'approved' });
        estudioModel.findOneAndUpdate.mockReturnValue(updated);
        const res = createResponse();

        await aprovarTenant({
            params: { id: tenantId },
            session: { user: { _id: 'admin-id' } }
        }, res);

        expect(estudioModel.findOneAndUpdate).toHaveBeenCalledWith(
            { _id: tenantId, approvalStatus: { $nin: ['deleting', 'provisioning'] } },
            expect.objectContaining({
                $set: expect.objectContaining({
                    approvalStatus: 'approved',
                    approvedBy: 'admin-id',
                    approvedAt: expect.any(Date)
                }),
                $unset: { rejectedAt: 1, rejectedBy: 1, rejectionReason: 1 }
            }),
            { new: true, runValidators: true }
        );
        expect(res.statusCode).toBe(200);
        expect(res.body.tenant.approvalStatus).toBe('approved');
    });

    it('valida ID antes de consultar para aprovar ou reprovar', async () => {
        const { estudioModel } = setupPlatformModel();
        const approved = createResponse();
        await aprovarTenant({
            params: { id: 'invalid' },
            session: { user: { _id: 'admin-id' } }
        }, approved);

        const rejected = createResponse();
        await reprovarTenant({
            params: { id: 'invalid' },
            body: { motivo: 'Revisão' },
            session: { user: { _id: 'admin-id' } }
        }, rejected);

        expect(approved.statusCode).toBe(400);
        expect(rejected.statusCode).toBe(400);
        expect(estudioModel.findOneAndUpdate).not.toHaveBeenCalled();
    });
});

describe('Reprovação de tenants', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it.each([
        ['', 400],
        ['   ', 400],
        ['r'.repeat(1001), 400]
    ])('rejeita motivo inválido com status %s', async (motivo, expectedStatus) => {
        setupPlatformModel();
        const res = createResponse();

        await reprovarTenant({
            params: { id: tenantId },
            body: { motivo },
            session: { user: { _id: 'admin-id' } }
        }, res);

        expect(res.statusCode).toBe(expectedStatus);
        expect(getEstudioModel().findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('grava motivo normalizado e operador da reprovação', async () => {
        const { estudioModel } = setupPlatformModel();
        estudioModel.findOneAndUpdate.mockReturnValue(
            queryResult({ _id: tenantId, approvalStatus: 'rejected' })
        );
        const res = createResponse();

        await reprovarTenant({
            params: { id: tenantId },
            body: { motivo: '  Documentação incompleta  ' },
            session: { user: { _id: 'admin-id' } }
        }, res);

        expect(estudioModel.findOneAndUpdate).toHaveBeenCalledWith(
            { _id: tenantId, approvalStatus: { $nin: ['deleting', 'provisioning'] } },
            expect.objectContaining({
                $set: expect.objectContaining({
                    approvalStatus: 'rejected',
                    rejectedBy: 'admin-id',
                    rejectionReason: 'Documentação incompleta',
                    rejectedAt: expect.any(Date)
                }),
                $unset: { approvedAt: 1, approvedBy: 1 }
            }),
            { new: true, runValidators: true }
        );
        expect(res.statusCode).toBe(200);
    });
});

describe('Exclusão segura de tenants', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    function setupDeletion() {
        const { estudioModel, solicitanteModel } = setupPlatformModel();
        const estudio = {
            _id: tenantId,
            tenantDbName,
            approvalStatus: 'approved',
            save: jest.fn().mockResolvedValue(undefined)
        };
        estudioModel.findById.mockImplementation(async () => estudio);
        estudioModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
        estudioModel.updateOne.mockResolvedValue({ matchedCount: 1 });
        solicitanteModel.deleteMany.mockResolvedValue({ deletedCount: 2 });
        return { estudioModel, solicitanteModel, estudio };
    }

    it('exige o nome exato do banco antes de iniciar operação destrutiva', async () => {
        const { estudioModel, solicitanteModel, estudio } = setupDeletion();
        const res = createResponse();

        await excluirTenant({
            params: { id: tenantId },
            body: { confirmTenantDbName: 'gus_tenant_other' },
            session: { user: { _id: 'admin-id' } }
        }, res);

        expect(estudioModel.findById).toHaveBeenCalledWith(tenantId);
        expect(res.statusCode).toBe(400);
        expect(excluirBancoTenant).not.toHaveBeenCalled();
        expect(solicitanteModel.deleteMany).not.toHaveBeenCalled();
        expect(estudioModel.deleteOne).not.toHaveBeenCalled();
    });

    it('apaga banco, invalida sessões e remove usuários e registro Master associados', async () => {
        const { estudioModel, solicitanteModel, estudio } = setupDeletion();
        const res = createResponse();

        await excluirTenant({
            params: { id: tenantId },
            body: { confirmTenantDbName: tenantDbName },
            session: { user: { _id: 'admin-id' } }
        }, res);

        expect(estudio.approvalStatus).toBe('deleting');
        expect(estudio.save).toHaveBeenCalledTimes(1);
        expect(excluirBancoTenant).toHaveBeenCalledWith(tenantDbName);
        expect(invalidarSessoesTenant).toHaveBeenCalledWith(tenantDbName);
        expect(solicitanteModel.deleteMany).toHaveBeenCalledWith({
            $or: [{ tenantDbName }, { estudio: tenantId }]
        });
        expect(estudioModel.deleteOne).toHaveBeenCalledWith({ _id: tenantId });
        expect(res.statusCode).toBe(200);
    });

    it('restaura status anterior se a exclusão do banco falhar', async () => {
        const { estudioModel, estudio } = setupDeletion();
        excluirBancoTenant.mockRejectedValue(new Error('drop failed'));
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const res = createResponse();

        try {
            await excluirTenant({
                params: { id: tenantId },
                body: { confirmTenantDbName: tenantDbName },
                session: { user: { _id: 'admin-id' } }
            }, res);
        } finally {
            errorSpy.mockRestore();
        }

        expect(estudioModel.updateOne).toHaveBeenCalledWith(
            { _id: tenantId, approvalStatus: 'deleting' },
            { $set: { approvalStatus: 'approved' } }
        );
        expect(res.statusCode).toBe(500);
        expect(res.body.error).toMatch(/liberado para uso novamente/);
    });

    it('mantém tenant bloqueado se o banco foi removido mas limpeza Master falhou', async () => {
        const { estudioModel, solicitanteModel } = setupDeletion();
        excluirBancoTenant.mockResolvedValue(undefined);
        solicitanteModel.deleteMany.mockRejectedValue(new Error('master cleanup failed'));
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const res = createResponse();

        try {
            await excluirTenant({
                params: { id: tenantId },
                body: { confirmTenantDbName: tenantDbName },
                session: { user: { _id: 'admin-id' } }
            }, res);
        } finally {
            errorSpy.mockRestore();
        }

        expect(estudioModel.updateOne).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(500);
        expect(res.body.error).toMatch(/permanece bloqueado/);
    });
});
