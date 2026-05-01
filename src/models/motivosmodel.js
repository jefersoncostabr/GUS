import mongoose from "mongoose";

const motivoSchema = new mongoose.Schema({
    motivo: { type: String, required: true, unique: true },
    ativo: { type: Boolean, default: true }
}, { versionKey: false });

/**
 * Retorna o modelo 'Motivos' compilado para uma conexão de tenant específica.
 * @param {mongoose.Connection} connection - A instância de conexão do Mongoose para um tenant.
 * @returns {mongoose.Model} O modelo Motivos.
 */
export const getMotivosModel = (connection) => {
    return connection.model('Motivo', motivoSchema);
};

// Compatibilidade: export default para imports que esperam default
export default getMotivosModel;