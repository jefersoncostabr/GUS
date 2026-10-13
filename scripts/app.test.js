import request from 'supertest';
import mongoose from 'mongoose';
import 'dotenv/config';
import app from '../index.js';
import { requireTenantCanCreate, requireSuperAdmin } from '../middleware/authMiddleware.js';

describe('Testes de Integração - Sistema GUS', () => {
    // Conecta ao banco Master antes de rodar os testes
    beforeAll(async () => {
        // Se o mongoose já estiver conectado (pelo index.js), não precisamos reconectar
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI_MASTER);
        }
    });

    // Fecha a conexão após todos os testes para evitar processos pendentes
    afterAll(async () => {
        await mongoose.connection.close();
    });

    it('Deve verificar se o servidor está online (GET /)', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toEqual(200);
    });

    it('Deve retornar a lista de estúdios (GET /solicitantes/lista-simples)', async () => {
        const res = await request(app).get('/solicitantes/lista-simples');
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('Deve proteger a API administrativa com 401 JSON quando não autenticado', async () => {
        const res = await request(app)
            .get('/admin/usuarios')
            .set('Accept', 'application/json');

        expect(res.statusCode).toEqual(401);
        expect(res.body).toEqual(expect.objectContaining({
            error: expect.any(String)
        }));
    });

    it('Deve servir o painel administrativo estático', async () => {
        const res = await request(app).get('/painelAdm.html');

        expect(res.statusCode).toEqual(200);
        expect(res.headers['content-type']).toContain('text/html');
    });

    it('Deve proteger as rotas da plataforma com 401 JSON quando não autenticado', async () => {
        const res = await request(app)
            .get('/platform/tenants')
            .set('Accept', 'application/json');

        expect(res.statusCode).toEqual(401);
        expect(res.body).toEqual(expect.objectContaining({ error: expect.any(String) }));
    });

    it('Deve permitir inclusões em tenants aprovados ou dentro do trial', () => {
        const avaliar = (tenantLifecycle) => {
            let permitido = false;
            let status;
            const req = { tenantLifecycle };
            const res = {
                status(codigo) { status = codigo; return this; },
                json() { return this; }
            };
            requireTenantCanCreate(req, res, () => { permitido = true; });
            return { permitido, status };
        };

        expect(avaliar({ approvalStatus: 'approved' }).permitido).toBe(true);
        expect(avaliar({ approvalStatus: 'pending', trialEndsAt: new Date(Date.now() + 60_000) }).permitido).toBe(true);
    });

    it('Deve bloquear inclusões em tenants expirados ou reprovados', () => {
        const avaliar = (tenantLifecycle) => {
            let status;
            const req = { tenantLifecycle };
            const res = {
                status(codigo) { status = codigo; return this; },
                json() { return this; }
            };
            requireTenantCanCreate(req, res, () => {});
            return status;
        };

        expect(avaliar({ approvalStatus: 'pending', trialEndsAt: new Date(Date.now() - 1) })).toBe(423);
        expect(avaliar({ approvalStatus: 'rejected', trialEndsAt: new Date(Date.now() + 60_000) })).toBe(423);
    });

    it('Deve permitir rotas de plataforma somente para superadmin', () => {
        const avaliar = (role) => {
            let status;
            let permitido = false;
            const req = { session: { user: { role } } };
            const res = {
                status(codigo) { status = codigo; return this; },
                json() { return this; }
            };
            requireSuperAdmin(req, res, () => { permitido = true; });
            return { status, permitido };
        };

        expect(avaliar('admin')).toEqual({ status: 403, permitido: false });
        expect(avaliar('superadmin')).toEqual({ status: undefined, permitido: true });
    });

    it('Deve falhar ao tentar criar um solicitante sem dados (POST /solicitantes/solicitantes)', async () => {
        const res = await request(app)
            .post('/solicitantes/solicitantes')
            .send({});
        // Espera-se falha na validação (status diferente de 201 Created)
        expect(res.statusCode).not.toBe(201);
    });
});