import express from "express";
import { authMiddleware, verificaPermissaoSolicitante } from "../middleware/authMiddleware.js";

// notas de middleware:
// - rotas de solicitantes exigem authMiddleware; tenantMiddleware injeta modelo
// - verificaPermissaoSolicitante protege PUT /solicitantes/:id

import { 
    listarSolicitantes, 
    buscarSolicitantePorId, 
    buscarIdSolicitante, 
    criarSolicitante, 
    atualizarSolicitante, 
    deletarSolicitante,
    listarEstudiosSimples
} from "../src/controllers/solicitanteController.js";

const routerSolicitantes = express.Router();

// http://localhost:3000/solicitantes
routerSolicitantes.get("/", (req, res) => {
    res.status(200).send("Rota inicial solicitantes funcionando");
});

// http://localhost:3000/solicitantes/lista-simples (novo endpoint)
routerSolicitantes.get("/lista-simples", listarEstudiosSimples);

// http://localhost:3000/solicitantes/solicitantes
routerSolicitantes.get("/solicitantes", listarSolicitantes);

// http://localhost:3000/solicitantes/solicitantes/:id
routerSolicitantes.get("/solicitantes/:id", buscarSolicitantePorId);

routerSolicitantes.get('/buscaidsolicitante', buscarIdSolicitante);

//http://localhost:3000/solicitantes/solicitantes
routerSolicitantes.post('/solicitantes', criarSolicitante);

// http://localhost:3000/solicitantes/solicitantes/:id
routerSolicitantes.put('/solicitantes/:id', authMiddleware, verificaPermissaoSolicitante, atualizarSolicitante);

// http://localhost:3000/solicitantes/solicitantes/:id
routerSolicitantes.delete('/solicitantes/:id', deletarSolicitante);

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