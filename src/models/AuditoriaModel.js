import mongoose from 'mongoose';

const auditoriaSchema = new mongoose.Schema({
    usuarioId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Solicitante',
        required: true 
    },
    nomeUsuario: String,
    acao: { 
        type: String, 
        required: true 
    }, // Ex: 'DELETE_ALL_USOS', 'UPDATE_ROLE'
    recurso: String, // Ex: 'Utilizacao', 'Estudio'
    detalhes: mongoose.Schema.Types.Mixed,
    tenantDbName: String,
    ip: String,
    data: { 
        type: Date, 
        default: Date.now 
    }
}, { versionKey: false });

/**
 * Modelo de Auditoria (Sempre no banco Master)
 */
export const getAuditoriaModel = (connection) => 
    connection.models.Auditoria || connection.model('Auditoria', auditoriaSchema);