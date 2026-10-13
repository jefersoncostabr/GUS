# 🛡️ Rotas de Superadmin (Desenvolvedor) — GUS

> Este guia é para **você, desenvolvedor(a) da plataforma GUS**.
> Aqui estão as rotas que cuidam da **vida dos tenants** (estúdios): listar, aprovar, reprovar e excluir.

### Visão geral em 30 segundos

| Você quer... | Use | O que acontece? |
|---|---|---|
| Ver todos os estúdios | `GET /platform/tenants` | Lista do mais novo ao mais antigo |
| Ver quem espera aprovação | `GET /platform/tenants/pending-approval` | Só os `pending` |
| Liberar um estúdio para sempre | `POST /platform/tenants/:id/approve` | Vira `approved`, sem prazo |
| Bloquear um estúdio | `POST /platform/tenants/:id/reject` | Vira `rejected`, não cria mais nada |
| Apagar tudo **(sem volta!)** | `DELETE /platform/tenants/:id` | Apaga banco + usuários + sessões |

> ⚠️ **Acesso exclusivo:** todas exigem login como `superadmin`.
> Logado como `admin` ou `user` → `403 Forbidden`.

**Onde mora no código:**

- Rotas: `routes/platformTenantRoutes.js`
- Regras: `middleware/authMiddleware.js`
- Lógica: `src/controllers/platformTenantController.js`
- Montagem: `index.js` → `app.use('/platform/tenants', ...)`

**Bases:**

- 🏠 Local: `http://localhost:3000`
- ☁️ Produção: `https://gus-q7nn.onrender.com`

---

## 📑 Sumário

