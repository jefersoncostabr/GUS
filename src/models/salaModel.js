import mongoose from "mongoose";

const salaSchema = new mongoose.Schema({
    estudioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Estudio', required: true },
    nome: { type: String },
    numero: { type: Number, required: true },
}, { versionKey: false });

// Índice para evitar duplicidade de número de sala no mesmo estúdio
salaSchema.index({ estudioId: 1, numero: 1 }, { unique: true });

const SalaModelo = mongoose.model("Sala", salaSchema);

export default SalaModelo;