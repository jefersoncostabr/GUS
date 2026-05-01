/**
 * Controlador de Admin
 * 
 * Refatorado para injeção de dependência:
 * - Modelos são injetados via req.tenantModels pelo middleware de tenant
 * - Para estúdios (Master DB), usamos a conexão Master fornecida por request
 * - Suporta multi-tenant com isolamento automático por banco de dados
 */

import mongoose from 'mongoose';
import { connectToMasterDb } from '../config/connectionFactory.js';
import { getEstudioModel } from '../models/estudiomodel.js';
import { getSolicitanteModel } from '../models/usuariosmodel.js';

// Inicializa conexão Master uma única vez
const masterConnection = mongoose.connection;

class AdminController {
    // --- ESTÚDIOS ---
    static async listarEstudios(req, res) {
        try {
            const Estudio = getEstudioModel(masterConnection);
            const estudios = await Estudio.find({});
            res.status(200).json(estudios);
        } catch (erro) {
            res.status(500).json({ error: `${erro.message} - falha ao listar estúdios` });
        }
    }

    static async criarEstudio(req, res) {
        // Bloqueio temporário de criação de novos estúdios/tenants
        return res.status(403).json({ 
            error: "Opção não disponível. Contate o desenvolvedor da aplicação." 
        });

        /*
        // Código original mantido abaixo para uso do desenvolvedor:
        try {
            const Estudio = getEstudioModel(masterConnection);
            const novoEstudio = await Estudio.create(req.body);
            res.status(201).json({ message: "Estúdio criado com sucesso", estudio: novoEstudio });
        } catch (erro) {
            res.status(500).json({ error: `${erro.message} - falha ao cadastrar estúdio` });
        }
        */
    }

    static async atualizarEstudio(req, res) {
        try {
            const { id } = req.params;
            const Estudio = getEstudioModel(masterConnection);
            await Estudio.findByIdAndUpdate(id, req.body);
            res.status(200).json({ message: "Estúdio atualizado com sucesso" });
        } catch (erro) {
            res.status(500).json({ error: `${erro.message} - falha ao atualizar estúdio` });
        }
    }

    static async deletarEstudio(req, res) {
        try {
            const { id } = req.params;
            const Estudio = getEstudioModel(masterConnection);
            await Estudio.findByIdAndDelete(id);
            res.status(200).json({ message: "Estúdio excluído com sucesso" });
        } catch (erro) {
            res.status(500).json({ error: `${erro.message} - falha ao excluir estúdio` });
        }
    }

    // --- MOTIVOS ---
    static async listarMotivos(req, res) {
        try {
            const Motivos = req.tenantModels?.Motivos;

            if (!Motivos) {
                return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
            }

            const motivos = await Motivos.find({});
            res.status(200).json(motivos);
        } catch (erro) {
            res.status(500).json({ error: `${erro.message} - falha ao listar motivos` });
        }
    }

    static async criarMotivo(req, res) {
        try {
            const Motivos = req.tenantModels?.Motivos;

            if (!Motivos) {
                return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
            }

            const novoMotivo = await Motivos.create(req.body);
            res.status(201).json({ message: "Motivo criado com sucesso", motivo: novoMotivo });
        } catch (erro) {
            res.status(500).json({ error: `${erro.message} - falha ao cadastrar motivo` });
        }
    }

    static async atualizarMotivo(req, res) {
        try {
            const { id } = req.params;
            const Motivos = req.tenantModels?.Motivos;

            if (!Motivos) {
                return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
            }

            await Motivos.findByIdAndUpdate(id, req.body);
            res.status(200).json({ message: "Motivo atualizado com sucesso" });
        } catch (erro) {
            res.status(500).json({ error: `${erro.message} - falha ao atualizar motivo` });
        }
    }

    static async deletarMotivo(req, res) {
        try {
            const { id } = req.params;
            const Motivos = req.tenantModels?.Motivos;

            if (!Motivos) {
                return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
            }

            await Motivos.findByIdAndDelete(id);
            res.status(200).json({ message: "Motivo excluído com sucesso" });
        } catch (erro) {
            res.status(500).json({ error: `${erro.message} - falha ao excluir motivo` });
        }
    }

    // --- SALAS ---
    static async listarSalas(req, res) {
        try {
            const Sala = req.tenantModels?.Sala;
            const Estudio = getEstudioModel(masterConnection);

            if (!Sala) {
                return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
            }

            // 1. Busca todas as salas do tenant
            const salas = await Sala.find({}).lean();

            // 2. Extrai os IDs dos estúdios (que estão no Master)
            const estudioIds = [...new Set(salas.map(s => s.estudioId).filter(id => id))];

            // 3. Busca os estúdios correspondentes no Master DB
            const estudios = await Estudio.find({ _id: { $in: estudioIds } }, 'nome').lean();
            const estudioMap = new Map(estudios.map(e => [e._id.toString(), e.nome]));

            // 4. Combina os dados manualmente
            const salasFormatadas = salas.map(s => ({
                _id: s._id,
                numero: s.numero,
                nome: s.nome,
                ativo: s.ativo,
                estudioId: s.estudioId,
                estudioNome: s.estudioId ? (estudioMap.get(s.estudioId.toString()) || 'Estúdio não encontrado') : 'N/A'
            }));

            res.status(200).json(salasFormatadas);
        } catch (erro) {
            res.status(500).json({ error: `${erro.message} - falha ao listar salas` });
        }
    }