1. [Primeiro passo: criar e logar o superadmin](#0--primeiro-passo-criar-e-logar-o-superadmin)
2. [Listar todos os tenants](#1--listar-todos-os-tenants)
3. [Ver a fila de aprovação](#2--ver-quem-está-esperando-aprovação)
4. [Aprovar um tenant](#3--aprovar-um-tenant)
5. [Reprovar um tenant](#4--reprovar-um-tenant)
6. [Excluir um tenant](#5--excluir-um-tenant-irreversível)
7. [Trial de 7 dias](#-como-funciona-o-trial-de-7-dias)
8. [Postman](#-passo-a-passo-no-postman)
9. [Erros comuns](#-erros-comuns-e-o-que-fazer)

---

## 0. 🔑 Primeiro passo: criar e logar o superadmin

Você só precisa fazer isso **uma vez** por ambiente (local ou produção).

### 0.1 Criar o superadmin

No terminal **interativo**, rode:

```bash
npm run superadmin:create
```

Ele vai pedir **e-mail** e **senha** (mínimo 12 caracteres, oculta, bcrypt 10).

> 💡 O `superadmin` **não** pode ser criado pela tela de cadastro,
> nem pela edição de usuários do tenant. Só por esse script:
> `scripts/bootstrap_superadmin.js`.

### 0.2 Fazer login (pega o cookie `connect.sid`)

```http
POST /login
Content-Type: application/json

{ "email": "dev@seu-dominio.com", "password": "SENHA_FORTE_12+" }
```

Todas as chamadas usam esse cookie — **sem token no header**.
Também aceita `solicitante` no lugar de `email`:

```json
{ "solicitante": "dev@seu-dominio.com", "password": "SENHA_FORTE_12+" }
```

**Confirme que deu certo:**

```http
GET /usuario-logado
```

Procure `"role": "superadmin"` no retorno. Se for outro papel, as rotas abaixo dão `403`.

---

## 1. 📋 Listar todos os tenants

> **Para que serve?** Ver todos os estúdios, do mais novo ao mais antigo.

```http
GET /platform/tenants
```

**Exemplo de item:**

```json
{
  "_id": "64f...abc",
  "nome": "Estúdio Novo",
  "tenantDbName": "gus_tenant_novo-ae5edd",
  "approvalStatus": "pending",
  "trialEndsAt": "2026-10-08T12:00:00.000Z"
}
```

**Campos:** `nome`, `tenantDbName`, `localizacao`, `ativo`, `approvalStatus`, `trialStartedAt`, `trialEndsAt`, `approvedAt`, `approvedBy`, `rejectedAt`, `rejectedBy`, `rejectionReason`, `createdAt`, `updatedAt`.

| Código | Significa |
|---|---|
| `200` | OK — retorna a lista |
| `401` | Sem login (cookie ausente/expirado) |
| `403` | Logado, mas não é superadmin |
| `500` | Erro interno |

---

## 2. ⏳ Ver quem está esperando aprovação

> **Para que serve?** Ver só a **fila**: quem está como `pending`.

- Mesmos campos da listagem, mas só `approvalStatus: 'pending'`.
- Ordem do **mais antigo ao mais novo** (quem espera há mais tempo primeiro).
- Mesmos códigos: `200` / `401` / `403` / `500`.

💡 **Dica de rotina:** abra essa rota toda manhã para zerar a fila.

---

## 3. ✅ Aprovar um tenant

> **Para que serve?** Liberar o estúdio **para sempre** (sem prazo de trial).

```http
POST /platform/tenants/:id/approve
```

- **`:id`** = o `_id` visto no `GET /platform/tenants`.
- **Body:** vazio, não manda nada.

**O que acontece por trás:**

1. Vira `approved`
2. Grava `approvedAt` (quando) + `approvedBy` (quem aprovou)
3. Limpa reprovação anterior

> ⚠️ Não aprova quem está em `provisioning` ou `deleting` → volta `404`.
> Espere e consulte a lista de novo.

| Código | Significa |
|---|---|
| `200` | Aprovado! Retorna `{ "tenant": {...} }` |
| `400` | ID inválido |
| `404` | Não achado, ou em `provisioning`/`deleting` |
| `401` / `403` | Sem login / sem ser superadmin |
| `500` | Erro interno |

---

## 4. ❌ Reprovar um tenant

> **Para que serve?** Bloquear na hora. Reprovado **não cria** mais nada (criação dá `423`).

```http
POST /platform/tenants/64f...abc/reject
Content-Type: application/json

{ "motivo": "Dados cadastrais incompletos" }
```

**Regras:** campo `motivo` obrigatório, não vazio, até 1000 caracteres.
Grava `rejectedAt` + `rejectedBy` + `rejectionReason`.

| Código | Significa |
|---|---|
| `200` | Reprovado! Retorna `{ "tenant": {...} }` |
| `400` | ID inválido, motivo ausente/vazio ou > 1000 |
| `404` | Não achado |
| `401` / `403` | Sem login / sem ser superadmin |
| `500` | Erro interno |

---

## 5. 🗑️ Excluir um tenant (irreversível)

> 🔴 **Sem botão desfazer.** Apaga o banco `gus_tenant_*`, usuários e sessões.

```http
DELETE /platform/tenants/:id
Content-Type: application/json

{
  "confirmTenantDbName": "gus_tenant_novo-ae5edd"
}
```

**Como funciona (nessa ordem):**

1. 🔒 Trava (`approvalStatus: 'deleting'`)
2. 💥 Apaga o banco (`dropDatabase()` do `gus_tenant_*`)
3. 🚪 Invalida sessões (`sessions_gus`)
4. 👤 Apaga usuários (por `tenantDbName` ou `estudio`)
5. 🧾 Apaga o registro no Master

**Trava de segurança:** o `confirmTenantDbName` precisa ser **idêntico**
ao do `GET`. Valor diferente → `400` e **nada é apagado**.
Copie e cole, não digite à mão.

**Se falhar no meio:**

- Antes do drop → status restaurado, pode tentar de novo.
- Depois do drop → fica travado em `deleting` para investigação.

| Código | Significa |
|---|---|
| `200` | Excluído! Mensagem de confirmação |
| `400` | ID inválido ou confirmação divergente |
| `404` | Não achado |
| `409` | Sem banco associado |
| `401` / `403` | Sem login / sem ser superadmin |
| `500` | Erro interno |

---

## 🌱 Como funciona o trial de 7 dias?

```
[Novo cadastro] → pending (7 dias liberado)
                    ├─→ approved ✅ (para sempre)
                    ├─→ rejected ❌ (bloqueado na hora)
                    └─→ expirou ⏰ (não cria mais)
```

1. **Nasce `pending`:** ganha `trialStartedAt` + `trialEndsAt` (+7 dias). No prazo, uso completo.
2. **Expirou sem aprovação:** ainda pode ler/editar/excluir, mas **criar** dá `423`.
3. **`approved`:** remove o prazo para sempre.
4. **`rejected`:** bloqueia na hora.
5. Tenants antigos foram marcados `approved` via `npm run tenant:migrate-lifecycle`.

📖 Detalhes: `docs/ROTAS_MULTI_TENANT.md`.

---

## 🧪 Passo a passo no Postman

> Tudo usa o cookie de sessão. **Nada de token no header.**

### A. Login

1. `POST http://localhost:3000/login`, Body raw JSON:
   ```json
   { "email": "dev@seu-dominio.com", "password": "SENHA_FORTE_12+" }
   ```
2. **Send.** Esperado `200` com `usuario.role: "superadmin"`.
   O Postman salva o `connect.sid` (aba Cookies).
3. (Opcional) `GET /usuario-logado` para confirmar.
   Trocou de base? Refaça o login na base nova.

### B. Listar, aprovar e reprovar

1. `GET http://localhost:3000/platform/tenants` → **Send**.
   Anote `_id` e `tenantDbName`. Só a fila? `GET /platform/tenants/pending-approval`.
2. Aprovar: `POST /platform/tenants/:id/approve` (sem body) → **Send** (`200`).
3. Reprovar: `POST /platform/tenants/:id/reject`, body
   `{ "motivo": "Cadastro duplicado para testes" }` → **Send** (`200`).

### C. Excluir (perigo! ☠️)

1. Copie o `tenantDbName` exato do GET.
2. `DELETE http://localhost:3000/platform/tenants/:id`, body:
   ```json
   { "confirmTenantDbName": "gus_tenant_novo-ae5edd" }
   ```
3. **Send.** Sem confirmação exata = `400` e nada acontece.
   Sucesso = `200`, sem volta.

---

## 🆘 Erros comuns e o que fazer

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `401` | Cookie ausente/expirado | Refaça o login (A) |
| `403` | Logado como `admin`/`user` | Logue com `superadmin` |
| `400` na exclusão | Confirmação divergente | Cole o valor exato do GET |
| `404` no approve/reject | ID errado ou `provisioning`/`deleting` | Reconsulte a lista |
| `423` ao criar | Trial expirado ou `rejected` | Aprove o tenant (B) |
| `409` ao excluir | Sem banco associado | Veja `docs/MANUTENCAO_DB.md` |

---

## 📚 Referências

- Código: `routes/platformTenantRoutes.js`, `src/controllers/platformTenantController.js`
- Descoberta: `routes/sistemaRoutes.js` (`GET /rotas-disponiveis`)
- Multi-tenant: `docs/ROTAS_MULTI_TENANT.md`
- Banco: `docs/MANUTENCAO_DB.md`
- Postman: `docs/GUS.postman_collection.json` (ainda sem pasta `platform`)
