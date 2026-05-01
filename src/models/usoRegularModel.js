/**
 * ESTE ARQUIVO FOI DEPRECIADO.
 * A lógica foi consolidada em 'utilizacaomodel.js' para evitar duplicidade.
 * Mantido apenas para compatibilidade de importação.
 */
import { getUtilizacaoModel } from "./utilizacaomodel.js";

/**
 * Proxy para o modelo consolidado.
 * @param {mongoose.Connection} connection - A instância de conexão do Mongoose para um tenant.
 */
export const getUsoRegularModel = (connection) => getUtilizacaoModel(connection);

// Compatibilidade: export default para imports que esperam default
export default getUsoRegularModel;
