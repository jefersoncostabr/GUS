import mongoose from "mongoose";
import dotenv from "dotenv";
import SolicitanteModel from "../src/models/usuariosmodel.js";

// Carrega variáveis de ambiente
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/gus"; // Ajuste se necessário

async function migrar() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Conectado ao MongoDB...");

        // 1. Buscar todos os usuários para criar um mapa (Nome -> ID)
        const usuarios = await SolicitanteModel.find({});
        const mapaUsuarios = {};
        usuarios.forEach(u => {
            mapaUsuarios[u.solicitante] = u._id;
        });

        console.log(`Encontrados ${usuarios.length} usuários.`);

        // 2. Acessar a coleção de usos diretamente (bypass do Schema atual para evitar erros de validação)
        const collectionUsos = mongoose.connection.collection("usosdesala");
        const agendamentos = await collectionUsos.find({}).toArray();

        let atualizados = 0;
        let erros = 0;

        for (const agendamento of agendamentos) {
            // Verifica se o solicitante é uma String (o que indica que precisa migrar)
            if (typeof agendamento.solicitante === 'string') {
                const idUsuario = mapaUsuarios[agendamento.solicitante];

                if (idUsuario) {
                    await collectionUsos.updateOne(
                        { _id: agendamento._id },
                        { $set: { solicitante: idUsuario } }
                    );
                    atualizados++;
                } else {
                    console.warn(`Usuário não encontrado para o agendamento ID: ${agendamento._id}, Nome: ${agendamento.solicitante}`);
                    erros++;
                }
            }
        }

        console.log(`Migração concluída! Atualizados: ${atualizados}. Sem correspondência: ${erros}.`);
        process.exit(0);
    } catch (error) {
        console.error("Erro na migração:", error);
        process.exit(1);
    }
}

migrar();