import usoModelo from "../models/utilizacaomodel.js";
import AulaModelo from "../models/aulaModel.js";
import solicitanteModelo from "../models/usuariosmodel.js";

/**
 * Busca e retorna todos os agendamentos (usos) da semana corrente.
 * A semana é calculada de Domingo a Sábado.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const getAgendamentosSemana = async (req, res) => {
    try {
        const hoje = new Date();
        // Ajusta para o início da semana (considerando domingo como dia 0)
        const primeiroDia = hoje.getDate() - hoje.getDay();
        const primeiroDiaSemana = new Date(new Date().setDate(primeiroDia));

        const diasDaSemanaFormatados = Array.from({ length: 7 }, (_, i) => {
            const diaAtual = new Date(primeiroDiaSemana);
            diaAtual.setDate(diaAtual.getDate() + i);
            return `${String(diaAtual.getDate()).padStart(2, '0')}/${String(diaAtual.getMonth() + 1).padStart(2, '0')}`;
        });

        const agendamentos = await usoModelo.find({ dia: { $in: diasDaSemanaFormatados } })
            .populate('solicitante', 'solicitante email');

        res.status(200).json(agendamentos);
    } catch (error) {
        console.error("Erro ao buscar agendamentos da semana:", error);
        res.status(500).json({ error: 'Erro interno ao processar relatório.' });
    }
};

/**
 * Busca e retorna todos os usuários (professores) cadastrados.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const getTodosProfessores = async (req, res) => {
    try {
        // Busca todos os usuários, excluindo o campo de senha por segurança
        const professores = await solicitanteModelo.find({}, '-senha');
        res.status(200).json(professores);
    } catch (error) {
        console.error("Erro ao buscar lista de professores:", error);
        res.status(500).json({ error: 'Erro interno ao processar relatório.' });
    }
};

/**
 * Busca e retorna todas as aulas regulares cadastradas.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const getAulasRegulares = async (req, res) => {
    try {
        const aulas = await AulaModelo.find({}).populate('estudio', 'nome').populate('professor', 'solicitante');
        res.status(200).json(aulas);
    } catch (error) {
        console.error("Erro ao buscar aulas regulares:", error);
        res.status(500).json({ error: 'Erro interno ao processar relatório.' });
    }
};

/**
 * Busca e retorna todos os agendamentos (usos) do mês corrente.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const getAgendamentosMes = async (req, res) => {
    try {
        const hoje = new Date();
        const mesAtual = hoje.getMonth(); // 0 a 11
        const anoAtual = hoje.getFullYear();
        const totalDias = new Date(anoAtual, mesAtual + 1, 0).getDate(); // Último dia do mês

        const diasDoMesFormatados = Array.from({ length: totalDias }, (_, i) => {
            return `${String(i + 1).padStart(2, '0')}/${String(mesAtual + 1).padStart(2, '0')}`;
        });

        const agendamentos = await usoModelo.find({ dia: { $in: diasDoMesFormatados } })
            .populate('solicitante', 'solicitante email');

        res.status(200).json(agendamentos);
    } catch (error) {
        console.error("Erro ao buscar agendamentos do mês:", error);
        res.status(500).json({ error: 'Erro interno ao processar relatório.' });
    }
};

/**
 * Busca e retorna todos os agendamentos (usos) de um professor (solicitante) específico.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const getUsosPorProfessor = async (req, res) => {
    try {
        const { id } = req.params;
        
        const agendamentos = await usoModelo.find({ solicitante: id })
            .populate('solicitante', 'solicitante email');

        res.status(200).json(agendamentos);
    } catch (error) {
        console.error("Erro ao buscar usos por professor:", error);
        res.status(500).json({ error: 'Erro interno ao processar relatório.' });
    }
};