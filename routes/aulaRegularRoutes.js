import express from "express";
import AdminController from "../src/controllers/adminController.js";
import { requireTenantCanCreate } from "../middleware/authMiddleware.js";

// notas de middleware:
// - usado em /admin/aulas via index.js; authMiddleware e tenantMiddleware aplicados globalmente


const router = express.Router();

// Rotas para gerenciamento de Aulas Regulares
router.get("/", AdminController.listarAulas);
router.post("/", requireTenantCanCreate, AdminController.criarAula);
router.put("/:id", AdminController.atualizarAula);
router.delete("/:id", AdminController.deletarAula);

export default router;