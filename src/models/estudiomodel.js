import mongoose from "mongoose";

const esquemaComum = {
    nome: { type: String, required: true },
    endereco: { type: String },
    salas: { type: Number, default: 1 }
};

const filialSchema = new mongoose.Schema(esquemaComum);

const estudioSchema = new mongoose.Schema({
    ...esquemaComum,
    filiais: [filialSchema]
}, { versionKey: false });

const EstudioModelo = mongoose.model("Estudio", estudioSchema);

export default EstudioModelo;