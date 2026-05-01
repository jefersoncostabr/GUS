import { Router } from 'express';
import { getAgendamentosSemana, getAgendamentosMes, getUsosPorProfessor, getAulasRegulares, getTodosProfessores } from '../src/controllers/relatoriosController.js';
import { verificaRole } from '../middleware/authMiddleware.js';

// notas de middleware:
// - todas as rotas desse arquivo exigem authMiddleware + tenantMiddleware,
//   além de role 'admin' via verificaRole

const router = Router();

// Rota para o relatório de agendamentos da semana
// Acessível em GET /admin/relatorios/semana
router.get('/semana', verificaRole, getAgendamentosSemana);

// Rota para o relatório de agendamentos do mês
// Acessível em GET /admin/relatorios/mes
router.get('/mes', verificaRole, getAgendamentosMes);

// Rota para o relatório de usos por professor
// Acessível em GET /admin/relatorios/professor/:id
router.get('/professor/:id', verificaRole, getUsosPorProfessor);

// Rota para o relatório de aulas regulares
// Acessível em GET /admin/relatorios/aulas
router.get('/aulas', verificaRole, getAulasRegulares);

// Rota para o relatório de lista de professores
// Acessível em GET /admin/relatorios/professores
router.get('/professores', verificaRole, getTodosProfessores);

export default router;