import mongoose from "mongoose";

const salaSchema = new mongoose.Schema({
    estudioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Estudio', required: true },
    nome: { type: String },
    numero: { type: Number, required: true },
}, { versionKey: false });

// Índice para evitar duplicidade de número de sala no mesmo estúdio
salaSchema.index({ estudioId: 1, numero: 1 }, { unique: true });

/**
 * Retorna o modelo 'Sala' compilado para uma conexão de tenant específica.
 * @param {mongoose.Connection} connection - A instância de conexão do Mongoose para um tenant.
 * @returns {mongoose.Model} O modelo Sala.
 */
export const getSalaModel = (connection) => {
    return connection.model('Sala', salaSchema);
};

// Compatibilidade: export default para imports que esperam default
export default getSalaModel;