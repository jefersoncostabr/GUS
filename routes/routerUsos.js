import express from "express";
import { verificaRole, authMiddleware } from "../middleware/authMiddleware.js";

// notas de middleware:
// - todas as rotas USOS requerem authMiddleware + tenantMiddleware
// - verificaRole usado apenas para telas administrativas

import { 
    listarUsos, 
    buscarUsoPorId, 
    buscarIdUso, 
    criarUso, 
    atualizarUso, 
    deletarUso 
} from "../src/controllers/usoController.js";

const routerUsos = express.Router();

// http://localhost:3000/usos
routerUsos.get("/", (req, res) => {
    res.status(200).send("Rota inicial usos funcionando");
});

// http://localhost:3000/usos/usos
routerUsos.get("/usos", listarUsos);

// http://localhost:3000/usos/usos/:id
routerUsos.get("/usos/:id", buscarUsoPorId);

// http://localhost:3000/usos/buscaid
routerUsos.get('/buscaid', buscarIdUso);

// http://localhost:3000/usos/usos
routerUsos.post('/usos', criarUso);

// http://localhost:3000/usos/usos/:id
routerUsos.put('/usos/:id', atualizarUso);

// http://localhost:3000/usos/usos/:id
routerUsos.delete('/usos/:id', deletarUso);

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