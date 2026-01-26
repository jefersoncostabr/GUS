import mongoose from "mongoose";

const motivoSchema = new mongoose.Schema({
    motivo: { type: String, required: true, unique: true },
    ativo: { type: Boolean, default: true }
}, { versionKey: false });

const MotivoModelo = mongoose.model("Motivo", motivoSchema);

export default MotivoModelo;