import { jest } from '@jest/globals';
import bcrypt from 'bcrypt';
import {
    authMiddleware,
    requireSuperAdmin,
    verificaPendente,
    verificaPermissaoSolicitante,
    verificaRole
} from '../../middleware/authMiddleware.js';
import sessionMiddleware from '../../middleware/sessionMiddleware.js';

jest.unstable_mockModule('../../src/services/emailService.js', () => ({
    enviarEmailRecuperacao: jest.fn()
}));

const { createLoginHandler, logout, verificarSessao } = await import(
    '../../src/controllers/authController.js'
);

function createResponse() {
    return {
        statusCode: undefined,
        body: undefined,
        redirectPath: undefined,
        clearedCookie: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
        redirect(path) {
            this.redirectPath = path;
            return this;
        },
        clearCookie(name) {
            this.clearedCookie = name;
            return this;
        }
    };
}

describe('Login e sessão', () => {
    const senha = 'senha-de-teste';
    let senhaHash;

    beforeAll(async () => {
        senhaHash = await bcrypt.hash(senha, 4);
    });

    it('autentica por e-mail ignorando espaços e maiúsculas e não expõe o hash', async () => {
        const usuario = {
            _id: 'user-id',
            solicitante: 'Ana',
            email: 'ana@example.test',
            senha: senhaHash,
            role: 'user',
            tenantDbName: 'gus_tenant_ana',
            passwordResetToken: 'token-privado'
        };
        const findUser = jest.fn().mockResolvedValue(usuario);
        const handler = createLoginHandler({ findUser });
        const req = {
            body: { email: ' ANA@EXAMPLE.TEST ', password: senha },
            session: {}
        };
        const res = createResponse();

        await handler(req, res);

        expect(findUser).toHaveBeenCalledWith({ email: 'ana@example.test' });
        expect(res.statusCode).toBe(200);
        expect(req.session.user).toEqual({
            _id: 'user-id',
            solicitante: 'Ana',
            email: 'ana@example.test',
            role: 'user',
            tenantDbName: 'gus_tenant_ana'
        });
        expect(res.body.usuario).toEqual(req.session.user);
        expect(JSON.stringify(res.body)).not.toContain(senhaHash);
        expect(JSON.stringify(res.body)).not.toContain('token-privado');
    });

    it('permite busca por nome sem diferenciar maiúsculas e minúsculas', async () => {
        const findUser = jest.fn().mockResolvedValue(null);
        const handler = createLoginHandler({ findUser });
        const req = { body: { solicitante: ' Ana ', password: senha }, session: {} };

        await handler(req, createResponse());

        expect(findUser).toHaveBeenCalledWith({
            solicitante: { $regex: /^Ana$/i }
        });
    });

    it.each([
        [{ email: '', password: senha }],
        [{ email: 'ana@example.test', password: '' }],
        [{ solicitante: '   ', password: senha }]
    ])('rejeita credenciais incompletas sem consultar usuários', async (body) => {
        const findUser = jest.fn();
        const handler = createLoginHandler({ findUser });
        const res = createResponse();

        await handler({ body, session: {} }, res);

        expect(res.statusCode).toBe(400);
        expect(findUser).not.toHaveBeenCalled();
    });

    it('retorna a mesma resposta para usuário inexistente e senha incorreta', async () => {
        const findUser = jest.fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({
                _id: 'user-id',
                senha: senhaHash
            });
        const handler = createLoginHandler({ findUser });
        const firstResponse = createResponse();
        const secondResponse = createResponse();

        await handler({
            body: { email: 'missing@example.test', password: senha },
            session: {}
        }, firstResponse);
        await handler({
            body: { email: 'ana@example.test', password: 'senha-incorreta' },
            session: {}
        }, secondResponse);

        expect(firstResponse.statusCode).toBe(401);
        expect(secondResponse.statusCode).toBe(401);
        expect(firstResponse.body).toEqual(secondResponse.body);
    });

    it('retorna erro explícito quando a consulta de usuário falha', async () => {
        const handler = createLoginHandler({
            findUser: jest.fn().mockRejectedValue(new Error('database unavailable'))
        });
        const res = createResponse();
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        try {
            await handler({
                body: { email: 'ana@example.test', password: senha },
                session: {}
            }, res);
        } finally {
            errorSpy.mockRestore();
        }

        expect(res.statusCode).toBe(500);
        expect(res.body.error).toMatch(/Erro interno/);
    });

    it('informa sessão ausente e retorna usuário autenticado sem dados de senha', () => {
        const loggedOut = createResponse();
        verificarSessao({ session: {} }, loggedOut);
        expect(loggedOut.statusCode).toBe(401);

        const loggedIn = createResponse();
        verificarSessao({
            session: {
                user: { _id: 'user-id', solicitante: 'Ana', role: 'user' }
            }
        }, loggedIn);
        expect(loggedIn.statusCode).toBe(200);
        expect(loggedIn.body).not.toHaveProperty('senha');
    });

    it('encerra e limpa o cookie da sessão no logout', () => {
        const res = createResponse();
        const req = {
            session: {
                destroy(callback) {
                    callback(null);
                }
            }
        };

        logout(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.clearedCookie).toBe('connect.sid');
    });
});

