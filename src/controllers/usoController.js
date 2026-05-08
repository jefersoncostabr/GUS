/**
 * Controlador de Usos
 * 
 * Refatorado para injeção de dependência:
 * - Modelos são injetados via req.tenantModels pelo middleware de tenant
 * - Suporta multi-tenant com isolamento automático por banco de dados
 */

import mongoose from 'mongoose';
import { getSolicitanteModel } from '../models/usuariosmodel.js';

/**
 * Normaliza qualquer formato de data recebido para DD/MM/AA.
 * Aceita: YYYY-MM-DD, DD/MM/AAAA, D/M/AAAA, DD/MM/AA, ISO com hora.
 */
function normalizarDia(valorDia) {
    if (!valorDia || typeof valorDia !== 'string') return valorDia;

    let dia, mes, ano;

    // ISO com ou sem hora: 2026-05-07 ou 2026-05-07T...
    if (/^\d{4}-\d{2}-\d{2}/.test(valorDia)) {
        const parte = valorDia.slice(0, 10);
        [ano, mes, dia] = parte.split('-');
    }
    // Formatos com barra: D/M/AA, D/M/AAAA, DD/MM/AA, DD/MM/AAAA
    else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(valorDia)) {
        [dia, mes, ano] = valorDia.split('/');
    }
    else {
        return valorDia; // formato desconhecido — devolve sem alterar
    }

    const aaaa = ano.length === 4 ? ano.slice(-2) : ano.padStart(2, '0');
    return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${aaaa}`;
}

export const listarUsos = async (req, res) => {
    try {
        // Extrai os modelos injetados pelo tenantMiddleware
        const Uso = req.tenantModels?.Utilizacao;
        // Usuários sempre vêm do Master
        const Solicitante = getSolicitanteModel(mongoose.connection);

        if (!Uso) {
            return res.status(500).json({ error: 'Modelo de Utilização não inicializado.' });
        }

        const { solicitante, sala, dia, hora, motivo } = req.query;
        const query = {};

        // Filtro por nome do solicitante (busca o ID correspondente)
        if (solicitante) {
            const usuarios = await Solicitante.find({ solicitante: { $regex: solicitante, $options: 'i' } });
            const idsUsuarios = usuarios.map(u => u._id);
            query.solicitante = { $in: idsUsuarios };
        }
        if (sala) query.sala = sala;
        if (dia) query.dia = dia;
        if (hora) query.hora = hora;
        if (motivo) query.motivo = motivo;

        // Paginação
        let page = parseInt(req.query.page, 10) || 1;
        let limit = parseInt(req.query.limit, 10) || 5;
        const maxLimit = 100;
        if (limit > maxLimit) limit = maxLimit;
        if (page < 1) page = 1;

        const totalItems = await Uso.countDocuments(query);
        const totalPages = Math.max(1, Math.ceil(totalItems / limit));
        if (page > totalPages) page = totalPages;

        const skip = (page - 1) * limit;
        const listaDeUsos = await Uso.find(query)
            .populate({
                path: 'solicitante',
                model: Solicitante
            })
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            data: listaDeUsos,
            page,
            limit,
            totalItems,
            totalPages
        });
    } catch (error) {
        console.error('Erro ao buscar usos paginados:', error);
        res.status(500).json({ error: 'Erro ao buscar usos' });
    }
};

export const buscarUsoPorId = async (req, res) => {
    try {
        const Uso = req.tenantModels?.Utilizacao;
        const Solicitante = getSolicitanteModel(mongoose.connection);

        if (!Uso) {
            return res.status(500).json({ error: 'Modelo de Utilização não inicializado.' });
        }

        const uso = await Uso.findById(req.params.id).populate({
            path: 'solicitante',
            model: Solicitante
        });
        if (!uso) {
            res.status(404).json({ message: 'Uso não encontrado com esse id' });
        } else {
            res.status(200).json(uso);
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar uso' });
    }
};

export const buscarIdUso = async (req, res) => {
    const { solicitante, sala, dia, hora, motivo } = req.query;
    if (!solicitante || !sala || !dia || !hora) {
        return res.status(400).json({ error: 'Parâmetros obrigatórios não fornecidos' });
    }
    try {
        const Uso = req.tenantModels?.Utilizacao;
        // Alterado para buscar sempre no Master
        const Solicitante = getSolicitanteModel(mongoose.connection);

        if (!Uso) {
            return res.status(500).json({ error: 'Modelo de Utilização não inicializado.' });
        }

        let idSolicitante = solicitante;
        const usuarioEncontrado = await Solicitante.findOne({ solicitante: solicitante });
        
        if (usuarioEncontrado) {
            idSolicitante = usuarioEncontrado._id;
        }
        
        const uso = await Uso.findOne({
            solicitante: idSolicitante,
            sala: Number(sala),
            dia: Number(dia),
            hora: Number(hora),
            motivo
        });
        if (!uso) {
            return res.status(404).json({ message: 'Uso não encontrado' });
        }
        res.status(200).json({ id: uso._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar uso' });
    }
};

export const criarUso = async (req, res) => {
    try {
        const Uso = req.tenantModels?.Utilizacao;

        if (!Uso) {
            return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
        }

        const { sala, dia, hora, motivo } = req.body;
        const solicitanteId = req.session.user ? req.session.user._id : null;

        if (!solicitanteId || !sala || !dia || !hora || !motivo) {
            return res.status(400).json({ message: 'Todos os campos devem ser preenchidos.' });
        }
        const novoUso = new Uso({
            solicitante: solicitanteId,
            sala,
            dia: normalizarDia(dia),
            hora,
            motivo
        });
        await novoUso.save();
        res.status(201).json(novoUso);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Conflito: Já existe um agendamento para esta sala, dia e horário.' });
        }
        res.status(500).json({ message: 'Erro interno ao criar agendamento.' });
    }
};

export const atualizarUso = async (req, res) => {
    try {
        const Uso = req.tenantModels?.Utilizacao;

        if (!Uso) {
            return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
        }

        // Filtra apenas os campos permitidos para edição.
        // Isso evita o erro de tentar salvar o NOME (string) no campo SOLICITANTE (ObjectId).
        const { sala, dia, hora, motivo } = req.body;

        const uso = await Uso.findByIdAndUpdate(req.params.id, { sala, dia: normalizarDia(dia), hora, motivo }, { new: true, runValidators: true });
        if (!uso) {
            res.status(404).json({ error: 'Uso não encontrado' });
            return;
        }
        res.status(200).json(uso);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: 'Conflito: O novo horário solicitado já está ocupado.' });
        }
        console.error('Erro ao atualizar uso:', err);
        res.status(500).json({ error: 'Erro ao atualizar uso' });
    }
};

export const deletarUso = async (req, res) => {
    try {
        const Uso = req.tenantModels?.Utilizacao;

        if (!Uso) {
            return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
        }

        const uso = await Uso.findById(req.params.id);
        if (!uso) {
            res.status(404).json({ error: 'Uso não encontrado' });
            return;
        }
        await Uso.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Uso removido com sucesso' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao remover uso' });
    }
};

export const criarDezUsosTeste = async (req, res) => {
    try {
        const Uso = req.tenantModels?.Utilizacao;
        const Sala = req.tenantModels?.Sala;
        const Motivos = req.tenantModels?.Motivos;

        if (!Uso || !Sala || !Motivos) {
            return res.status(500).json({ error: 'Modelos de tenant não inicializados.' });
        }

        const solicitanteId = req.session?.user?._id;
        if (!solicitanteId) {
            return res.status(401).json({ error: 'Usuário não autenticado.' });
        }

        const { estudioId } = req.body || {};
        const filtroSala = estudioId ? { estudioId } : {};
        const salas = await Sala.find(filtroSala).sort({ numero: 1 }).lean();

        if (!salas.length) {
            return res.status(400).json({
                error: 'Nenhuma sala encontrada para gerar os usos de teste.',
                detalhe: estudioId
                    ? 'Verifique se o estudioId informado possui salas cadastradas.'
                    : 'Cadastre ao menos uma sala antes de usar esta rota.'
            });
        }

        const motivos = await Motivos.find({}).lean();
        const motivosDisponiveis = motivos.length
            ? motivos.map((m) => m.motivo)
            : ['Teste automático'];

        const totalDesejado = 10;
        const horasCheias = [
            '08:00', '09:00', '10:00', '11:00', '12:00',
            '13:00', '14:00', '15:00', '16:00', '17:00',
            '18:00', '19:00', '20:00', '21:00', '22:00'
        ];

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const formatarDia = (data) => {
            const y = data.getFullYear();
            const m = String(data.getMonth() + 1).padStart(2, '0');
            const d = String(data.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        const usadosNoLote = new Set();
        const novosUsos = [];

        // Procura combinações válidas em até 60 dias para evitar loop infinito.
        for (let offsetDia = 0; offsetDia < 60 && novosUsos.length < totalDesejado; offsetDia += 1) {
            const data = new Date(hoje);
            data.setDate(hoje.getDate() + offsetDia);
            const dia = formatarDia(data);

            for (const sala of salas) {
                for (const hora of horasCheias) {
                    if (novosUsos.length >= totalDesejado) break;

                    const numeroSala = String(sala.numero);
                    const chaveLote = `${estudioId || sala.estudioId}|${numeroSala}|${dia}|${hora}`;
                    if (usadosNoLote.has(chaveLote)) continue;

                    const conflito = await Uso.exists({
                        sala: numeroSala,
                        dia,
                        hora
                    });

                    if (conflito) continue;

                    usadosNoLote.add(chaveLote);
                    novosUsos.push({
                        solicitante: solicitanteId,
                        sala: numeroSala,
                        dia,
                        hora,
                        motivo: motivosDisponiveis[novosUsos.length % motivosDisponiveis.length]
                    });
                }
            }
        }

        if (novosUsos.length < totalDesejado) {
            return res.status(409).json({
                error: 'Não foi possível gerar 10 usos sem conflito.',
                gerados: novosUsos.length,
                detalhe: 'Libere horários/salas ou informe outro estudioId e tente novamente.'
            });
        }

        const criados = await Uso.insertMany(novosUsos, { ordered: true });

        return res.status(201).json({
            message: '10 usos de teste criados com sucesso.',
            totalCriado: criados.length,
            estudioId: estudioId || null,
            itens: criados
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                error: 'Conflito de duplicidade ao criar usos de teste. Tente novamente.'
            });
        }

        console.error('Erro ao criar usos de teste:', error);
        return res.status(500).json({ error: 'Erro interno ao gerar usos de teste.' });
    }
};