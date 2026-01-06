import mongoose from "mongoose";

const usoSchema = new mongoose.Schema({
    id: { type: mongoose.Schema.Types.ObjectId },
    solicitante: { type: String, required: true },
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

const usoModelo = mongoose.model("usosdesala", usoSchema, "usosdesala");

export default usoModelo;