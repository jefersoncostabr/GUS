import express from 'express';
import routerUsos from './routerUsos.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import routerSolicitantes from './routerSolicitantes.js';

const router = express.Router();

router.get("/", (req, res) => {
    res.status(200).send("Rota inicial funcionando");
});

router.use(express.static('frontend/adm'));
router.use(express.static('frontend/painelgeral'));
// router.use(authMiddleware, express.static('frontend/painelgeral'));

router.use(express.static('frontend/sobre'));
router.use(express.static('frontend/login'));
router.use(express.static('frontend/loginCriar'));
router.use("/usos", routerUsos);// http://localhost:3000/usos
router.use("/solicitantes", routerSolicitantes);// http://localhost:3000/solicitantes


export default router;