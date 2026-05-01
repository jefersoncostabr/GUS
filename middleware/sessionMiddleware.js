/**
 * Middleware de Validação de Sessão
 * 
 * Este middleware valida e enriquece os dados de sessão para garantir
 * que o objeto de sessão contém todas as informações necessárias para
 * operações multi-tenant.
 * 
 * Deve rodar ANTES do tenantMiddleware para garantir que os dados estejam disponíveis.
 */

export default function sessionMiddleware(req, res, next) {
    try {
        // Se há uma sessão ativa
        if (req.session && req.session.user) {
            const user = req.session.user;

            // Validações de segurança
            if (!user._id || !user.solicitante) {
                console.warn('Sessão corrompida: faltam dados críticos do usuário');
                return res.status(401).json({ error: 'Sessão inválida. Faça login novamente.' });
            }

            // Logging para debug (remover em produção)
            if (process.env.DEBUG_TENANT) {
                console.log(`[Session] Usuário: ${user.solicitante}, Role: ${user.role}, Tenant: ${user.tenantDbName || 'Master'}`);
            }

            // Se o usuário é um admin sem tenant, ele opera no banco Master
            if (user.role === 'admin' && !user.tenantDbName) {
                req.isMasterUser = true;
            }
        }

        next();
    } catch (error) {
        console.error('Erro no sessionMiddleware:', error);
        next();
    }
}

/*
================================================================================
DOCUMENTAÇÃO: Estratégia de Sessão em Arquitetura Multi-Tenant
================================================================================

1. ARMAZENAMENTO DE SESSÃO
   - Todas as sessões são armazenadas no Banco Master (gus_master).
   - A coleção 'sessions_gus' no banco Master contém todos os dados de sessão.
   - Isso garante que qualquer instância da aplicação pode restaurar uma sessão.

2. ESTRUTURA DA SESSÃO (req.session.user)
   ```javascript
   {
     _id: ObjectId,                    // ID do usuário no banco Master
     solicitante: String,              // Nome/email do usuário
     role: String,                     // 'user' ou 'admin'
     tenantDbName: String | undefined  // Nome do banco do tenant (se houver)
   }
   ```

3. TIPOS DE USUÁRIOS

   A) Usuário Regular (Professor, Solicitante)
      - role: 'user'
      - tenantDbName: 'gus_tenant_estudio_xyz'
      - Acesso: Apenas ao banco do seu tenant
      - Ações no middleware: tenantMiddleware conecta ao banco específico

   B) Admin Global (Superadmin)
      - role: 'admin'
      - tenantDbName: undefined ou null
      - Acesso: Banco Master + gerenciamento global
      - Ações no middleware: isMasterUser = true

   C) Admin de Estúdio (Diretor de Estúdio)
      - role: 'admin'
      - tenantDbName: 'gus_tenant_estudio_xyz'
      - Acesso: Banco do seu estúdio apenas
      - Ações no middleware: Conecta ao banco do tenant específico

4. FLUXO DE SESSÃO

   Login (authController.js):
   ┌─ Busca usuário no banco Master
   ├─ Valida senha
   ├─ Cria objeto de sessão com todos os dados
   │  (incluindo tenantDbName se houver)
   ├─ Express-session salva em MongoDB
   └─ Retorna confirmação

   Requisição Autenticada:
   ┌─ Express-session carrega sessão de MongoDB
   ├─ sessionMiddleware valida integridade
   ├─ tenantMiddleware lê tenantDbName da sessão
   ├─ Conecta ao banco apropriado (Master ou Tenant)
   └─ Controller processa com modelos injetados

5. CONSIDAÇÕES DE SEGURANÇA

   a) Isolamento de Dados:
      - Cada usuário só acessa o banco que tem permissão
      - A sessão contém a informação de qual banco acessar
      - Os controllers usam modelos compilados para esse banco específico

   b) Sincronização de Instâncias:
      - Se a app rodasse em múltiplas instâncias (cluster),
        todas compartilhariam as mesmas sessões (armazenadas no Master)
      - Isso garante consistência

   c) Proteção do Banco Master:
      - Apenas dados de usuários são armazenados no Master
      - Dados de negócio (Usos, Salas, etc.) ficam nos bancos Tenant
      - Operação "limpar tudo" não afeta o Master

6. FLUXO ESPERADO (Exemplo: Logar e Criar Sala)

   1. POST /login
      Entrada: { solicitante: 'João', password: '123' }
      Saída: req.session.user = {
        _id: '507f1f77',
        solicitante: 'João',
        role: 'user',
        tenantDbName: 'gus_tenant_estudio_centro_123'
      }
      MongoDB Master: Sessão salva em sessions_gus

   2. GET /admin/salas (com cookie de sessão)
      sessionMiddleware: Valida sessão
      tenantMiddleware: 
        - Lê tenantDbName da sessão
        - Conecta ao banco 'gus_tenant_estudio_centro_123'
        - Injeta SalaModel compilado para esse banco
      adminController.listarSalas():
        - Usa req.tenantModels.Sala
        - Retorna só as salas de João (do seu tenant)

   3. POST /admin/salas (criar sala)
      Passagem por middleware igual a anterior
      adminController.criarSala():
        - Usa req.tenantModels.Sala
        - Cria sala no banco do tenant de João
        - Salas de outros tenants não são afetadas

================================================================================
*/
