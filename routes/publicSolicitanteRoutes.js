import express from 'express';
import { listarEstudiosSimples, criarSolicitante } from '../src/controllers/solicitanteController.js';

const router = express.Router();

// Rotas públicas para solicitantes (não exigem autenticação)
// Quando montado em '/', estas rotas ficam como:
// GET /solicitantes/lista-simples - Lista estúdios para seleção no cadastro
// POST /solicitantes - Cria novo solicitante/estúdio
router.get('/solicitantes/lista-simples', listarEstudiosSimples);
router.post('/solicitantes', criarSolicitante);

export default router;
