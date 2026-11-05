import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../app.js';
import { requireTenantCanCreate, requireSuperAdmin } from '../../middleware/authMiddleware.js';

const connectionStateBeforeApp = mongoose.connection.readyState;
const app = createApp();

describe('Inicialização isolada da aplicação', () => {
    it('cria o app sem conectar ao MongoDB', () => {
        expect(mongoose.connection.readyState).toBe(connectionStateBeforeApp);
    });

    it('responde ao health check sem banco de dados', async () => {
        const response = await request(app).get('/health');

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ status: 'ok' });
    });

    it('redireciona a raiz para o painel geral', async () => {
        const response = await request(app).get('/').redirects(0);

        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toBe('/painelGeral.html');
    });

    it('serve o painel administrativo estático sem banco de dados', async () => {
        const response = await request(app).get('/painelAdm.html');

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('text/html');
    });

    it('protege a API administrativa quando não há sessão', async () => {
        const response = await request(app)
            .get('/admin/usuarios')
            .set('Accept', 'application/json');

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual(expect.objectContaining({
            error: expect.any(String)
        }));
    });

    it('protege as rotas da plataforma quando não há sessão', async () => {
        const response = await request(app)
            .get('/platform/tenants')
            .set('Accept', 'application/json');

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual(expect.objectContaining({
            error: expect.any(String)
        }));
    });

    it('protege as rotas de agendamento quando não há sessão', async () => {
        const response = await request(app)
            .get('/usos/usos')
            .set('Accept', 'application/json');

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual(expect.objectContaining({
            error: expect.any(String)
        }));
    });
});

describe('Regras de autorização isoladas', () => {
    it('permite inclusões em tenants aprovados ou dentro do trial', () => {
        const avaliar = (tenantLifecycle) => {
            let permitido = false;
            const req = { tenantLifecycle };
            const res = {
                status() { return this; },
                json() { return this; }
            };
            requireTenantCanCreate(req, res, () => { permitido = true; });
            return permitido;
        };

        expect(avaliar({ approvalStatus: 'approved' })).toBe(true);
        expect(avaliar({
            approvalStatus: 'pending',
            trialEndsAt: new Date(Date.now() + 60_000)
        })).toBe(true);
    });

    it('bloqueia inclusões em tenants expirados ou reprovados', () => {
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

        expect(avaliar({
            approvalStatus: 'pending',
            trialEndsAt: new Date(Date.now() - 1)
        })).toBe(423);
        expect(avaliar({
            approvalStatus: 'rejected',
            trialEndsAt: new Date(Date.now() + 60_000)
        })).toBe(423);
    });

    it('restringe rotas de plataforma ao superadmin', () => {
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
});
