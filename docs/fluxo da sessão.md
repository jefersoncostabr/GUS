Login
  ↓
authController cria session com tenantDbName
  ↓
Express-session salva em MongoDB (banco Master, collection "sessions_gus")
  ↓
Requisição autenticada chega
  ↓
sessionMiddleware valida integridade
  ↓
tenantMiddleware lê tenantDbName da sessão
  ↓
Conecta ao banco do tenant via connectionFactory
  ↓
Controllers recebem modelos já compilados para o banco certo
  ↓
✅ Operações isoladas por tenant