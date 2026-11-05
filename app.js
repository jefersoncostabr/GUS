import express from 'express';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import mongoose from 'mongoose';
import router from './routes/routes.js';
import sessionMiddleware from './middleware/sessionMiddleware.js';
import tenantMiddleware from './middleware/tenantMiddleware.js';
import routesAuth from './routes/routesAuth.js';
import adminRoutes from './routes/adminRoutes.js';
import sistemaRoutes from './routes/sistemaRoutes.js';
import aulaRegularRoutes from './routes/aulaRegularRoutes.js';
import relatoriosRoutes from './routes/relatoriosRoutes.js';
import publicSolicitanteRoutes from './routes/publicSolicitanteRoutes.js';
import platformTenantRoutes from './routes/platformTenantRoutes.js';
import { getEstudioModel } from './src/models/estudiomodel.js';
import rateLimit from 'express-rate-limit';

export function createApp({ sessionStore } = {}) {
    const app = express();
    const isProduction = process.env.NODE_ENV === 'production';
    const conexao = mongoose.connection;

    if (isProduction) {
        app.set('trust proxy', 1);
    }

    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        message: {
            error: 'Muitas tentativas detectadas. Por favor, aguarde 15 minutos antes de tentar novamente.'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false
    });

    const signupLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: { error: 'Muitas tentativas de cadastro. Aguarde 15 minutos e tente novamente.' },
        standardHeaders: true,
        legacyHeaders: false
    });

    app.use(cors({
        origin: true,
        credentials: true
    }));

    app.use(express.json());
    app.use('/login', authLimiter);
    app.use('/solicitantes/solicitantes', authLimiter);

    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok' });
    });

    app.get('/', (req, res) => {
        res.redirect(302, '/painelGeral.html');
    });

    app.get(['/home', '/painelgeral'], (req, res) => {//Rota para redirecionar /home e /painelgeral para /painelGeral.html
        res.redirect(302, '/painelGeral.html');
    });

    app.get(/^\/painelgeral\.html$/, (req, res) => {//Rota para redirecionar /painelgeral.html para /painelGeral.html
        res.redirect(302, '/painelGeral.html');
    });

    app.use(express.static(path.join(process.cwd(), 'frontend')));

    const sessionSecret = process.env.SESSION_SECRET || 'segredo-padrao-dev-gus';
    if (!process.env.SESSION_SECRET) {
        console.warn('\n⚠️  AVISO DE SEGURANÇA: SESSION_SECRET não detectado. Usando segredo padrão (INSEGURO para produção).\n');
    }

    if (process.env.NODE_ENV !== 'test' && !sessionStore) {
        throw new Error('Configure o armazenamento persistente de sessão antes de criar o app.');
    }

    app.use(session({
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        store: sessionStore,
        proxy: isProduction,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax'
        }
    }));

    app.use(sessionMiddleware);
    app.use(routesAuth);
    app.use('/platform/tenants', platformTenantRoutes);

    app.post('/solicitantes', signupLimiter, (req, res, next) => next());
    app.use('/', publicSolicitanteRoutes);

    app.get('/estudios', async (req, res) => {
        try {
            const usuario = req.session?.user;
            if (!usuario) {
                return res.status(401).json({ error: 'Usuário não autenticado. Faça login primeiro.' });
            }
            if (!usuario.tenantDbName) {
                if (usuario.role === 'superadmin') {
                    const Estudio = getEstudioModel(conexao);
                    const estudios = await Estudio.find({}, 'nome').sort({ nome: 1 });
                    return res.status(200).json(estudios);
                }
                return res.status(403).json({ error: 'Usuário sem tenant associado.' });
            }
            const Estudio = getEstudioModel(conexao);
            const estudios = await Estudio.find({
                $or: [{ tenantDbName: usuario.tenantDbName }, { ownerTenantDbName: usuario.tenantDbName }]
            }, 'nome').sort({ nome: 1 });
            res.status(200).json(estudios);
        } catch (error) {
            console.error('Erro ao buscar estúdios no banco de dados:', error);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    });

    app.use(['/admin', '/usos', '/solicitantes'], tenantMiddleware);
    app.use('/admin', adminRoutes);
    app.use('/admin/relatorios', relatoriosRoutes);
    app.use('/admin/aulas', aulaRegularRoutes);
    app.use('/', sistemaRoutes);
    app.use('/', router);

    return app;
}
