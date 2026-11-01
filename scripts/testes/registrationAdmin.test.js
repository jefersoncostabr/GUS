import { jest } from '@jest/globals';
import bcrypt from 'bcrypt';

const getSolicitanteModel = jest.fn();
const getEstudioModel = jest.fn();
const getTenantConnection = jest.fn();
const dropTenantDatabase = jest.fn();
const enviarAvisoNovoTenant = jest.fn();

jest.unstable_mockModule('../../src/models/usuariosmodel.js', () => ({ getSolicitanteModel }));
jest.unstable_mockModule('../../src/models/estudiomodel.js', () => ({ getEstudioModel }));
jest.unstable_mockModule('../../src/config/connectionFactory.js', () => ({
    getTenantConnection,
    dropTenantDatabase,
    connectToMasterDb: jest.fn()
}));
jest.unstable_mockModule('../../src/services/emailService.js', () => ({
    enviarAvisoNovoTenant: enviarAvisoNovoTenant,
    enviarEmailRecuperacao: jest.fn()
}));

const {
    atualizarSolicitante,
    criarSolicitante,
    deletarSolicitante
} = await import('../../src/controllers/solicitanteController.js');
const { default: AdminController } = await import('../../src/controllers/adminController.js');

const tenantName = 'gus_tenant_studio-123abc';
const studioId = '507f1f77bcf86cd799439011';

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
        lean: jest.fn().mockResolvedValue(value)
    };
}

function setupUserModel({ duplicate = null, savedUser = {} } = {}) {
    const userModel = {
        findOne: jest.fn().mockReturnValue(queryResult(duplicate)),
        findOneAndUpdate: jest.fn(),
        findOneAndDelete: jest.fn(),
        deleteOne: jest.fn()
    };
    const createdUsers = [];

    class Solicitante {
        constructor(data) {
            Object.assign(this, data);
            this._id = 'new-user-id';
            createdUsers.push(this);
        }

        async save() {
            Object.assign(this, savedUser);
        }
    }

    Object.assign(Solicitante, userModel);
    getSolicitanteModel.mockReturnValue(Solicitante);
    Solicitante.createdUsers = createdUsers;
    return Solicitante;
}

function setupStudioModel({ existingStudio = null } = {}) {
    const studioModel = {
        findById: jest.fn().mockResolvedValue(existingStudio),
        findOne: jest.fn().mockResolvedValue(existingStudio),
        create: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn()
    };
    getEstudioModel.mockReturnValue(studioModel);
    return studioModel;
}

function setupExistingTenantRegistration({
    existingStudio = {
        _id: studioId,
        nome: 'Studio A',
        tenantDbName: tenantName,
        approvalStatus: 'approved'
    },
    duplicate = null
} = {}) {
    const userModel = setupUserModel({ duplicate });
    const studioModel = setupStudioModel({ existingStudio });
    return { userModel, studioModel };
}

const quietLogs = () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    return () => log.mockRestore();
};

