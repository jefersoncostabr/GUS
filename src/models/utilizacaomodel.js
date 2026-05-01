import mongoose from 'mongoose';

const usoSchema = new mongoose.Schema(
    {
        // O solicitante agora é apenas um ID, pois o objeto completo está no banco Master.
        // O 'ref' é omitido pois a referência cruza bancos de dados distintos.
        solicitante: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        sala: {
            type: String,
            required: true
        },
        dia: {
            type: String,
            required: true
        },
        hora: {
            type: String,
            required: true
        },
        motivo: {
            type: String,
            required: true
        }
    },
    { versionKey: false }
);

// Índice composto para evitar duplicidade: impede dois agendamentos na mesma sala, no mesmo dia e horário.
// Isso é vital para a integridade em produção.
usoSchema.index({ sala: 1, dia: 1, hora: 1 }, { unique: true });

/**
 * Retorna o modelo 'Uso' compilado para uma conexão de tenant específica.
 * @param {mongoose.Connection} connection - A instância de conexão do Mongoose para um tenant.
 * @returns {mongoose.Model} O modelo Uso.
 */
export const getUsoModel = (connection) => {
    return connection.model('Uso', usoSchema);
};

/**
 * Alias para compatibilidade com tenantMiddleware
 */
export const getUtilizacaoModel = (connection) => {
    return connection.model('Uso', usoSchema);
};