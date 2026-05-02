import mongoose from 'mongoose';

const estudioSchema = new mongoose.Schema(
    {
        nome: {
            type: String,
            required: [true, 'O nome do estúdio é obrigatório.'],
            trim: true,
            unique: true, // Impede a criação de estúdios com o mesmo nome
            maxlength: [100, 'O nome do estúdio não pode exceder 100 caracteres.']
        },
        tenantDbName: {
            type: String,
            trim: true,
            unique: true // Cada estúdio deve ter seu próprio banco exclusivo
        },
        localizacao: {
            type: String,
            trim: true,
            maxlength: [200, 'A localização não pode exceder 200 caracteres.']
        },
        ativo: {
            type: Boolean,
            default: true
        },
        quantidadeSalas: { // Novo campo para a quantidade total de salas do estúdio
            type: Number,
            required: [true, 'A quantidade de salas é obrigatória.'],
            default: 1
        }
    },
    { 
        versionKey: false,
        timestamps: true // Adiciona createdAt e updatedAt automaticamente
    }
);

/**
 * Retorna o modelo 'Estudio' compilado para uma conexão específica.
 * Este modelo pertence ao banco MASTER.
 * @param {mongoose.Connection} connection - A instância de conexão do Mongoose (deve ser a do Master DB).
 * @returns {mongoose.Model} O modelo Estudio.
 */
export const getEstudioModel = (connection) => {
    return connection.model('Estudio', estudioSchema);
};

// Compatibilidade: export default para imports que esperam default
export default getEstudioModel;