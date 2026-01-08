import express from 'express';
import routerUsos from './routerUsos.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import routerSolicitantes from './routerSolicitantes.js';

const router = express.Router();

/**
 * Rota raiz para verificação de saúde da API (Health Check).
 * Retorna status 200 e uma mensagem simples se o servidor estiver acessível.
 * @route GET /
 */
router.get("/", (req, res) => {// http://localhost:3000
    res.status(200).send("Rota inicial funcionando");
});

/**
 * Middleware para servir arquivos estáticos da pasta 'frontend'.
 * Permite acesso direto a HTML, CSS e JS do cliente.
 */
router.use(express.static('frontend'));
// router.use(authMiddleware, express.static('frontend/painelgeral'));

/**
 * Roteadores Específicos.
 * Redireciona as requisições para os arquivos de rota correspondentes.
 */
router.use("/usos", routerUsos);// http://localhost:3000/usos
router.use("/solicitantes", routerSolicitantes);// http://localhost:3000/solicitantes


export default router;