import express from "express";
import usoModelo from "../src/models/utilizacaomodel.js";
import solicitanteModelo from "../src/models/usuariosmodel.js";
import { verificaRole, authMiddleware, verificaSolicitante, verificaDuplicidade } from "../middleware/authMiddleware.js";

const routerUsos = express.Router();

// http://localhost:3000/usos
routerUsos.get("/", (req, res) => {
    res.status(200).send("Rota inicial usos funcionando");
});

// http://localhost:3000/usos/usos
routerUsos.get("/usos", async (req, res) => {
    try {
        const { solicitante, sala, dia } = req.query;
        const query = {};

        // Correção para busca por nome após migração para ObjectId
        if (solicitante) {
            const usuarios = await solicitanteModelo.find({ solicitante: { $regex: solicitante, $options: 'i' } });
            const idsUsuarios = usuarios.map(u => u._id);
            query.solicitante = { $in: idsUsuarios };
        }
        if (sala) query.sala = sala;
        if (dia) query.dia = dia;

        // Paginação: aceitar query params ?page=X&limit=Y
        let page = parseInt(req.query.page, 10) || 1;
        let limit = parseInt(req.query.limit, 10) || 5; // default 5
        const maxLimit = 100;
        if (limit > maxLimit) limit = maxLimit;
        if (page < 1) page = 1;

        const totalItems = await usoModelo.countDocuments(query);
        const totalPages = Math.max(1, Math.ceil(totalItems / limit));
        if (page > totalPages) page = totalPages;

        const skip = (page - 1) * limit;
        const listaDeUsos = await usoModelo.find(query).populate({ path: 'solicitante', model: solicitanteModelo }).skip(skip).limit(limit);

        // Retorna dados + metadados de paginação
        return res.status(200).json({
            data: listaDeUsos,
            page,
            limit,
            totalItems,
            totalPages
        });
    } catch (error) {
        console.error('Erro ao buscar usos paginados:', error);
        res.status(500).json({ error: 'Erro ao buscar usos' });
    }
});

// http://localhost:3000/usos/usos/:id
routerUsos.get("/usos/:id", async (req, res) => {
    const uso = await usoModelo.findById(req.params.id).populate({ path: 'solicitante', model: solicitanteModelo });
    if (!uso) {
        res.status(404).json({ message: 'Uso não encontrado com esse id' });
    } else {
        res.status(200).json(uso);
    }
});

// http://localhost:3000/usos/buscaid
routerUsos.get('/buscaid', async (req, res) => {
    const { solicitante, sala, dia, hora, motivo } = req.query;
    // Validação de entrada
    if (!solicitante || !sala || !dia || !hora) {
        return res.status(400).json({ error: 'Parâmetros obrigatórios não fornecidos' });
    }
    try {
        // Se o solicitante vier como nome (String), precisamos achar o ID dele primeiro
        let idSolicitante = solicitante;
        const usuarioEncontrado = await solicitanteModelo.findOne({ solicitante: solicitante });
        
        if (usuarioEncontrado) {
            idSolicitante = usuarioEncontrado._id;
        }
        // Se não achar usuário pelo nome, assume-se que o valor passado já seja um ID ou falhará no cast abaixo

        const uso = await usoModelo.findOne({
            solicitante: idSolicitante,
            sala: Number(sala),
            dia: Number(dia),
            hora: Number(hora),
            motivo
        });
        if (!uso) {
            return res.status(404).json({ message: 'Uso não encontrado' });
        }
        res.status(200).json({ id: uso._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar uso' });
    }
});

// http://localhost:3000/usos/usos
routerUsos.post('/usos', verificaDuplicidade, async (req, res) => {
    try {
        const { sala, dia, hora, motivo } = req.body;
        // Pega o ID do usuário logado na sessão (garante integridade)
        const solicitanteId = req.session.user ? req.session.user._id : null;

        // Validação: Impede o cadastro se algum campo estiver vazio
        if (!solicitanteId || !sala || !dia || !hora || !motivo) {
            return res.status(400).json({ message: 'Todos os campos devem ser preenchidos.' });
        }
        const novoUso = new usoModelo({
            solicitante: solicitanteId,
            sala,
            dia,
            hora,
            motivo
        });
        await novoUso.save();
        res.status(201).json(novoUso);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// http://localhost:3000/usos/usos/:id
routerUsos.put('/usos/:id', verificaSolicitante, async (req, res) => {
    try {
        const uso = await usoModelo.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!uso) {
            res.status(404).json({ error: 'Uso não encontrado' });
            return;
        }
        res.status(200).json(uso);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar uso' });
    }
});

// http://localhost:3000/usos/usos/:id
routerUsos.delete('/usos/:id', verificaSolicitante, async (req, res) => {
    try {
        const uso = await usoModelo.findById(req.params.id);
        if (!uso) {
            res.status(404).json({ error: 'Uso não encontrado' });
            return;
        }
        // Se o uso for encontrado e o solicitante for o mesmo, remove o uso do banco de dados
        await usoModelo.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Uso removido com sucesso' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao remover uso' });
    }
});

export default routerUsos;

/*
================================================================================
LISTA DE ENDPOINTS
================================================================================

GET /usos/
    - Descrição: Rota inicial de teste.
    - Retorno: Mensagem simples confirmando funcionamento.

GET /usos/usos
    - Descrição: Retorna todos os registros de uso.
    - Retorno: Array JSON com os objetos de uso.

GET /usos/usos/:id
    - Descrição: Busca os detalhes de um uso específico pelo ID.
    - Retorno: Objeto JSON do uso.

GET /usos/buscaid
    - Descrição: Busca o _id de um uso com base em parâmetros (solicitante, sala, dia, hora, motivo).
    - Query Params: solicitante, sala, dia, hora, motivo.
    - Retorno: JSON com o _id do uso.

POST /usos/usos
    - Descrição: Cria um novo registro de uso.
    - Middleware: verificaDuplicidade.
    - Retorno: Objeto criado.

PUT /usos/usos/:id
    - Descrição: Atualiza um uso existente.
    - Middleware: verificaSolicitante (apenas o dono pode editar).
    - Retorno: Objeto atualizado.

DELETE /usos/usos/:id
    - Descrição: Remove um registro de uso.
    - Middleware: verificaSolicitante (apenas o dono pode remover).
    - Retorno: Mensagem de sucesso.
================================================================================
*/