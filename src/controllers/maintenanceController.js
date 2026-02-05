import SolicitanteModelo from "../models/usuariosmodel.js";
import UsoModelo from "../models/utilizacaomodel.js";
import EstudioModelo from "../models/estudiomodel.js";
import MotivoModelo from "../models/motivosmodel.js";
import SalaModelo from "../models/salaModel.js";
import AulaModelo from "../models/aulaModel.js";

class MaintenanceController {
    static async limparSolicitantes(req, res) {
        try {
            await SolicitanteModelo.deleteMany({});
            res.status(200).json({ message: "Todos os solicitantes foram removidos." });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async limparUsos(req, res) {
        try {
            await UsoModelo.deleteMany({});
            res.status(200).json({ message: "Todos os usos foram removidos." });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async limparEstudios(req, res) {
        try {
            await EstudioModelo.deleteMany({});
            res.status(200).json({ message: "Todos os estúdios foram removidos." });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async limparMotivos(req, res) {
        try {
            await MotivoModelo.deleteMany({});
            res.status(200).json({ message: "Todos os motivos foram removidos." });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async limparSalas(req, res) {
        try {
            await SalaModelo.deleteMany({});
            res.status(200).json({ message: "Todas as salas foram removidas." });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async limparAulas(req, res) {
        try {
            await AulaModelo.deleteMany({});
            res.status(200).json({ message: "Todas as aulas foram removidas." });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async limparTudo(req, res) {
        try {
            // Executa as limpezas sequencialmente
            await AulaModelo.deleteMany({});
            await SalaModelo.deleteMany({});
            await UsoModelo.deleteMany({});
            await SolicitanteModelo.deleteMany({});
            await EstudioModelo.deleteMany({});
            await MotivoModelo.deleteMany({});

            res.status(200).json({ message: "Banco de dados completamente limpo (todas as coleções)." });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

export default MaintenanceController;