describe('Cadastro de solicitantes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        getTenantConnection.mockReset();
        dropTenantDatabase.mockReset();
    });

    it.each([
        [{ solicitante: 'Ana' }, 400],
        [{ solicitante: 'Ana', senha: '123' }, 400],
        [{ solicitante: 'Ana', senha: '1234', email: 'ana@example.test' }, 400]
    ])('valida campos obrigatórios antes de consultar o banco', async (body, status) => {
        const res = createResponse();

        await criarSolicitante({ body, originalUrl: '/solicitantes' }, res);

        expect(res.statusCode).toBe(status);
        expect(getSolicitanteModel).not.toHaveBeenCalled();
        expect(getEstudioModel).not.toHaveBeenCalled();
    });

    it('rejeita usuário ou e-mail duplicado', async () => {
        setupExistingTenantRegistration({
            duplicate: { solicitante: 'Ana', email: 'ana@example.test' }
        });
        const res = createResponse();
        const restoreLogs = quietLogs();

        try {
            await criarSolicitante({
                body: {
                    solicitante: 'ana',
                    senha: 'senha-segura',
                    email: ' ANA@EXAMPLE.TEST ',
                    estudioName: 'Studio A'
                },
                originalUrl: '/solicitantes'
            }, res);
        } finally {
            restoreLogs();
        }

        expect(res.statusCode).toBe(409);
        expect(res.body.error).toMatch(/e-mail já está cadastrado/);
    });

    it('normaliza dados, ignora role público e cria usuário pendente em tenant aprovado', async () => {
        const { userModel } = setupExistingTenantRegistration();
        const res = createResponse();
        const restoreLogs = quietLogs();

        try {
            await criarSolicitante({
                body: {
                    solicitante: '  ana silva ',
                    senha: 'senha-segura',
                    email: ' ANA@EXAMPLE.TEST ',
                    estudioName: 'studio a',
                    role: 'superadmin',
                    extra: 'campo fora do contrato'
                },
                originalUrl: '/solicitantes'
            }, res);
        } finally {
            restoreLogs();
        }

        const savedUser = userModel.createdUsers[0];
        expect(res.statusCode).toBe(201);
        expect(res.body).toMatchObject({
            solicitante: 'Ana silva',
            email: 'ana@example.test',
            role: 'pendente',
            tenantDbName: tenantName
        });
        expect(savedUser.role).toBe('pendente');
        expect(await bcrypt.compare('senha-segura', savedUser.senha)).toBe(true);
        expect(savedUser.senha).not.toBe('senha-segura');
        expect(savedUser).not.toHaveProperty('estudioName');
    });

    it('bloqueia novos cadastros em tenant reprovado ou com trial expirado', async () => {
        const restoreLogs = quietLogs();
        const resRejected = createResponse();
        setupExistingTenantRegistration({
            existingStudio: {
                _id: studioId,
                nome: 'Studio A',
                tenantDbName: tenantName,
                approvalStatus: 'rejected'
            }
        });

        try {
            await criarSolicitante({
                body: {
                    solicitante: 'Ana',
                    senha: 'senha-segura',
                    email: 'ana@example.test',
                    estudioName: 'Studio A'
                },
                originalUrl: '/solicitantes'
            }, resRejected);
        } finally {
            restoreLogs();
        }

        expect(resRejected.statusCode).toBe(423);
    });

    it('impede administrador do tenant de criar superadmin', async () => {
        setupExistingTenantRegistration();
        const res = createResponse();

        await criarSolicitante({
            body: {
                solicitante: 'Ana',
                senha: 'senha-segura',
                email: 'ana@example.test',
                estudioName: 'Studio A',
                role: 'superadmin'
            },
            originalUrl: '/admin/usuarios',
            session: { user: { role: 'admin', tenantDbName: tenantName } }
        }, res);

        expect(res.statusCode).toBe(403);
    });
});

