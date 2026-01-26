import EstudioModelo from "../models/estudioModel.js";
import MotivoModelo from "../models/motivosmodel.js";
import SalaModelo from "../models/salaModel.js";
import AulaModelo from "../models/aulaModel.js";

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

    static async atualizarMotivo(req, res) {
        try {
            const { id } = req.params;
            await MotivoModelo.findByIdAndUpdate(id, req.body);
            res.status(200).json({ message: "Motivo atualizado com sucesso" });
        } catch (erro) {
            res.status(500).json({ message: `${erro.message} - falha ao atualizar motivo` });
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

    // --- SALAS ---
    static async listarSalas(req, res) {
        try {
            const salas = await SalaModelo.find({}).populate('estudioId', 'nome');
            // Formata para o frontend que espera estudioNome
            const salasFormatadas = salas.map(s => ({
                _id: s._id,
                numero: s.numero,
                nome: s.nome,
                ativo: s.ativo,
                estudioId: s.estudioId ? s.estudioId._id : null,
                estudioNome: s.estudioId ? s.estudioId.nome : 'N/A'
            }));
            res.status(200).json(salasFormatadas);
        } catch (erro) {
            res.status(500).json({ message: `${erro.message} - falha ao listar salas` });
        }
    }

    static async criarSala(req, res) {
        try {
            const novaSala = await SalaModelo.create(req.body);
            res.status(201).json({ message: "Sala criada com sucesso", sala: novaSala });
        } catch (erro) {
            res.status(500).json({ message: `${erro.message} - falha ao cadastrar sala` });
        }
    }

    static async atualizarSala(req, res) {
        try {
            const { id } = req.params;
            await SalaModelo.findByIdAndUpdate(id, req.body);
            res.status(200).json({ message: "Sala atualizada com sucesso" });
        } catch (erro) {
            res.status(500).json({ message: `${erro.message} - falha ao atualizar sala` });
        }
    }

    static async deletarSala(req, res) {
        try {
            const { id } = req.params;
            await SalaModelo.findByIdAndDelete(id);
            res.status(200).json({ message: "Sala excluída com sucesso" });
        } catch (erro) {
            res.status(500).json({ message: `${erro.message} - falha ao excluir sala` });
        }
    }

    // --- AULAS REGULARES ---
    static async listarAulas(req, res) {
        try {
            const aulas = await AulaModelo.find({})
                .populate('estudio', 'nome')
                .populate('professor', 'solicitante');
            
            // Formatação para facilitar o consumo no frontend (evita [object Object])
            const aulasFormatadas = aulas.map(a => ({
                _id: a._id,
                estudioNome: a.estudio ? a.estudio.nome : 'N/A',
                estudioId: a.estudio ? a.estudio._id : null,
                sala: a.sala,
                diaSemana: a.diaSemana,
                horaInicio: a.horaInicio,
                modalidade: a.modalidade,
                professorNome: a.professor ? a.professor.solicitante : 'N/A',
                professorId: a.professor ? a.professor._id : null
            }));

            res.status(200).json(aulasFormatadas);
        } catch (erro) {
            res.status(500).json({ message: `${erro.message} - falha ao listar aulas` });
        }
    }

    static async criarAula(req, res) {
        try {
            const novaAula = await AulaModelo.create(req.body);
            res.status(201).json({ message: "Aula criada com sucesso", aula: novaAula });
        } catch (erro) {
            res.status(500).json({ message: `${erro.message} - falha ao cadastrar aula` });
        }
    }

    static async deletarAula(req, res) {
        try {
            const { id } = req.params;
            await AulaModelo.findByIdAndDelete(id);
            res.status(200).json({ message: "Aula excluída com sucesso" });
        } catch (erro) {
            res.status(500).json({ message: `${erro.message} - falha ao excluir aula` });
        }
    }
}

export default AdminController;