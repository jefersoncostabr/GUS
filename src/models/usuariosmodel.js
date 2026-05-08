import mongoose from 'mongoose';

const solicitanteSchema = new mongoose.Schema(
    {
        solicitante: {
            type: String,
            required: [true, 'O nome do solicitante é obrigatório.'],
            unique: true,
            trim: true
        },
            email: {
            type: String,
            required: [true, 'Email é obrigatório'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Por favor, insira um email válido']
        },
        senha: {
            type: String,
            required: [true, 'A senha é obrigatória.']
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user'
        },
        // Campo para identificar o banco de dados do tenant associado a este usuário.
        tenantDbName: {
            type: String,
            trim: true
        },
        // Associação com o Estúdio (banco Master)
        estudio: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Estudio'
        },
        passwordResetToken: {
            type: String,
            select: false
        },
        passwordResetExpires: {
            type: Date,
            select: false
        }
    },
    { versionKey: false }
);

/**
 * Retorna o modelo 'Solicitante' compilado para uma conexão específica.
 * Este modelo pertence ao banco MASTER.
 * @param {mongoose.Connection} connection - A instância de conexão do Mongoose (deve ser a do Master DB).
 * @returns {mongoose.Model} O modelo Solicitante.
 */
export const getSolicitanteModel = (connection) => 
    connection.models.Solicitante || connection.model('Solicitante', solicitanteSchema);