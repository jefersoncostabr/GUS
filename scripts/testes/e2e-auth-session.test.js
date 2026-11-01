import { jest } from '@jest/globals';
import bcrypt from 'bcrypt';
import request from 'supertest';

const getSolicitanteModel = jest.fn();

jest.unstable_mockModule('../../src/models/usuariosmodel.js', () => ({
    getSolicitanteModel
}));

const { createApp } = await import('../../app.js');

describe('Fluxo HTTP ponta a ponta de autenticação e sessão', () => {
    const senha = 'senha-e2e-segura';
    const usuario = {
        _id: 'e2e-user-id',
        solicitante: 'Ana Teste',
        email: 'ana@example.test',
        role: 'user',
        tenantDbName: 'gus_tenant_e2e'
    };
    let agent;

    beforeAll(async () => {
        process.env.SESSION_SECRET = 'segredo-exclusivo-para-testes-e2e';
        const senhaHash = await bcrypt.hash(senha, 4);
        const userQuery = {
            select: jest.fn(),
            lean: jest.fn().mockResolvedValue({ ...usuario, senha: senhaHash })
        };
        userQuery.select.mockReturnValue(userQuery);
        getSolicitanteModel.mockReturnValue({
            findOne: jest.fn().mockReturnValue(userQuery)
        });

        agent = request.agent(createApp());
    });

    it('rejeita senha inválida, mantém sessão no login e a encerra no logout', async () => {
        const loginInvalido = await agent
            .post('/login')
            .send({ email: usuario.email, password: 'senha-incorreta' });

        expect(loginInvalido.statusCode).toBe(401);

        const login = await agent
            .post('/login')
            .send({ email: usuario.email, password: senha });

        expect(login.statusCode).toBe(200);
        expect(login.body.usuario).toEqual(usuario);
        expect(login.headers['set-cookie']).toEqual(
            expect.arrayContaining([expect.stringContaining('connect.sid=')])
        );

        const sessaoAtiva = await agent.get('/usuario-logado');
        expect(sessaoAtiva.statusCode).toBe(200);
        expect(sessaoAtiva.body).toEqual(usuario);

        const logout = await agent.post('/logout');
        expect(logout.statusCode).toBe(200);

        const sessaoEncerrada = await agent.get('/usuario-logado');
        expect(sessaoEncerrada.statusCode).toBe(401);
    });
});
