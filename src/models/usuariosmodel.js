import mongoose from "mongoose";

/**
 * Schema do Mongoose para a entidade Solicitante.
 * 
 * @property {mongoose.Schema.Types.ObjectId} id - Identificador opcional explícito.
 * @property {String} solicitante - Nome do solicitante (Obrigatório).
 * @property {String} estudio - Estúdio associado ao solicitante (Obrigatório).
 * @property {String} senha - Senha de acesso (Obrigatório).
 * @property {String} [role] - Papel ou função do usuário no sistema (Opcional).
 */
const solicitanteSchema = new mongoose.Schema({
    id: { type: mongoose.Schema.Types.ObjectId },
    solicitante: { type: String, required: true },
    estudio: { type: mongoose.Schema.Types.ObjectId, ref: 'Estudio', required: true },
    senha: { type: String, required: true },
    role: { type: String, required: false }
}, { versionKey: false });

/**
 * Modelo Mongoose para interação com a coleção 'solicitantes'.
 * @type {mongoose.Model}
 */
const solicitanteModelo = mongoose.model("solicitantes", solicitanteSchema, "solicitantes");

export default solicitanteModelo;