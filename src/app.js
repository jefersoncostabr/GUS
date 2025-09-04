import express from 'express';
import conectaNaDatabase from "./config/dbConnect.js";
import router from '../routes/routes.js';

const conexao = await conectaNaDatabase();

conexao.on("error", (erro) => {
    console.error("erro de conexão com o DB", erro);
});

conexao.once("open", () => {
    console.log("Conexao com o banco feita com sucesso");
})

const app = express();
app.use(express.json());
app.use('/', router);

export default app;