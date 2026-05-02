import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import path from 'path';
import mongoose from 'mongoose';
import router from './routes/routes.js';
import { connectToMasterDb } from './src/config/connectionFactory.js';
import sessionMiddleware from './middleware/sessionMiddleware.js';
import tenantMiddleware from './middleware/tenantMiddleware.js';
import routesAuth from "./routes/routesAuth.js";
import adminRoutes from "./routes/adminRoutes.js";
import sistemaRoutes from "./routes/sistemaRoutes.js";
import aulaRegularRoutes from "./routes/aulaRegularRoutes.js";
import relatoriosRoutes from "./routes/relatoriosRoutes.js";
import publicSolicitanteRoutes from './routes/publicSolicitanteRoutes.js';
import { getEstudioModel } from './src/models/estudiomodel.js';
import rateLimit from 'express-rate-limit';

/**
 * Configuração de Rate Limit (Segurança)
 * Bloqueia spam de criação de contas/estúdios e ataques de força bruta.
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Janela de 15 minutos
    max: 10, // Limita a 10 requisições por IP por janela
    message: { 
        error: 'Muitas tentativas detectadas. Por favor, aguarde 15 minutos antes de tentar novamente.' 
    },
    standardHeaders: true, // Retorna info de limite nos headers RateLimit-*
    legacyHeaders: false, // Desabilita headers X-RateLimit-*
    // Garante que o rate limit seja aplicado apenas a métodos de escrita
    skipSuccessfulRequests: false 
});

dotenv.config();

// Conecta ao banco de dados Master (necessário para autenticação e gerenciar tenants)
await connectToMasterDb();
const conexao = mongoose.connection;

conexao.on("error", (erro) => {
    console.error("erro de conexão com o DB", erro);
});

conexao.once("open", () => {
    console.log("Conexao com o banco feita com sucesso");
})

const app = express();

// Habilita o CORS para todas as origens. Em produção, você pode querer restringir isso.
app.use(cors());

app.use(express.json());

// Aplica o limitador especificamente em rotas sensíveis (Login e Criação de Conta)
app.use('/login', authLimiter);
app.use('/solicitantes/solicitantes', authLimiter);

// 1. Servir arquivos estáticos ANTES dos middlewares de autenticação/tenant
// Usamos path.join para garantir que o caminho funcione independente de onde o terminal foi aberto
app.use(express.static(path.join(process.cwd(), 'frontend')));
const sessionSecret = process.env.SESSION_SECRET || 'segredo-padrao-dev-gus';

// Alerta de segurança se estiver usando o segredo padrão
if (!process.env.SESSION_SECRET) {
    console.warn('\n⚠️  AVISO DE SEGURANÇA: SESSION_SECRET não detectado. Usando segredo padrão (INSEGURO para produção).\n');
}

app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        client: conexao.getClient(), // Reaproveita a conexão já aberta do Mongoose (Banco Master)
        collectionName: 'sessions_gus',  // Nome da coleção onde as sessões serão salvas (no banco Master)
        touchAfter: 24 * 3600 // Evita escrever no DB em toda requisição se não houver mudança
    }),
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24, // 1 dia
        httpOnly: true, // Proteção: não permite acesso via JavaScript
        secure: process.env.NODE_ENV === 'production', // HTTPS only em produção
        sameSite: 'lax' // Proteção contra CSRF
    }
}));

/**
 * Middleware de Validação de Sessão (Multi-Tenant)
 * Valida integridade dos dados de sessão e enriquece req.session
 * com informações necessárias para roteamento por tenant.
 */
app.use(sessionMiddleware);

app.use(routesAuth);

// Rotas públicas para solicitantes (criação de conta) - devem vir ANTES das rotas protegidas
app.use('/', publicSolicitanteRoutes);

// Rota para buscar a lista de estúdios
app.get('/estudios', async (req, res) => {
    try {
        // Obtém o modelo do Estudio do banco Master
        const Estudio = getEstudioModel(conexao);
        const estudios = await Estudio.find({}, 'nome');
        res.status(200).json(estudios);
    } catch (error) {
        console.error("Erro ao buscar estúdios no banco de dados:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

// Middleware de Tenant - deve vir APÓS autenticação, para as rotas que precisam
app.use(tenantMiddleware);
app.use('/admin', adminRoutes); // Todas as rotas de admin começarão com /admin (ex: /admin/estudios)
app.use('/admin/relatorios', relatoriosRoutes); // Rotas específicas para relatórios
app.use('/admin/aulas', aulaRegularRoutes); // Rotas específicas para aulas regulares
app.use('/', sistemaRoutes);
app.use('/', router);

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);

    // Implementação de teste: Verifica a URL base no backend
   const baseUrl = process.env.NODE_ENV === 'production'
      ? "https://gus-q7nn.onrender.com"
      : `http://localhost:${PORT}/painelgeral.html`;
   console.log("Resultado do teste de URL:", baseUrl);
});



/*
================================================================================
DOCUMENTAÇÃO DO ARQUIVO: index.js
================================================================================

1. FINALIDADE
   Arquivo principal (entry point) da aplicação. Responsável pela inicialização
   do servidor, configuração de middlewares globais e conexão com banco de dados.

2. FLUXO DE EXECUÇÃO
   A. Conexão com Banco de Dados:
      - Invoca `conectaNaDatabase()` e define listeners para eventos de erro/sucesso.
   
   B. Configurações Iniciais:
      - Carrega variáveis de ambiente (.env).
      - Habilita parsing de JSON no Express.

   C. Gerenciamento de Sessão:
      - Configura `express-session` (segredo, persistência e cookie).

   D. Definição de Rotas:
      - Registra rotas de autenticação (`routesAuth`).
      - Registra rotas gerais (`router`).

   E. Inicialização:
      - Sobe o servidor na porta especificada (env.PORT ou 3000).
================================================================================
*/