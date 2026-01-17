import EstudioModelo from "../models/estudiomodel.js";
import MotivoModelo from "../models/motivosmodel.js";
import ConfigModelo from "../models/configmodel.js";

class AdminController {
    // --- ESTÚDIOS ---
    static async listarEstudios(req, res) {
        try {
            const estudios = await EstudioModelo.find({});
            res.status(200).json(estudios);
        } catch (erro) {
            res.status(500).json({ message: `${erro.message} - falha ao listar estúdios` });
        }
    }

    static async criarEstudio(req, res) {
        try {
            const novoEstudio = await EstudioModelo.create(req.body);
            res.status(201).json({ message: "Estúdio criado com sucesso", estudio: novoEstudio });
        } catch (erro) {
            res.status(500).json({ message: `${erro.message} - falha ao cadastrar estúdio` });
        }
    }

    static async atualizarEstudio(req, res) {
        try {
            const { id } = req.params;
            await EstudioModelo.findByIdAndUpdate(id, req.body);
            res.status(200).json({ message: "Estúdio atualizado com sucesso" });
        } catch (erro) {
            res.status(500).json({ message: `${erro.message} - falha ao atualizar estúdio` });
        }
    }

    static async deletarEstudio(req, res) {
        try {
            const { id } = req.params;
            await EstudioModelo.findByIdAndDelete(id);
            res.status(200).json({ message: "Estúdio excluído com sucesso" });
        } catch (erro) {
            res.status(500).json({ message: `${erro.message} - falha ao excluir estúdio` });
        }
    }

    // --- MOTIVOS ---
    static async listarMotivos(req, res) {
        try {
            const motivos = await MotivoModelo.find({});
            res.status(200).json(motivos);
        } catch (erro) {
            res.status(500).json({ message: `${erro.message} - falha ao listar motivos` });
        }
    }

    static async criarMotivo(req, res) {
        try {
            const novoMotivo = await MotivoModelo.create(req.body);
            res.status(201).json({ message: "Motivo criado com sucesso", motivo: novoMotivo });
        } catch (erro) {
            res.status(500).json({ message: `${erro.message} - falha ao cadastrar motivo` });
        }
    }

    static async deletarMotivo(req, res) {
        try {
            const { id } = req.params;
            await MotivoModelo.findByIdAndDelete(id);
            res.status(200).json({ message: "Motivo excluído com sucesso" });
        } catch (erro) {
            res.status(500).json({ message: `${erro.message} - falha ao excluir motivo` });
        }
    }
    
    // --- CONFIGURAÇÕES GERAIS ---
    static async listarConfig(req, res) {
        try {
            // Busca a config geral ou cria se não existir (Upsert manual)
            let config = await ConfigModelo.findOne({ chave: "geral" });
            if (!config) {
                config = await ConfigModelo.create({ chave: "geral" });
            }
            res.status(200).json(config);
        } catch (erro) {
            res.status(500).json({ message: `${erro.message} - falha ao buscar configurações` });
        }
    }

    static async atualizarConfig(req, res) {
        try {
            const config = await ConfigModelo.findOneAndUpdate({ chave: "geral" }, req.body, { new: true, upsert: true });
            res.status(200).json({ message: "Configurações atualizadas", config });
        } catch (erro) {
            res.status(500).json({ message: `${erro.message} - falha ao atualizar configurações` });
        }
    }
}

export default AdminController;