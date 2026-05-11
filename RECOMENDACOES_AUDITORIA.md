# Plano de Implementação de Auditoria - Sistema GUS

Este documento lista as ações críticas onde a captura de logs é recomendada para garantir a segurança, rastreabilidade e integridade dos dados.

## 1. Autenticação e Segurança (Banco Master)
Capturar tentativas de acesso é a primeira linha de defesa.

| Ação | Contexto/Arquivo | Descrição | Prioridade |
| :--- | :--- | :--- | :--- |
| `LOGIN_SUCCESS` | `authController.js` | Registro de entrada bem-sucedida. | Alta |
| `LOGIN_FAILED` | `authController.js` | Tentativas de login inválidas (útil para detectar brute force). | Alta |
| `LOGOUT` | `authController.js` | Encerramento de sessão. | Baixa |
| `PASSWORD_RESET_REQ` | `authController.js` | Solicitação de recuperação de senha. | Média |
| `PASSWORD_CHANGED` | `authController.js` | Alteração efetiva de senha. | Alta |

## 2. Gestão de Estúdios e Tenants (Banco Master)
Ações que afetam a estrutura global do sistema.

| Ação | Contexto/Arquivo | Descrição | Prioridade |
| :--- | :--- | :--- | :--- |
| `ESTUDIO_CREATE` | `adminController.js` | Criação de um novo estúdio/tenant. | Alta |
| `ESTUDIO_DELETE` | `adminController.js` | Remoção de um estúdio (Ação Crítica). | Crítica |
| `ESTUDIO_UPDATE` | `adminController.js` | Alteração de dados cadastrais do estúdio. | Média |

## 3. Gestão de Usuários e Permissões (Banco Master)
Monitorar quem pode acessar o quê.

| Ação | Contexto/Arquivo | Descrição | Prioridade |
| :--- | :--- | :--- | :--- |
| `USER_CREATE` | `solicitanteController.js` | Novo usuário cadastrado. | Média |
| `USER_ROLE_UPDATE` | `adminRoutes.js` | Alteração de privilégios (ex: `user` para `admin`). | Alta |
| `USER_DELETE` | `solicitanteController.js` | Exclusão de conta de usuário. | Alta |

## 4. Operações de Manutenção (Limpeza de Dados)
Ações executadas via `maintenanceController.js`. **Todas aqui são críticas.**

| Ação | Recurso | Descrição |
| :--- | :--- | :--- |
| `MAINTENANCE_PURGE_USOS` | `Utilizacao` | Limpeza de todos os agendamentos de um tenant. |
| `MAINTENANCE_PURGE_SOLICITANTES`| `Solicitante` | Limpeza de usuários (Master). |
| `MAINTENANCE_PURGE_ALL` | `Sistema` | Reset total de tabelas/bancos. |

## 5. Operações de Negócio (Banco do Tenant)
Ações do dia a dia que podem gerar disputas entre usuários.

| Ação | Contexto/Arquivo | Descrição | Prioridade |
| :--- | :--- | :--- | :--- |
| `USO_DELETE` | `usoController.js` | Quando um agendamento é removido. | Alta |
| `USO_UPDATE` | `usoController.js` | Alteração de horário ou sala de um agendamento. | Média |
| `SALA_CREATE/DELETE` | `adminController.js` | Alteração na infraestrutura física do estúdio. | Média |

---

## Dicas de Implementação

1.  **Middleware de Auditoria:** Para não poluir os controllers, você pode criar um utilitário `logger.js` que recebe o `req` e a `acao`, extraindo automaticamente o IP, ID do usuário e Tenant da sessão.
2.  **Detalhes Simples:** No campo `detalhes` do `AuditoriaModel`, salve o "Antes" e "Depois" de alterações críticas (como mudança de horários) em formato JSON.
3.  **Performance:** Logs de auditoria no Master DB não devem travar a requisição do usuário. Considere não usar `await` na criação do log se a persistência for secundária à resposta da API, ou garanta que o banco Master seja rápido.

---
*Documento gerado para o projeto GUS - Gerenciador de Uso de Salas.*