import express from 'express';
import dotenv from 'dotenv';
import router from './routes/routes.js';
import conectaNaDatabase from './src/config/dbConnect.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
app.use('/', router);

// app.use(express.static('frontend/painelgeral'));
app.use(express.static(path.join(__dirname, 'frontend/painelgeral')));

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});