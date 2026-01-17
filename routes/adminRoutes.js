import express from "express";
import AdminController from "../src/controllers/adminController.js";
// import { verificaRole } from "../middleware/authMiddleware.js"; // Descomente e ajuste o caminho se necessário

const router = express.Router();

// Aplica proteção para todas as rotas abaixo (apenas admin pode acessar)
// router.use(verificaRole(["admin"])); 


// Rotas de Estúdios
router.get("/estudios", AdminController.listarEstudios);// http://localhost:3000/admin/estudios - Lista todos os estúdios
router.post("/estudios", AdminController.criarEstudio);// http://localhost:3000/admin/estudios - Cria um novo estúdio
router.put("/estudios/:id", AdminController.atualizarEstudio);// http://localhost:3000/admin/estudios/:id - Atualiza um estúdio existente
router.delete("/estudios/:id", AdminController.deletarEstudio);// http://localhost:3000/admin/estudios/:id - Remove um estúdio


// Rotas de Motivos
router.get("/motivos", AdminController.listarMotivos);// http://localhost:3000/admin/motivos - Lista todos os motivos
router.post("/motivos", AdminController.criarMotivo);// http://localhost:3000/admin/motivos - Cria um novo motivo
router.delete("/motivos/:id", AdminController.deletarMotivo);// http://localhost:3000/admin/motivos/:id - Remove um motivo


// Rotas de Configurações
router.get("/config", AdminController.listarConfig);// http://localhost:3000/admin/config - Lista as configurações gerais
router.put("/config", AdminController.atualizarConfig);// http://localhost:3000/admin/config - Atualiza as configurações gerais

export default router;

/*
================================================================================
LISTA DE ENDPOINTS ADMINISTRATIVOS
================================================================================

GET /admin/estudios
    - Descrição: Retorna a lista de todos os estúdios e suas filiais.
    - Retorno: Array JSON com objetos de estúdio.

POST /admin/estudios
    - Descrição: Cria um novo estúdio.
    - Body: { nome, localizacao, filiais: [], ativo }
    - Retorno: Objeto do estúdio criado.

PUT /admin/estudios/:id
    - Descrição: Atualiza um estúdio existente.
    - Body: Campos a atualizar.
    - Retorno: Mensagem de sucesso.

DELETE /admin/estudios/:id
    - Descrição: Remove um estúdio pelo ID.
    - Retorno: Mensagem de sucesso.

GET /admin/motivos
    - Descrição: Retorna a lista de motivos permitidos para agendamento.
    - Retorno: Array JSON com objetos de motivo.

POST /admin/motivos
    - Descrição: Adiciona um novo motivo à lista.
    - Body: { motivo: "Nome do Motivo" }
    - Retorno: Objeto do motivo criado.

DELETE /admin/motivos/:id
    - Descrição: Remove um motivo da lista.
    - Retorno: Mensagem de sucesso.

GET /admin/config
    - Descrição: Retorna as configurações globais do sistema (ex: modo manutenção).
    - Retorno: Objeto de configuração.

PUT /admin/config
    - Descrição: Atualiza as configurações globais.
    - Body: { manutencao, limiteDiasAntecedencia, mensagemAviso }
    - Retorno: Objeto de configuração atualizado.
================================================================================
*/