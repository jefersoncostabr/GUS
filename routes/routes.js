import express from 'express';
import routerUsos from './routerUsos.js';

const router = express.Router();

router.get("/", (req, res) => {
    res.status(200).send("Rota inicial funcionando");
});

router.use("/pr", express.static("frontend/painelGeral"));// http://localhost:3000/painel/painelGeral.html
router.use("/usos", routerUsos);// http://localhost:3000/usos

export default router;