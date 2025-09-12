import express from 'express';
import routerUsos from './routerUsos.js';

const router = express.Router();

router.get("/", (req, res) => {
    res.status(200).send("Rota inicial funcionando");
});

// http://localhost:3000/pr/painelGeral.html
router.use("/pr", express.static("frontend/painelgeral"));

router.use("/usos", routerUsos);// http://localhost:3000/usos

export default router;