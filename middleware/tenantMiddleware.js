import { getTenantConnection } from '../src/config/connectionFactory.js';
import mongoose from 'mongoose';

// Importar as funções que retornam os modelos
import { getSolicitanteModel } from '../src/models/usuariosmodel.js';
import { getUsoRegularModel } from '../src/models/usoRegularModel.js';
import { getSalaModel } from '../src/models/salaModel.js';
import { getAulaModel } from '../src/models/aulaModel.js';
import { getMotivosModel } from '../src/models/motivosmodel.js';

/**
 * Middleware de Identificação de Tenant
 * 
 * Este middleware:
 * 1. Verifica se o usuário está autenticado
 * 2. Obtém o tenantId do usuário logado
 * 3. Conecta ao banco de dados do tenant
 * 4. Injeta os modelos do tenant em req.tenantModels
 * 
 * Deve ser aplicado APÓS o middleware de autenticação.
 * 
 * Uso:
 *   app.use(authMiddleware);
 *   app.use(tenantMiddleware);
 */
export default async function tenantMiddleware(req, res, next) {
    try {
        // Verifica se o usuário está autenticado
        if (!req.session || !req.session.user) {
            // Se não estiver autenticado, pula para a próxima middleware/rota
            // Rotas públicas como /login não precisam de tenant
            return next();
        }

        const user = req.session.user;

        // Obtém o ID do tenant a partir do campo tenantDbName do usuário
        // Se o usuário não tiver tenantDbName, significa que é um admin global ou ainda não foi provisionado
        if (!user.tenantDbName) {
            console.warn(`Usuário ${user.solicitante} não possui tenantDbName associado.`);
            // Você pode optar por rejeitar ou permitir prosseguir sem tenant
            // Por enquanto, permitiremos prosseguir (útil para admins)
            return next();
        }

        // Extrai o tenantId do tenantDbName
        // Ex: "gus_tenant_estudio_a" -> "estudio_a"
        const dbNamePrefix = 'gus_tenant_';
        const tenantId = user.tenantDbName.startsWith(dbNamePrefix)
            ? user.tenantDbName.slice(dbNamePrefix.length)
            : user.tenantDbName;

        // Obtém a conexão do tenant usando a Connection Factory
        // Antes de solicitar a conexão, verifique se o tenantId ainda é válido.
        // Em casos onde a sessão está stale (nome antigo muito longo), podemos
        // tentar recarregar o valor correto do usuário no Master e atualizar a
        // sessão automaticamente para evitar o erro fatal.
        if (tenantId.length > 38) {
            try {
                console.warn('tenantId do usuário excede 38 caracteres, tentando corrigir via DB');
                const masterConn = mongoose.connection;
                const SolicitanteModel = getSolicitanteModel(masterConn);
                const fresh = await SolicitanteModel.findById(user._id).lean();
                if (fresh && fresh.tenantDbName && fresh.tenantDbName.length <= 38) {
                    console.log('Atualizando sessão com tenantDbName corrigido:', fresh.tenantDbName);
                    req.session.user.tenantDbName = fresh.tenantDbName;
                    // recalcula tenantId
                    const corrected = fresh.tenantDbName.startsWith(dbNamePrefix)
                        ? fresh.tenantDbName.slice(dbNamePrefix.length)
                        : fresh.tenantDbName;
                    // substituir para continuar
                    tenantId = corrected;
                }
            } catch (e) {
                console.error('Falha ao tentar corrigir tenantId via DB:', e.message);
            }
        }
        const tenantConnection = await getTenantConnection(tenantId);

        // Injeta a conexão e os modelos compilados no objeto req
        req.tenantConnection = tenantConnection;
        req.tenantId = tenantId;

        // Compila os modelos para esta conexão específica
        req.tenantModels = {
            Utilizacao: getUsoRegularModel(tenantConnection),
            Sala: getSalaModel(tenantConnection),
            Aula: getAulaModel(tenantConnection),
            Motivos: getMotivosModel(tenantConnection),
        };

        console.log(`Tenant ${tenantId} conectado para requisição de ${user.solicitante}`);
        next();

    } catch (error) {
        console.error('Erro no tenantMiddleware:', error);
        // Retorna um erro 500 se houver problema ao conectar ao banco do tenant
        res.status(500).json({
            error: 'Erro ao conectar ao banco de dados do seuário.',
            details: error.message
        });
    }
}

/*
================================================================================
DOCUMENTAÇÃO: O Middleware de Tenant (Fábrica de Modelos por Requisição)
================================================================================

1. O PROBLEMA QUE ESTE MIDDLEWARE RESOLVE
   Com a migração para multi-tenant, cada requisição de um usuário pode precisar
   acessar o banco de dados de um estúdio diferente. Se dois usuários estiverem
   usando o sistema simultaneamente:
   - Usuário de Estúdio A faz uma requisição
   - Usuário de Estúdio B faz uma requisição
   
   Cada um deles precisa de uma conexão diferente. O middleware resolve isso
   automaticamente, baseando-se em "quem" fez a requisição.

2. COMO ESTE MIDDLEWARE FUNCIONA
   a) Verifica se há um usuário autenticado (req.session.user).
   b) Lê o campo "tenantDbName" do usuário.
   c) Chama a Connection Factory para obter a conexão correta.
   d) Compila todos os modelos (Uso, Sala, Aula, etc.) especificamente para essa conexão.
   e) Anexa tudo em req.tenantModels e req.tenantConnection.

3. EXEMPLO DE FLUXO EM UMA REQUISIÇÃO
   GET /admin/salas (user autenticado do Estúdio A)
   │
   ├─→ authMiddleware: Verifica credenciais, define req.session.user
   │
   ├─→ tenantMiddleware (esse arquivo):
   │   ├─ Lê req.session.user.tenantDbName ("gus_tenant_estudio_a")
   │   ├─ Chama getTenantConnection("estudio_a")
   │   ├─ Compila req.tenantModels.Sala para essa conexão
   │   └─ Prossegue
   │
   └─→ adminSalasController.js:
       ├─ const Sala = req.tenantModels.Sala  ← Usa o modelo injetado
       └─ const salas = await Sala.find()    ← Queries no banco do Estúdio A

4. QUANDO ESTE MIDDLEWARE É EXECUTADO
   Deve ser registrado APÓS autMiddleware em index.js, assim:

   app.use(authMiddleware);
   app.use(tenantMiddleware);  ← Aqui
   app.use('/admin', adminRoutes);

   Rotas públicas (/login, /cadastro) NÃO serão afetadas porque o middleware
   usa um early return se não houver req.session.user.

5. EXTENSÕES FUTURAS
   Este middleware poderia ser expandido para:
   - Validar permissões do tenant (ex: verificar se o usuário é admin do seu tenant)
   - Registrar logs de auditoria
   - Aplicar quotas ou rate limiting por tenant
   - Injetar informações adicionais do tenant em req

================================================================================
*/
