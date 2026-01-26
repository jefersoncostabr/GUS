import express from 'express';
import dotenv from 'dotenv';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import router from './routes/routes.js';
import conectaNaDatabase from './src/config/dbConnect.js';
import routesAuth from "./routes/routesAuth.js";
import adminRoutes from "./routes/adminRoutes.js";
import sistemaRoutes from "./routes/sistemaRoutes.js";
import aulaRegularRoutes from "./routes/aulaRegularRoutes.js";

dotenv.config();

const conexao = await conectaNaDatabase();

conexao.on("error", (erro) => {
    console.error("erro de conexão com o DB", erro);
});

conexao.once("open", () => {
    console.log("Conexao com o banco feita com sucesso");
})

const app = express();
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        client: conexao.getClient(), // Reaproveita a conexão já aberta do Mongoose
        collectionName: 'sessions_gus'   // Nome da coleção onde as sessões serão salvas
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 dia
}));

// Configuração para servir arquivos estáticos (CSS, JS, Imagens)
app.use(express.static('frontend'));

app.use(routesAuth);
app.use('/admin', adminRoutes); // Todas as rotas de admin começarão com /admin (ex: /admin/estudios)
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