import express from "express";
import solicitanteModelo from "../src/models/usuariosmodel.js";
import bcrypt from "bcrypt";
// import { retornarUserRoleDaSessao } from "../frontend/painelgeral/navegacaopg.js";

const routerSolicitantes = express.Router();

// http://localhost:3000/solicitantes
routerSolicitantes.get("/", (req, res) => {
    res.status(200).send("Rota inicial solicitantes funcionando");
});

// http://localhost:3000/solicitantes/solicitantes
routerSolicitantes.get("/solicitantes", async (req, res) => {
    const listaDeSolicitantes = await solicitanteModelo.find({});
    if (listaDeSolicitantes.length === 0) {
        res.status(404).json({ message: 'Nenhum solicitante encontrado' });
    } else {
        res.status(200).json(listaDeSolicitantes);
    }
});

// http://localhost:3000/solicitantes/solicitantes/:id
routerSolicitantes.get("/solicitantes/:id", async (req, res) => {
    const solicitante = await solicitanteModelo.findById(req.params.id);
    if (!solicitante) {
        res.status(404).json({ message: 'solicitante não encontrado com esse id' });
    } else {
        res.status(200).json(solicitante);
    }
});

routerSolicitantes.get('/buscaidsolicitante', async (req, res) => {
    const { solicitante,  estudio } = req.query;
    // Validação de entrada
    if (!solicitante || !estudio) {
        return res.status(400).json({ error: 'Parâmetros obrigatórios não fornecidos' });
    }
    try {
        const solicitanteEncontrado = await solicitanteModelo.findOne({
            solicitante,
            estudio: Number(estudio)
        });
        if (!solicitanteEncontrado) {
            return res.status(404).json({ message: 'solicitante não encontrado' });
        }
        res.status(200).json({ id: solicitanteEncontrado._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar solicitante' });
    }
});


//http://localhost:3000/solicitantes/solicitantes
routerSolicitantes.post('/solicitantes', async (req, res) => {
    console.log("Requisição para criar novo solicitante:", req.body);
    try {
        // Capitaliza a primeira letra do solicitante e remove espaços extras
        if (req.body.solicitante && typeof req.body.solicitante === 'string') {
            const nome = req.body.solicitante.trim();
            req.body.solicitante = nome.charAt(0).toUpperCase() + nome.slice(1);
        }

        const { senha } = req.body; // extrai a senha do corpo da requisição
        const saltRounds = 10; // número de rodadas para o hash
        const hashedPassword = await bcrypt.hash(senha, saltRounds); // gera o hash da senha

        const novoSolicitante = new solicitanteModelo({ // cria um novo objeto solicitante
            ...req.body, // copia os demais campos do corpo da requisição
            senha: hashedPassword, // substitui a senha pelo hash gerado
            role: "user"
        });
        await novoSolicitante.save(); // salva o novo objeto no banco de dados
        console.log("Novo solicitante criado:", novoSolicitante);

        res.status(201).json(novoSolicitante); 
    } catch (error) {
        res.status(400).json({ message: error.message }); 
    }
});


// http://localhost:3000/solicitantes/solicitantes/:id
routerSolicitantes.put('/solicitantes/:id', async (req, res) => {
    try {
        const solicitante = await solicitanteModelo.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!solicitante) {
            res.status(404).json({ error: 'solicitante não encontrado' });
            return;
        }
        res.status(200).json(solicitante);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar solicitante' });
    }
});

// http://localhost:3000/solicitantes/solicitantes/:id
routerSolicitantes.delete('/solicitantes/:id', async (req, res) => {
    try {
        const solicitante = await solicitanteModelo.findByIdAndDelete(req.params.id);
        if (!solicitante) {
            res.status(404).json({ error: 'solicitante não encontrado' });
            return;
        }
        res.status(200).json({ message: 'solicitante removido com sucesso' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao remover solicitante' });
    }
});

export default routerSolicitantes;

/*
================================================================================
LISTA DE ENDPOINTS
================================================================================

GET /solicitantes/
    - Descrição: Rota inicial de teste.
    - Retorno: Mensagem simples confirmando funcionamento.

GET /solicitantes/solicitantes
    - Descrição: Retorna todos os registros de solicitantes.
    - Retorno: Array JSON com os objetos de solicitantes.

GET /solicitantes/solicitantes/:id
    - Descrição: Busca os detalhes de um solicitante específico pelo ID.
    - Retorno: Objeto JSON do solicitante.

GET /solicitantes/buscaidsolicitante
    - Descrição: Busca o _id de um solicitante com base em parâmetros (solicitante, estudio).
    - Query Params: solicitante, estudio.
    - Retorno: JSON com o _id do solicitante.

POST /solicitantes/solicitantes
    - Descrição: Cria um novo solicitante (com hash de senha).
    - Retorno: Objeto criado.

PUT /solicitantes/solicitantes/:id
    - Descrição: Atualiza um solicitante existente.
    - Retorno: Objeto atualizado.

DELETE /solicitantes/solicitantes/:id
    - Descrição: Remove um registro de solicitante.
    - Retorno: Mensagem de sucesso.
================================================================================
*/