import request from 'supertest';
import mongoose from 'mongoose';
import 'dotenv/config';
import app from '../index.js';

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

    it('Deve proteger rotas administrativas (Redirecionar se não autenticado)', async () => {
        const res = await request(app).get('/admin');
        // O authMiddleware redireciona para login.html em requisições GET sem sessão
        expect(res.statusCode).toEqual(302);
    });

    it('Deve falhar ao tentar criar um solicitante sem dados (POST /solicitantes/solicitantes)', async () => {
        const res = await request(app)
            .post('/solicitantes/solicitantes')
            .send({});
        // Espera-se falha na validação (status diferente de 201 Created)
        expect(res.statusCode).not.toBe(201);
    });
});