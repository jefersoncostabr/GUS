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
            const tenantDbName = req.session?.user?.tenantDbName;
            if (!tenantDbName) {
                return res.status(403).json({ error: 'Administração de estúdios exige um tenant associado.' });
            }
            const estudios = await Estudio.find({
                $or: [{ tenantDbName }, { ownerTenantDbName: tenantDbName }]
            }).lean();

            // Sincroniza Qtd Salas com a contagem real de salas do tenant.
            // Evita exibir número defasado (ex: 1 ou 2 gravados na criação).
            const Sala = req.tenantModels?.Sala;
            if (Sala) {
                const contagem = await Sala.aggregate([
                    { $group: { _id: '$estudioId', total: { $sum: 1 } } }
                ]);
                const mapa = new Map(contagem.map(c => [String(c._id), c.total]));
                for (const e of estudios) {
                    const real = mapa.get(String(e._id)) || 0;
                    // Só atualiza se houver salas reais e o valor gravado estiver defasado
                    if (real > 1 && e.quantidadeSalas !== real) {
                        e.quantidadeSalas = real;
                        await Estudio.updateOne({ _id: e._id }, { $set: { quantidadeSalas: real } });
                    }
                }
            }
            res.status(200).json(estudios);
        } catch (erro) {
            res.status(500).json({ error: `${erro.message} - falha ao listar estúdios` });
        }
    }

    static async criarEstudio(req, res) {
        try {
            const Estudio = getEstudioModel(masterConnection);
            const tenantDbName = req.session?.user?.tenantDbName;
            if (!tenantDbName) {
                return res.status(403).json({ error: 'Não é permitido criar tenants por esta rota.' });
            }
            const novoEstudio = await Estudio.create({
                nome: req.body.nome,
                localizacao: req.body.localizacao,
                quantidadeSalas: req.body.quantidadeSalas,
                ownerTenantDbName: tenantDbName
            });
            res.status(201).json({ message: "Estúdio criado com sucesso", estudio: novoEstudio });
        } catch (erro) {
            res.status(500).json({ error: `${erro.message} - falha ao cadastrar estúdio` });
        }
    }

    static async atualizarEstudio(req, res) {
        try {
            const { id } = req.params;
            const Estudio = getEstudioModel(masterConnection);
            const tenantDbName = req.session?.user?.tenantDbName;
            if (!tenantDbName) {
                return res.status(403).json({ error: 'Administração de estúdios exige um tenant associado.' });
            }
            const atualizacoes = {};
            for (const campo of ['nome', 'localizacao', 'quantidadeSalas']) {
                if (req.body[campo] !== undefined) atualizacoes[campo] = req.body[campo];
            }
            const estudio = await Estudio.findOneAndUpdate(
                { _id: id, $or: [{ tenantDbName }, { ownerTenantDbName: tenantDbName }] },
                atualizacoes,
                { new: true, runValidators: true }
            );
            if (!estudio) return res.status(404).json({ error: 'Estúdio não encontrado neste tenant.' });
            res.status(200).json({ message: "Estúdio atualizado com sucesso" });
        } catch (erro) {
            res.status(500).json({ error: `${erro.message} - falha ao atualizar estúdio` });
        }
    }

    static async deletarEstudio(req, res) {
        try {
            const { id } = req.params;
            const Estudio = getEstudioModel(masterConnection);
            const tenantDbName = req.session?.user?.tenantDbName;
            if (!tenantDbName) {
                return res.status(403).json({ error: 'Administração de estúdios exige um tenant associado.' });
            }
            const estudio = await Estudio.findOne({
                _id: id,
                $or: [{ tenantDbName }, { ownerTenantDbName: tenantDbName }]
            });
            if (!estudio) return res.status(404).json({ error: 'Estúdio não encontrado neste tenant.' });
            if (estudio.tenantDbName === tenantDbName) {
                return res.status(409).json({ error: 'O tenant principal deve ser removido pela gestão da plataforma.' });
            }
            await estudio.deleteOne();
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

            // 2. Define o estúdio principal do tenant como fallback para registros legados sem estudo vinculado.
            const tenantDbName = req.session?.user?.tenantDbName;
            const principalEstudio = tenantDbName
                ? await Estudio.findOne({ tenantDbName }).select('_id nome tenantDbName').lean()
                : null;

            // 3. Extrai os IDs dos estúdios (que estão no Master)
            const estudioIds = [...new Set(salas.map(s => s.estudioId).filter(id => id))];

            // 4. Busca os estúdios correspondentes no Master DB
            const estudios = await Estudio.find({ _id: { $in: estudioIds } }, 'nome').lean();
            const estudioMap = new Map(estudios.map(e => [e._id.toString(), e.nome]));

            // 5. Combina os dados manualmente, usando o estúdio principal do tenant como fallback.
            const salasFormatadas = salas.map(s => {
                const estudioId = s.estudioId ? s.estudioId.toString() : (principalEstudio ? principalEstudio._id.toString() : null);
                const estudioNome = estudioId
                    ? (estudioMap.get(estudioId) || principalEstudio?.nome || 'Principal')
                    : (principalEstudio?.nome || 'Não preenchido');

                return {
                    _id: s._id,
                    numero: s.numero,
                    nome: s.nome,
                    ativo: s.ativo,
                    estudioId: s.estudioId || principalEstudio?._id || null,
                    estudioNome,
                    tipoEstudio: estudioNome.toLowerCase().includes('filial') ? 'Filial' : (estudioNome.toLowerCase().includes('matriz') ? 'Matriz' : 'Principal')
                };
            });

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
            const Sala = req.tenantModels?.Sala;
            const Estudio = getEstudioModel(masterConnection);
            const Solicitante = getSolicitanteModel(masterConnection);

            if (!Aula || !Sala) {
                return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
            }

            // 1. Busca todas as aulas e salas do tenant
            const [aulas, salas] = await Promise.all([
                Aula.find({}).lean(),
                Sala.find({}, 'numero').lean()
            ]);

            // Cria um mapa para associar o ID da sala ao seu número
            const salaMap = new Map(salas.map(s => [s._id.toString(), s.numero]));

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
                sala: a.sala ? (salaMap.get(a.sala.toString()) || a.sala) : 'N/A',
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

    static async atualizarAula(req, res) {
        try {
            const { id } = req.params;
            const Aula = req.tenantModels?.Aula;

            if (!Aula) {
                return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
            }

            const dadosUpdate = { ...req.body };
            delete dadosUpdate.id;
            delete dadosUpdate._id;

            const aulaAtualizada = await Aula.findByIdAndUpdate(id, dadosUpdate, {
                new: true,
                runValidators: true
            });
            if (!aulaAtualizada) {
                return res.status(404).json({ error: 'Aula não encontrada.' });
            }

            res.status(200).json({ message: 'Aula atualizada com sucesso', aula: aulaAtualizada });
        } catch (erro) {
            res.status(500).json({ error: `${erro.message} - falha ao atualizar aula` });
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