import mongoose from "mongoose";

const filialSchema = new mongoose.Schema({
    unidade: { type: String, required: true, default: "Matriz" }, // Nome/ID da filial
    endereco: { type: String },
    salas: { type: Number, default: 1 },       // Quantidade de salas nesta filial
}, { _id: false }, { versionKey: false }); // _id false pois é um subdocumento simples dentro do estúdio

const EstudioModelo = mongoose.model("Estudio", estudioSchema);

export default EstudioModelo;