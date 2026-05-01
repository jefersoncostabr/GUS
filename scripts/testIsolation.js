import 'dotenv/config';
import { connectToMasterDb, getTenantConnection } from '../src/config/connectionFactory.js';
import { getSolicitanteModel } from '../src/models/usuariosmodel.js';
import { getSalaModel } from '../src/models/salaModel.js';

(async () => {
    await connectToMasterDb();
    const mongoose = await import('mongoose');
    const Usuario = getSolicitanteModel(mongoose.default.connection);

    // clean up any existing test users first
    await Usuario.deleteMany({ email: /@example\.com$/ });

    // criar dois usuários/admins com tenants distintos
    const tenants = ['alpha', 'beta'];
    const now = Date.now();
    const users = [];
    for (const t of tenants) {
        const u = await Usuario.create({ solicitante: `User ${t}_${now}`, email:`${t}_${now}@example.com`, senha:'hash', tipoUsuario:'admin', tenantDbName:`test_${t}_${now}` });
        users.push(u);
        console.log('Created user for tenant', t);
    }

    // em cada tenant, criar uma sala
    for (const t of tenants) {
        const conn = await getTenantConnection(`test_${t}_${now}`);
        const Sala = getSalaModel(conn);
        const sala = await Sala.create({ nome: `Sala ${t}`, numero: 1, estudioId: new mongoose.default.Types.ObjectId() });
        console.log(`Created sala in tenant ${t}:`, sala._id);
    }

    // listar salas de cada tenant para verificar isolamento
    for (const t of tenants) {
        const conn = await getTenantConnection(`test_${t}_${now}`);
        const Sala = getSalaModel(conn);
        const salas = await Sala.find({});
        console.log(`Salas in tenant ${t}:`, salas.map(s=>s.nome));
    }

    // limpar dados criados
    await Usuario.deleteMany({ email: new RegExp(`.*_${now}@example`) });
    for (const t of tenants) {
        const conn = await getTenantConnection(`test_${t}_${now}`);
        await conn.dropDatabase();
        console.log(`Dropped database for tenant test_${t}_${now}`);
    }

    process.exit(0);
})();