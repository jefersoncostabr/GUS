import usoModelo from "../models/utilizacaomodel.js";
import solicitanteModelo from "../models/usuariosmodel.js";

export const listarUsos = async (req, res) => {
    try {
        const { solicitante, sala, dia, hora, motivo } = req.query;
        const query = {};

        // Filtro por nome do solicitante (busca o ID correspondente)
        if (solicitante) {
            const usuarios = await solicitanteModelo.find({ solicitante: { $regex: solicitante, $options: 'i' } });
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

        const totalItems = await usoModelo.countDocuments(query);
        const totalPages = Math.max(1, Math.ceil(totalItems / limit));
        if (page > totalPages) page = totalPages;

        const skip = (page - 1) * limit;
        const listaDeUsos = await usoModelo.find(query)
            .populate({ path: 'solicitante', model: solicitanteModelo })
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
        const uso = await usoModelo.findById(req.params.id).populate({ path: 'solicitante', model: solicitanteModelo });
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
        let idSolicitante = solicitante;
        const usuarioEncontrado = await solicitanteModelo.findOne({ solicitante: solicitante });
        
        if (usuarioEncontrado) {
            idSolicitante = usuarioEncontrado._id;
        }
        
        const uso = await usoModelo.findOne({
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
        const { sala, dia, hora, motivo } = req.body;
        const solicitanteId = req.session.user ? req.session.user._id : null;

        if (!solicitanteId || !sala || !dia || !hora || !motivo) {
            return res.status(400).json({ message: 'Todos os campos devem ser preenchidos.' });
        }
        const novoUso = new usoModelo({
            solicitante: solicitanteId,
            sala,
            dia,
            hora,
            motivo
        });
        await novoUso.save();
        res.status(201).json(novoUso);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const atualizarUso = async (req, res) => {
    try {
        // Filtra apenas os campos permitidos para edição.
        // Isso evita o erro de tentar salvar o NOME (string) no campo SOLICITANTE (ObjectId).
        const { sala, dia, hora, motivo } = req.body;

        const uso = await usoModelo.findByIdAndUpdate(req.params.id, { sala, dia, hora, motivo }, { new: true });
        if (!uso) {
            res.status(404).json({ error: 'Uso não encontrado' });
            return;
        }
        res.status(200).json(uso);
    } catch (err) {
        console.error('Erro ao atualizar uso:', err);
        res.status(500).json({ error: 'Erro ao atualizar uso' });
    }
};

export const deletarUso = async (req, res) => {
    try {
        const uso = await usoModelo.findById(req.params.id);
        if (!uso) {
            res.status(404).json({ error: 'Uso não encontrado' });
            return;
        }
        await usoModelo.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Uso removido com sucesso' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao remover uso' });
    }
};