describe('Autorização e validação da sessão', () => {
    it('retorna JSON 401 para APIs e redireciona navegação sem sessão', () => {
        const apiResponse = createResponse();
        authMiddleware({
            session: {},
            method: 'GET',
            originalUrl: '/admin/usuarios',
            headers: {}
        }, apiResponse, jest.fn());
        expect(apiResponse.statusCode).toBe(401);
        expect(apiResponse.body).toEqual(expect.objectContaining({ error: expect.any(String) }));

        const browserResponse = createResponse();
        authMiddleware({
            session: {},
            method: 'GET',
            originalUrl: '/painelAdm.html',
            headers: {}
        }, browserResponse, jest.fn());
        expect(browserResponse.redirectPath).toBe('/login.html');
    });

    it('permite requisições autenticadas e métodos de escrita sem sessão retornam 401', () => {
        const next = jest.fn();
        authMiddleware({
            session: { user: { _id: 'user-id' } },
            method: 'GET',
            originalUrl: '/painelAdm.html',
            headers: {}
        }, createResponse(), next);
        expect(next).toHaveBeenCalledTimes(1);

        const response = createResponse();
        authMiddleware({
            session: {},
            method: 'POST',
            originalUrl: '/qualquer-rota',
            headers: {}
        }, response, jest.fn());
        expect(response.statusCode).toBe(401);
    });

    it.each(['admin', 'adm'])('permite role administrativa %s', async (role) => {
        const next = jest.fn();
        await verificaRole({ session: { user: { role } } }, createResponse(), next);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('nega role de usuário comum em rotas administrativas', async () => {
        const response = createResponse();
        await verificaRole(
            { session: { user: { role: 'user' } } },
            response,
            jest.fn()
        );
        expect(response.statusCode).toBe(403);
    });

    it('permite rotas da plataforma somente a superadmin', () => {
        const response = createResponse();
        const next = jest.fn();
        requireSuperAdmin({ session: { user: { role: 'admin' } } }, response, next);
        expect(response.statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();

        requireSuperAdmin({ session: { user: { role: 'superadmin' } } }, createResponse(), next);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('restringe alteração de solicitante ao próprio usuário ou administrador', async () => {
        const selfNext = jest.fn();
        await verificaPermissaoSolicitante({
            params: { id: 'user-id' },
            session: { user: { _id: 'user-id', role: 'user' } }
        }, createResponse(), selfNext);
        expect(selfNext).toHaveBeenCalledTimes(1);

        const denied = createResponse();
        await verificaPermissaoSolicitante({
            params: { id: 'other-id' },
            session: { user: { _id: 'user-id', role: 'user' } }
        }, denied, jest.fn());
        expect(denied.statusCode).toBe(403);

        const adminNext = jest.fn();
        await verificaPermissaoSolicitante({
            params: { id: 'other-id' },
            session: { user: { _id: 'admin-id', role: 'admin' } }
        }, createResponse(), adminNext);
        expect(adminNext).toHaveBeenCalledTimes(1);
    });

    it('bloqueia usuário pendente e valida integridade dos dados da sessão', () => {
        const pending = createResponse();
        verificaPendente(
            { session: { user: { role: 'pendente' } } },
            pending,
            jest.fn()
        );
        expect(pending.statusCode).toBe(403);

        const invalidSession = createResponse();
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        try {
            sessionMiddleware({
                session: { user: { solicitante: 'Ana' } }
            }, invalidSession, jest.fn());
        } finally {
            warnSpy.mockRestore();
        }
        expect(invalidSession.statusCode).toBe(401);

        const validNext = jest.fn();
        const validRequest = {
            session: {
                user: { _id: 'admin-id', solicitante: 'Admin', role: 'admin' }
            }
        };
        sessionMiddleware(validRequest, createResponse(), validNext);
        expect(validNext).toHaveBeenCalledTimes(1);
        expect(validRequest.isMasterUser).toBe(true);
    });
});
