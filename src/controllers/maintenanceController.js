/**
 * Controlador de Manutenção
 * 
 * Refatorado para injeção de dependência:
 * - Modelos são injetados via req.tenantModels pelo middleware de tenant
 * - Suporta multi-tenant com isolamento automático por banco de dados
 * 
 * IMPORTANTE: A operação "limpar tudo" limpa apenas o banco do tenant,
 * protegendo dados do banco Master (usuários, etc.).
 */

import mongoose from 'mongoose';
import { getSolicitanteModel } from '../models/usuariosmodel.js';
import { getEstudioModel } from '../models/estudiomodel.js';

const masterConnection = mongoose.connection;

class MaintenanceController {
    static async limparSolicitantes(req, res) {
        try {
            const Solicitante = getSolicitanteModel(masterConnection);
            await Solicitante.deleteMany({});
            res.status(200).json({ message: "Todos os solicitantes foram removidos." });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async limparUsos(req, res) {
        try {
            const Utilizacao = req.tenantModels?.Utilizacao;

            if (!Utilizacao) {
                return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
            }

            await Utilizacao.deleteMany({});
            res.status(200).json({ message: "Todos os usos foram removidos." });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async limparEstudios(req, res) {
        try {
            const Estudio = getEstudioModel(masterConnection);
            await Estudio.deleteMany({});
            res.status(200).json({ message: "Todos os estúdios foram removidos." });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async limparMotivos(req, res) {
        try {
            const Motivos = req.tenantModels?.Motivos;

            if (!Motivos) {
                return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
            }

            await Motivos.deleteMany({});
            res.status(200).json({ message: "Todos os motivos foram removidos." });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async limparSalas(req, res) {
        try {
            const Sala = req.tenantModels?.Sala;

            if (!Sala) {
                return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
            }

            await Sala.deleteMany({});
            res.status(200).json({ message: "Todas as salas foram removidas." });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async limparAulas(req, res) {
        try {
            const Aula = req.tenantModels?.Aula;

            if (!Aula) {
                return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
            }

            await Aula.deleteMany({});
            res.status(200).json({ message: "Todas as aulas foram removidas." });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async limparTudo(req, res) {
        try {
            const Aula = req.tenantModels?.Aula;
            const Sala = req.tenantModels?.Sala;
            const Utilizacao = req.tenantModels?.Utilizacao;
            const Motivos = req.tenantModels?.Motivos;

            if (!Aula || !Sala || !Utilizacao || !Motivos) {
                return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
            }

            // Executa as limpezas sequencialmente APENAS no banco do tenant
            // Proteção: O banco Master (usuários) NÃO é tocado
            await Aula.deleteMany({});
            await Sala.deleteMany({});
            await Utilizacao.deleteMany({});
            await Motivos.deleteMany({});

            res.status(200).json({ 
                message: `Banco de dados do tenant ${req.tenantId} completamente limpo (todas as coleções, exceto usuários do Master).` 
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

export default MaintenanceController;