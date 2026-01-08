import mongoose from "mongoose";

/**
 * Schema do Mongoose para a entidade de Uso de Sala (Agendamento).
 * 
 * @property {mongoose.Schema.Types.ObjectId} id - Identificador opcional explícito.
 * @property {mongoose.Schema.Types.ObjectId} solicitante - Referência ao ID do Solicitante (Obrigatório).
 * @property {Number} sala - Número da sala agendada (Obrigatório).
 * @property {String} dia - Dia do agendamento (formato DD/MM) (Obrigatório).
 * @property {String} hora - Horário do agendamento (formato HH:MM) (Obrigatório).
 * @property {String} [motivo] - Motivo ou descrição do uso da sala (Opcional).
 */
const usoSchema = new mongoose.Schema({
    id: { type: mongoose.Schema.Types.ObjectId },
    solicitante: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'solicitantes',
        required: true 
    },
    sala: { type: Number, required: true },
    dia: { type: String, required: true },
    hora: { type: String, required: true },
    motivo: { type: String }
}, { versionKey: false });

// Índices para melhorar performance de consultas e evitar duplicidade
// Sugestão: em produção, considere criar um índice único para prevenir
// registros duplicados exatamente iguais de sala+dia+hora.
// Aqui criamos índices não-únicos para otimizar buscas e checagens de duplicidade.
usoSchema.index({ sala: 1, dia: 1, hora: 1 });
usoSchema.index({ solicitante: 1 });
usoSchema.index({ motivo: 1 });

/**
 * Modelo Mongoose para interação com a coleção 'usosdesala'.
 * @type {mongoose.Model}
 */
const usoModelo = mongoose.model("usosdesala", usoSchema, "usosdesala");

export default usoModelo;