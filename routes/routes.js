import express from 'express';
import routerUsos from './routerUsos.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import routerSolicitantes from './routerSolicitantes.js';

const router = express.Router();

router.get("/", (req, res) => {// http://localhost:3000
    res.status(200).send("Rota inicial funcionando");
});

router.use(express.static('frontend'));
// router.use(authMiddleware, express.static('frontend/painelgeral'));

router.use("/usos", routerUsos);// http://localhost:3000/usos
router.use("/solicitantes", routerSolicitantes);// http://localhost:3000/solicitantes


export default router;