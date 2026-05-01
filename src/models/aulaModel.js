import mongoose from "mongoose";

const aulaSchema = new mongoose.Schema({
    estudio: { type: mongoose.Schema.Types.ObjectId, ref: 'Estudio', required: true },
    sala: { type: String, required: true }, // Pode ser número ou identificador da sala
    diaSemana: { type: String, required: true }, // ex: "segunda", "terca"
    horaInicio: { type: String, required: true }, // Formato HH:MM
    modalidade: { type: String, required: true },
    professor: { type: mongoose.Schema.Types.ObjectId, ref: 'solicitantes' }
}, { versionKey: false });

/**
 * Retorna o modelo 'Aula' compilado para uma conexão de tenant específica.
 * @param {mongoose.Connection} connection - A instância de conexão do Mongoose para um tenant.
 * @returns {mongoose.Model} O modelo Aula.
 */
export const getAulaModel = (connection) => {
    return connection.model('AulaRegular', aulaSchema);
};

// Compatibilidade: export default para imports que esperam default
// Nota: Para usar, deve-se passar uma conexão específica
export default getAulaModel;