    static async criarSala(req, res) {
        try {
            const Sala = req.tenantModels?.Sala;

            if (!Sala) {
                return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
            }

            const dadosSala = { ...req.body };

            // O frontend pode enviar 'id: null' na criação. Mongoose pode se confundir.
            // É mais seguro remover a propriedade 'id' antes de criar.
            delete dadosSala.id;

            // O frontend envia 'estudio' como o ID. O modelo do banco espera 'estudioId'.
            if (dadosSala.estudio) {
                dadosSala.estudioId = dadosSala.estudio;
                delete dadosSala.estudio;
            }

            const novaSala = await Sala.create(dadosSala);
            res.status(201).json({ message: "Sala criada com sucesso", sala: novaSala });
        } catch (erro) {
            if (erro.code === 11000) {
                // Erro de chave duplicada (estudioId + numero)
                return res.status(409).json({ error: 'Já existe uma sala com este número para o estúdio selecionado.' });
            }
            res.status(500).json({ error: `${erro.message} - falha ao cadastrar sala` });
        }
    }

    static async atualizarSala(req, res) {
        try {
            const { id } = req.params;
            const Sala = req.tenantModels?.Sala;

            if (!Sala) {
                return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
            }

            const dadosUpdate = { ...req.body };
            // O frontend envia 'estudio' como o ID. O modelo do banco espera 'estudioId'.
            if (dadosUpdate.estudio) {
                dadosUpdate.estudioId = dadosUpdate.estudio;
                delete dadosUpdate.estudio;
            }

            await Sala.findByIdAndUpdate(id, dadosUpdate);
            res.status(200).json({ message: "Sala atualizada com sucesso" });
        } catch (erro) {
            if (erro.code === 11000) {
                // Erro de chave duplicada (estudioId + numero)
                return res.status(409).json({ error: 'Já existe uma sala com este número para o estúdio selecionado.' });
            }
            res.status(500).json({ error: `${erro.message} - falha ao atualizar sala` });
        }
    }

    static async deletarSala(req, res) {
        try {
            const { id } = req.params;
            const Sala = req.tenantModels?.Sala;

            if (!Sala) {
                return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
            }

            await Sala.findByIdAndDelete(id);
            res.status(200).json({ message: "Sala excluída com sucesso" });
        } catch (erro) {
            res.status(500).json({ error: `${erro.message} - falha ao excluir sala` });
        }
    }

    // --- AULAS REGULARES ---
    static async listarAulas(req, res) {
        try {
            const Aula = req.tenantModels?.Aula;
            const Estudio = getEstudioModel(masterConnection);
            const Solicitante = getSolicitanteModel(masterConnection);

            if (!Aula) {
                return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
            }

            // 1. Busca todas as aulas do tenant
            const aulas = await Aula.find({}).lean();

            // 2. Extrai IDs de estúdios e professores (Master DB)
            const estudioIds = [...new Set(aulas.map(a => a.estudio).filter(id => id))];
            const professorIds = [...new Set(aulas.map(a => a.professor).filter(id => id))];

            // 3. Busca os dados correspondentes no Master DB
            const [estudios, professores] = await Promise.all([
                Estudio.find({ _id: { $in: estudioIds } }, 'nome').lean(),
                Solicitante.find({ _id: { $in: professorIds } }, 'solicitante').lean()
            ]);
            const estudioMap = new Map(estudios.map(e => [e._id.toString(), e.nome]));
            const professorMap = new Map(professores.map(p => [p._id.toString(), p.solicitante]));

            // 4. Combina os dados manualmente
            const aulasFormatadas = aulas.map(a => ({
                _id: a._id,
                estudioNome: a.estudio ? (estudioMap.get(a.estudio.toString()) || 'N/A') : 'N/A',
                estudioId: a.estudio,
                sala: a.sala,
                diaSemana: a.diaSemana,
                horaInicio: a.horaInicio,
                modalidade: a.modalidade,
                professorNome: a.professor ? (professorMap.get(a.professor.toString()) || 'N/A') : 'N/A',
                professorId: a.professor
            }));

            res.status(200).json(aulasFormatadas);
        } catch (erro) {
            res.status(500).json({ error: `${erro.message} - falha ao listar aulas` });
        }
    }

    static async criarAula(req, res) {
        try {
            const Aula = req.tenantModels?.Aula;

            if (!Aula) {
                return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
            }

            const novaAula = await Aula.create(req.body);
            res.status(201).json({ message: "Aula criada com sucesso", aula: novaAula });
        } catch (erro) {
            res.status(500).json({ error: `${erro.message} - falha ao cadastrar aula` });
        }
    }

    static async deletarAula(req, res) {
        try {
            const { id } = req.params;
            const Aula = req.tenantModels?.Aula;

            if (!Aula) {
                return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
            }

            await Aula.findByIdAndDelete(id);
            res.status(200).json({ message: "Aula excluída com sucesso" });
        } catch (erro) {
            res.status(500).json({ error: `${erro.message} - falha ao excluir aula` });
        }
    }
}

export default AdminController;