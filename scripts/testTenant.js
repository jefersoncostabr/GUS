import 'dotenv/config';
import { connectToMasterDb } from '../src/config/connectionFactory.js';
import { getSolicitanteModel } from '../src/models/usuariosmodel.js';

(async () => {
    await connectToMasterDb();
    // require mongoose normally to access the existing connection
    const mongoose = await import('mongoose');
    const Usuario = getSolicitanteModel(mongoose.default.connection);
    const u = await Usuario.create({ solicitante:'Test User', email:'test@t.com', senha:'hash', tipoUsuario:'admin', tenantDbName:'test123' });
    console.log('Created user', u._id);

    const req = { session: { user: { tenantDbName: 'test123', solicitante: 'testuser' } } };
    const res = {};
    const tenantMiddleware = (await import('../middleware/tenantMiddleware.js')).default;
    await new Promise((resolve, reject) => {
        tenantMiddleware(req, res, err => err ? reject(err) : resolve());
    });
    console.log('Injected models:', Object.keys(req.tenantModels));
    // cleanup
    await Usuario.findByIdAndDelete(u._id);
    process.exit(0);
})();