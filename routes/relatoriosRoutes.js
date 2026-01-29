import { Router } from 'express';
import { getAgendamentosSemana } from '../src/controllers/relatoriosController.js';
import { verificaRole } from '../middleware/authMiddleware.js';

const router = Router();

// Rota para o relatório de agendamentos da semana
// Acessível em GET /admin/relatorios/semana
router.get('/semana', verificaRole, getAgendamentosSemana);

export default router;