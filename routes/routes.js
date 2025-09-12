import express from 'express';
import routerUsos from './routerUsos.js';
import path from 'path';

const router = express.Router();

router.use("/painel", express.static(path.join(process.cwd(), "frontEnd/painelGeral")));// http://localhost:3000/painel/painelGeral.html
router.use("/usos", routerUsos);// http://localhost:3000/usos

export default router;