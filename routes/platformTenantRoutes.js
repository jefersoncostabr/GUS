import express from 'express';
import { authMiddleware, requireSuperAdmin } from '../middleware/authMiddleware.js';
import {
    listarTenants,
    listarTenantsPendentes,
    aprovarTenant,
    reprovarTenant,
    excluirTenant
} from '../src/controllers/platformTenantController.js';

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);
router.get('/', listarTenants);
router.get('/pending-approval', listarTenantsPendentes);
router.post('/:id/approve', aprovarTenant);
router.post('/:id/reject', reprovarTenant);
router.delete('/:id', excluirTenant);

export default router;