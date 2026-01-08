import mongoose from "mongoose";
import dotenv from "dotenv";
import SolicitanteModelo from "../src/models/usuariosmodel.js";
import UsoModelo from "../src/models/utilizacaomodel.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/gus";

/**
 * Script de Manutenção e Limpeza do Banco de Dados.
 * 
 * Executa duas operações principais:
 * 1. Remove agendamentos antigos onde o campo 'solicitante' ainda é uma String (falha de migração).
 * 2. Remove agendamentos órfãos (onde o ID do solicitante existe no agendamento, mas o usuário foi excluído).
 * 
 * @function limparBanco
 * @returns {Promise<void>} Encerra o processo com código 0 (sucesso) ou 1 (erro).
 */
async function limparBanco() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Conectado ao MongoDB para limpeza...");

        const collectionUsos = mongoose.connection.collection("usosdesala");

        // 1. Remover registros onde 'solicitante' ainda é String (não migrados)
        const resultadoStrings = await collectionUsos.deleteMany({ 
            solicitante: { $type: "string" } 
        });
        
        if (resultadoStrings.deletedCount > 0) {
            console.log(`🗑️  Removidos ${resultadoStrings.deletedCount} agendamentos com formato antigo (String).`);
        } else {
            console.log("✅ Nenhum agendamento com formato de String encontrado.");
        }

        // 2. Remover registros órfãos (ID existe no agendamento, mas usuário não existe)
        // Busca todos os IDs de usuários válidos
        const usuariosValidos = await SolicitanteModelo.find({}, '_id');
        const listaIdsValidos = usuariosValidos.map(u => u._id.toString());

        // Busca todos os agendamentos
        const todosAgendamentos = await UsoModelo.find({});
        const idsParaRemover = [];

        todosAgendamentos.forEach(uso => {
            // Se tem solicitante, mas o ID não está na lista de válidos
            if (uso.solicitante && !listaIdsValidos.includes(uso.solicitante.toString())) {
                idsParaRemover.push(uso._id);
            }
        });

        if (idsParaRemover.length > 0) {
            await UsoModelo.deleteMany({ _id: { $in: idsParaRemover } });
            console.log(`🗑️  Removidos ${idsParaRemover.length} agendamentos órfãos (usuário não existe mais).`);
        } else {
            console.log("✅ Nenhum agendamento órfão encontrado.");
        }

        console.log("Limpeza concluída!");
        process.exit(0);
    } catch (error) {
        console.error("Erro na limpeza:", error);
        process.exit(1);
    }
}

limparBanco();