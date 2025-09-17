import express from 'express';
import dotenv from 'dotenv';
import session from 'express-session';
import router from './routes/routes.js';
import conectaNaDatabase from './src/config/dbConnect.js';
import routesAuth from "./routes/routesAuth.js";

const conexao = await conectaNaDatabase();

conexao.on("error", (erro) => {
    console.error("erro de conexão com o DB", erro);
});

conexao.once("open", () => {
    console.log("Conexao com o banco feita com sucesso");
})

dotenv.config();
const app = express();
app.use(express.json());

app.use(session({
    secret: "chave-appweb-gus",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 dia
}));

app.use(routesAuth);
app.use('/', router);

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});