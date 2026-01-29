import usoModelo from "../models/utilizacaomodel.js";

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