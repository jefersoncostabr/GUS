import mongoose from "mongoose";
import dotenv from "dotenv";
import SolicitanteModel from "../src/models/usuariosmodel.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/gus";

async function corrigir() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Conectado ao MongoDB em:", MONGO_URI);

        // 1. Carregar usuários em memória para comparação flexível
        const usuarios = await SolicitanteModel.find({});
        const mapaUsuarios = {};
        
        usuarios.forEach(u => {
            // Cria chaves normalizadas (sem espaços, minúsculas) para facilitar o match
            const chave = u.solicitante.trim().toLowerCase();
            mapaUsuarios[chave] = u._id;
            mapaUsuarios[u.solicitante] = u._id; // Mantém a chave original também
        });

        console.log(`Carregados ${usuarios.length} usuários para referência.`);

        // 2. Acessar coleção de usos diretamente
        const collectionUsos = mongoose.connection.collection("usosdesala");
        const agendamentos = await collectionUsos.find({}).toArray();

        let corrigidos = 0;
        let naoEncontrados = 0;

        for (const item of agendamentos) {
            // Se o campo solicitante for uma String, precisamos converter
            if (typeof item.solicitante === 'string') {
                const chaveBusca = item.solicitante.trim().toLowerCase();
                const idUsuario = mapaUsuarios[chaveBusca];

                if (idUsuario) {
                    await collectionUsos.updateOne(
                        { _id: item._id },
                        { $set: { solicitante: idUsuario } }
                    );
                    console.log(`✅ Corrigido: "${item.solicitante}" -> ${idUsuario}`);
                    corrigidos++;
                } else {
                    console.warn(`⚠️ Usuário não encontrado para o agendamento: "${item.solicitante}" (ID do Agendamento: ${item._id})`);
                    naoEncontrados++;
                }
            }
        }

        console.log(`\nResumo: ${corrigidos} registros corrigidos. ${naoEncontrados} sem correspondência.`);
        process.exit(0);
    } catch (error) {
        console.error("Erro fatal:", error);
        process.exit(1);
    }
}

corrigir();