describe('Atualização e exclusão de usuários', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('permite atualizar somente a própria conta e sincroniza a sessão', async () => {
        const userModel = setupUserModel();
        const updatedUser = {
            _id: 'user-id',
            solicitante: 'Ana Nova',
            email: 'ana@example.test',
            role: 'user',
            tenantDbName: tenantName
        };
        userModel.findOneAndUpdate.mockReturnValue({
            select: jest.fn().mockResolvedValue(updatedUser)
        });
        const sessionUser = {
            _id: 'user-id',
            solicitante: 'Ana',
            role: 'user',
            tenantDbName: tenantName
        };
        const res = createResponse();

        await atualizarSolicitante({
            params: { id: 'user-id' },
            session: { user: sessionUser },
            body: {
                nome: '  ana nova ',
                email: ' ANA@EXAMPLE.TEST ',
                role: 'admin',
                tenantDbName: 'gus_tenant_injected'
            }
        }, res);

        expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
            { _id: 'user-id' },
            { solicitante: 'Ana nova', email: 'ana@example.test' },
            { new: true, runValidators: true }
        );
        expect(sessionUser.solicitante).toBe('Ana Nova');
        expect(sessionUser.tenantDbName).toBe(tenantName);
        expect(res.statusCode).toBe(200);
    });

    it('não permite que usuário comum altere perfil ou outra conta', async () => {
        const userModel = setupUserModel();
        const res = createResponse();

        await atualizarSolicitante({
            params: { id: 'other-user' },
            session: { user: { _id: 'user-id', role: 'user' } },
            body: { role: 'admin', email: 'new@example.test' }
        }, res);

        expect(res.statusCode).toBe(403);
        expect(userModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('não permite atribuir superadmin nem aceitar papel inválido', async () => {
        setupUserModel();
        const superadminResponse = createResponse();
        await atualizarSolicitante({
            params: { id: 'user-id' },
            session: { user: { _id: 'user-id', role: 'admin', tenantDbName: tenantName } },
            body: { role: 'superadmin' }
        }, superadminResponse);

        const invalidRoleResponse = createResponse();
        await atualizarSolicitante({
            params: { id: 'user-id' },
            session: { user: { _id: 'user-id', role: 'admin', tenantDbName: tenantName } },
            body: { role: 'root' }
        }, invalidRoleResponse);

        expect(superadminResponse.statusCode).toBe(403);
        expect(invalidRoleResponse.statusCode).toBe(400);
    });

    it('escopa atualização e exclusão administrativa ao tenant da sessão', async () => {
        const userModel = setupUserModel();
        userModel.findOneAndUpdate.mockReturnValue({
            select: jest.fn().mockResolvedValue({ _id: 'target-user', role: 'user' })
        });
        userModel.findOneAndDelete.mockResolvedValue({ _id: 'target-user' });
        const adminSession = {
            user: { _id: 'admin-id', role: 'admin', tenantDbName: tenantName }
        };
        const updateResponse = createResponse();

        await atualizarSolicitante({
            params: { id: 'target-user' },
            session: adminSession,
            body: { solicitante: 'Aluno' }
        }, updateResponse);

        const deleteResponse = createResponse();
        await deletarSolicitante({
            params: { id: 'target-user' },
            session: adminSession
        }, deleteResponse);

        expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
            { _id: 'target-user', tenantDbName: tenantName },
            { solicitante: 'Aluno' },
            { new: true, runValidators: true }
        );
        expect(userModel.findOneAndDelete).toHaveBeenCalledWith({
            _id: 'target-user',
            tenantDbName: tenantName
        });
        expect(deleteResponse.statusCode).toBe(200);
    });
});

describe('Operações administrativas de salas e aulas', () => {
    it('converte campo estudio e remove id enviado pelo formulário ao criar sala', async () => {
        const Sala = { create: jest.fn().mockResolvedValue({ _id: 'room-id' }) };
        const res = createResponse();

        await AdminController.criarSala({
            tenantModels: { Sala },
            body: { id: null, numero: 2, estudio: studioId }
        }, res);

        expect(Sala.create).toHaveBeenCalledWith({
            numero: 2,
            estudioId: studioId
        });
        expect(res.statusCode).toBe(201);
    });

    it('mapeia duplicidade de sala para conflito', async () => {
        const Sala = { create: jest.fn().mockRejectedValue({ code: 11000 }) };
        const res = createResponse();

        await AdminController.criarSala({
            tenantModels: { Sala },
            body: { numero: 2, estudioId: studioId }
        }, res);

        expect(res.statusCode).toBe(409);
    });

    it('atualiza aula sem aceitar alteração de id', async () => {
        const updatedLesson = { _id: 'lesson-id', modalidade: 'Jazz' };
        const Aula = {
            findByIdAndUpdate: jest.fn().mockResolvedValue(updatedLesson)
        };
        const res = createResponse();

        await AdminController.atualizarAula({
            tenantModels: { Aula },
            params: { id: 'lesson-id' },
            body: { modalidade: 'Jazz', id: 'forged-id', _id: 'forged-id' }
        }, res);

        expect(Aula.findByIdAndUpdate).toHaveBeenCalledWith(
            'lesson-id',
            { modalidade: 'Jazz' },
            { new: true, runValidators: true }
        );
        expect(res.statusCode).toBe(200);
    });

    it('retorna 404 quando aula não existe', async () => {
        const Aula = { findByIdAndUpdate: jest.fn().mockResolvedValue(null) };
        const res = createResponse();

        await AdminController.atualizarAula({
            tenantModels: { Aula },
            params: { id: 'missing' },
            body: { modalidade: 'Jazz' }
        }, res);

        expect(res.statusCode).toBe(404);
    });
});
