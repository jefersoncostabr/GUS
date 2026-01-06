import express from 'express';
import routerUsos from './routerUsos.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import routerSolicitantes from './routerSolicitantes.js';

const router = express.Router();

router.get("/", (req, res) => {// http://localhost:3000
    res.status(200).send("Rota inicial funcionando");
});

<<<<<<< HEAD
router.use(express.static('frontend/adm'));
router.use(express.static('frontend/painelgeral'));
// router.use(authMiddleware, express.static('frontend/painelgeral'));

router.use(express.static('frontend/sobre'));
router.use(express.static('frontend/login'));
router.use(express.static('frontend/loginCriar'));
router.use("/usos", routerUsos);// http://localhost:3000/usos
router.use("/solicitantes", routerSolicitantes);// http://localhost:3000/solicitantes
=======
router.use(express.static('frontend'));// http://localhost:3000/painelgeral.html
// router.use(authMiddleware, express.static('frontend'));

router.use("/usos", routerUsos);// http://localhost:3000/usos+
router.use("/solicitantes", routerSolicitantes);// http://localhost:3000/solicitantes+
>>>>>>> format-inputs


export default router;