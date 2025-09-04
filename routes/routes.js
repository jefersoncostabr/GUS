import express from 'express';
import routerUsos from './routerUsos.js';

const router = express.Router();

router.get('/', (req, res) => {
    res.send('API de autenticação com Express e bcrypt funcionando!');
});

router.use("/painel", express.static("frontEnd"));// http://localhost:3000/painel/painelGeral.html
router.use("/usos", routerUsos);// http://localhost:3000/usos

export default router;