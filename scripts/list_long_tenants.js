import 'dotenv/config';
import mongoose from 'mongoose';
import { getSolicitanteModel } from '../src/models/usuariosmodel.js';

async function run() {
    await mongoose.connect(process.env.MONGO_URI_MASTER);
    const Solicitante = getSolicitanteModel(mongoose.connection);
    const longUsers = await Solicitante.find({ tenantDbName: { $exists: true, $ne: null } }).lean();
    const filtered = longUsers.filter(u => u.tenantDbName.length > 38);
    console.log('users with tenantDbName >38:');
    filtered.forEach(u => console.log(u.solicitante, u.tenantDbName, u.tenantDbName.length));
    process.exit(0);
}
run().catch(err=>{console.error(err);process.exit(1);});
