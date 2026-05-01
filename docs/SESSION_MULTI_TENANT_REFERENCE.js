/**
 * CONFIGURAÇÃO MULTI-TENANT DE SESSÃO - REFERÊNCIA RÁPIDA
 * 
 * Este arquivo documenta como as sessões funcionam na arquitetura multi-tenant do GUS.
 */

/*
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE REQUISIÇÃO COMPLETO                        │
├─────────────────────────────────────────────────────────────────────────────┤

1. CLIENTE FAZ REQUISIÇÃO
   ├─ GET /admin/salas (com cookie de sessão: connect.sid=abc123)

2. EXPRESS-SESSION CARREGA A SESSÃO
   ├─ Busca em MongoDB (collections 'sessions_gus' no banco Master)
   ├─ Se encontrar, aloca em req.session
   └─ Se não encontrar, cria sessão vazia

3. sessionMiddleware (middleware/sessionMiddleware.js)
   ├─ Valida se req.session.user existe
   ├─ Verifica integridade dos dados (_id, solicitante obrigatórios)
   ├─ Se admin sem tenant, marca: req.isMasterUser = true
   └─ Se houver erro, retorna 401

4. tenantMiddleware (middleware/tenantMiddleware.js)
   ├─ Obtém tenantDbName de req.session.user.tenantDbName
   ├─ Chama getTenantConnection(tenantId) via connectionFactory
   ├─ Compila modelos para essa conexão específica
   ├─ Injeta em req.tenantModels
   └─ Prossegue para o controller

5. CONTROLLER
   ├─ Acessa req.tenantModels (já compilado para o banco certo)
   ├─ Executa operações no BD do tenant ou Master
   └─ Retorna resultado

└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         ESTRUTURA DE DADOS                                  │
├─────────────────────────────────────────────────────────────────────────────┤

BANCO: gus_master (Banco Master)
COLEÇÃO: users
┌──────────────────────────────────────────────────────────────────────────┐
│ {                                                                        │
│   _id: ObjectId("507f1f77bcf86cd799439011"),                           │
│   solicitante: "João Silva",                                            │
│   senha: "$2b$10$...(hash bcrypt)...",                                  │
│   role: "user",                                                         │
│   tenantDbName: "gus_tenant_estudio_centro_123456",                    │
│   createdAt: 2025-01-15T10:30:00Z,                                     │
│   updatedAt: 2025-01-15T10:30:00Z                                      │
│ }                                                                        │
└──────────────────────────────────────────────────────────────────────────┘

BANCO: gus_master (Banco Master)
COLEÇÃO: sessions_gus
┌──────────────────────────────────────────────────────────────────────────┐
│ {                                                                        │
│   _id: "abc123def456",                                                   │
│   session: {                                                             │
│     user: {                                                              │
│       _id: "507f1f77bcf86cd799439011",                                 │
│       solicitante: "João Silva",                                        │
│       role: "user",                                                     │
│       tenantDbName: "gus_tenant_estudio_centro_123456"                 │
│     }                                                                    │
│   },                                                                     │
│   expires: 2025-01-20T10:30:00Z                                         │
│ }                                                                        │
└──────────────────────────────────────────────────────────────────────────┘

BANCO: gus_tenant_estudio_centro_123456 (Banco do Tenant)
COLEÇÃO: salas
┌──────────────────────────────────────────────────────────────────────────┐
│ {                                                                        │
│   _id: ObjectId("507f1f77bcf86cd799439022"),                           │
│   numero: 1,                                                             │
│   nome: "Sala de Aula 1",                                               │
│   estudioId: ObjectId("507f1f77bcf86cd799439001")                      │
│ }                                                                        │
└──────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                          CASOS DE USO                                       │
├─────────────────────────────────────────────────────────────────────────────┤

CASO 1: Usuário Regular (Prof, Solicitante)
──────────────────────────────────────────────
  req.session.user = {
    _id: "507f1f77bcf86cd799439011",
    solicitante: "Professor João",
    role: "user",
    tenantDbName: "gus_tenant_estudio_centro_123456"
  }

  ✓ Pode fazer login
  ✓ Acessa apenas seu banco de tenant
  ✓ Pode criar/ver usos, salas, etc. de seu estúdio
  ✗ Não acessa dados de outros estúdios


CASO 2: Admin de Estúdio (Diretor)
──────────────────────────
  req.session.user = {
    _id: "507f1f77bcf86cd799439012",
    solicitante: "Diretor Silva",
    role: "admin",
    tenantDbName: "gus_tenant_estudio_centro_123456"
  }

  ✓ Pode fazer login
  ✓ Acessa apenas seu banco de tenant
  ✓ Pode gerenciar salas, motivos, aulas de seu estúdio
  ✓ Pode limpar tudo (limpa só seu tenant)
  ✗ Não acessa dados de outros estúdios


CASO 3: Admin Global (Superadmin)
────────────────────────────
  req.session.user = {
    _id: "507f1f77bcf86cd799439013",
    solicitante: "Admin",
    role: "admin",
    tenantDbName: undefined  // ou null
  }

  ✓ Pode fazer login
  ✓ Acessa banco Master
  ✓ Pode gerenciar estúdios globalmente
  ✗ Não acessa dados individuais de tenants (por segurança)


┌─────────────────────────────────────────────────────────────────────────────┐
│                        CHECKLIST DE SEGURANÇA                               │
├─────────────────────────────────────────────────────────────────────────────┤

✓ Sessões armazenadas no banco Master (compartilhado)
✓ httpOnly: true (não acessa via JavaScript)
✓ secure: true em produção (HTTPS only)
✓ sameSite: 'lax' (proteção CSRF)
✓ Validação de integridade em sessionMiddleware
✓ Cada tenant acessa só seu banco
✓ Operação destructiva ("limpar tudo") não toca banco Master
✓ Logout destrói sessão no MongoDB

⚠️ TODO EM PRODUÇÃO:
  - Usar SESSION_SECRET forte no .env
  - Aumentar expiração ou implementar refresh tokens
  - Adicionar rate limiting no login
  - Implementar 2FA para admins
  - Logs de auditoria para operações sensíveis


┌─────────────────────────────────────────────────────────────────────────────┐
│                        DEBUGGING E MONITORAMENTO                            │
├─────────────────────────────────────────────────────────────────────────────┤

Para ativar logs de debug:
  1. No .env, adicione: DEBUG_TENANT=true
  2. sessionMiddleware vai logar:
     [Session] Usuário: João Silva, Role: user, Tenant: gus_tenant_estudio_centro_123456

Para verificar sessões no MongoDB:
  db.sessions_gus.find().pretty()

Para limpar sessões expiradas manualmente:
  db.sessions_gus.deleteMany({ expires: { $lt: new Date() } })

*/

export default {
  docVersion: "1.0",
  description: "Referência de configuração multi-tenant de sessão",
  lastUpdate: "2025-01-27"
};
