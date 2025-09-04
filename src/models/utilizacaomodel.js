import mongoose from "mongoose";

const usoSchema = new mongoose.Schema({
  id: { type: mongoose.Schema.Types.ObjectId },
  solicitante: { type: String, required: true },
  sala: { type: Number, required: true },
  dia: { type: Number, required: true },
  hora: { type: Number, required: true },
  motivo: { type: String }
}, { versionKey: false });

const usoModelo = mongoose.model("usosdesala", usoSchema, "usosdesala");

export default usoModelo;