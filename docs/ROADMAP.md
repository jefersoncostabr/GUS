# Roadmap e Status do Projeto GUS

Este documento resume o status atual do desenvolvimento, próximas etapas e anotações de estudo.

## ✅ Status Atual (Concluído)

### Backend
- [x] **Configuração Base:** Express + express-session + connect-mongo.
- [x] **Banco de Dados:** Conexão Mongoose estabelecida.
- [x] **Segurança:**
  - [x] `authMiddleware`: Proteção de rotas (login).
  - [x] `verificaRole`: Controle de acesso Admin.
  - [x] `verificaSolicitante`: Apenas dono edita/exclui.
  - [x] `verificaDuplicidade`: Evita conflitos de horário.
  - [x] Variáveis de ambiente (`.env`) configuradas.
- [x] **Modelagem:** Campos `dia` e `hora` como String.
- [x] **Arquitetura:** MVC implementado (Controllers e Rotas refatorados).

### Frontend
- [x] **Painéis:** Geral e Adm estruturados.
- [x] **CRUD:** Ver, Adicionar, Editar, Excluir integrados.
- [x] **Paginação:** Integrada (Front+Back) e documentada (`paginacao.js`, `tabela.js`).
- [x] **UX:** Filtros de pesquisa e feedback visual.

---

## 🚀 Próxima Etapa: Área Administrativa

**Objetivo:** Gerenciar configurações (estúdios, salas, motivos, roles, aulas regulares).

### 1. Backend Admin (`/admin/*`)
- [ ] Criar rota protegida `/admin/*` com middleware `verificaRole`.
- [ ] Criar `adminController.js`:
  - [ ] `listarConfig`, `criarConfig`, `atualizarConfig`, `deletarConfig`.
- [ ] Implementar validação com `express-validator`.
- [ ] Criar Models:
  - [ ] `Estudio` (nome, localização, ativo).
  - [ ] `Motivo` (lista de motivos).
  - [ ] `AulaRegular` (dia, hora, prof, sala).

### 2. Frontend Admin
- [ ] Melhorar `painelAdm.html` (já criado).
- [ ] Implementar chamadas `fetch` para rotas `/admin/*`.
- [ ] Reutilizar componentes de tabela e paginação.
- [ ] Substituir constantes (ex: `OPCOES_MOTIVO`) por dados vindos da API.

---

## ⚠️ Correções Prioritárias (Curto Prazo)

### Imediato (Dia 1)
- [ ] **HTML:** Remover duplicidade de `id="painelSaida"` em `painelGeral.html`.
- [ ] **CSS:** Mover `<link ... navbar.css>` do `<body>` para o `<head>`.

### UX e Validação (Dias 2-3)
- [ ] **Client-side:** Adicionar validação visual nos inputs (data/hora).
- [ ] **Feedback:** Padronizar mensagens de erro/sucesso no `#painelSaida` (ou `#painelMensagem`).

### Segurança e Backend (Dias 3-5)
- [ ] **Sanitização:** Revisar Controllers para garantir queries parametrizadas.
- [ ] **Validação:** Implementar `express-validator` nas rotas de criação/edição.
- [ ] **Sessão:** Confirmar flags `HttpOnly` e `Secure` nos cookies.

---

## 📝 Notas de Estudo e Observações

### Riscos Identificados
1.  **Injeção/SQL:** Inputs numéricos/texto sem validação server-side forte.
2.  **DOM:** IDs duplicados quebram seletores JS.
3.  **UX:** Campos de data/hora separados podem gerar entradas inválidas (ex: 31 de Fevereiro).

### Arquitetura Sugerida
- **Coleções Separadas:** Preferência por criar coleções `Estudios`, `Motivos` separadas para escalabilidade.
- **Config Global:** Para configurações pequenas, usar um único documento `Config`.

### Cronograma Estimado
| Dia | Foco |
| :--- | :--- |
| 1 | Modelos, Rotas Backend e Correções HTML |
| 2-3 | Controllers e Testes Unitários |
| 4-5 | Frontend Admin (UI e Integração) |
| 6 | Revisão de Segurança e Deploy |