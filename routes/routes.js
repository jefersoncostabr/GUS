import express from 'express';
import routerUsos from './routerUsos.js';
import { authMiddleware, verificaPendente } from '../middleware/authMiddleware.js';
import routerSolicitantes from './routerSolicitantes.js';

const router = express.Router();

/**
 * Roteadores Específicos.
 * Redireciona as requisições para os roteadores correspondentes.
 */
router.use("/usos", authMiddleware, verificaPendente, routerUsos);// http://localhost:3000/usos

// Rotas de solicitantes requerem autenticação
router.use("/solicitantes", authMiddleware, verificaPendente, routerSolicitantes);// http://localhost:3000/solicitantes


export default router;