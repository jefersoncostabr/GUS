import mongoose from "mongoose";

const aulaSchema = new mongoose.Schema({
    estudio: { type: mongoose.Schema.Types.ObjectId, ref: 'Estudio', required: true },
    sala: { type: String, required: true }, // Pode ser número ou identificador da sala
    diaSemana: { type: String, required: true }, // ex: "segunda", "terca"
    horaInicio: { type: String, required: true }, // Formato HH:MM
    modalidade: { type: String, required: true },
    professor: { type: mongoose.Schema.Types.ObjectId, ref: 'solicitantes' }
}, { versionKey: false });

const AulaModelo = mongoose.model("AulaRegular", aulaSchema);

export default AulaModelo;