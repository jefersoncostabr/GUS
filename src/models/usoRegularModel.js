import mongoose from "mongoose";

const usoSchema = new mongoose.Schema({
    id: { type: mongoose.Schema.Types.ObjectId },
    solicitante: { type: mongoose.Schema.Types.ObjectId, ref: 'solicitantes', required: true },
    sala: { type: Number, required: true },
    dia: { type: String, required: true },
    hora: { type: String, required: true },
    modalidade: { type: String },
    professor: { type: String }
}, { versionKey: false });

const UsoRegularModelo = mongoose.model("AulaRegular", usoSchema);

export default UsoRegularModelo;
