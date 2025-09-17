import mongoose from "mongoose";

const solicitanteSchema = new mongoose.Schema({
    id: { type: mongoose.Schema.Types.ObjectId },
    solicitante: { type: String, required: true },
    estudio: { type: String, required: true },
    senha: { type: String, required: true },
    role: { type: String, required: true }
}, { versionKey: false });

const solicitanteModelo = mongoose.model("solicitantes", solicitanteSchema, "solicitantes");

export default solicitanteModelo;