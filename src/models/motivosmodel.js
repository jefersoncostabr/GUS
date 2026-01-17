import mongoose from "mongoose";

//Opções possíveis de preenchimento do campo motivo na reserva de salas 
const motivoSchema = new mongoose.Schema({
    motivo: { type: String, required: true, unique: true, trim: true }
}, { versionKey: false });

const MotivoModelo = mongoose.model("Motivo", motivoSchema);

export default MotivoModelo;