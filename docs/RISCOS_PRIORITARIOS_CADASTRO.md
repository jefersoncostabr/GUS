# Riscos Prioritários — Criação de Conta

> **Manutenção desta lista:** quando um risco for corrigido e a correção estiver validada por teste, exclua a respectiva entrada deste documento. Não remova itens apenas porque a implementação foi iniciada.

## Pendências

- [ ] **Crítica — Elevação de privilégio pelo cadastro público**
  - `POST /solicitantes` não exige autenticação. Quando a requisição tem uma sessão, `criarSolicitante` preserva o `role` enviado no corpo e o usa para cadastrar alguém em um estúdio existente. Um usuário autenticado sem perfil administrativo pode tentar criar outra conta como `admin`.
  - **Recomendação:** separar o cadastro público da criação administrativa. No endpoint público, ignorar sempre o `role` recebido e aplicar regras explícitas para a primeira conta do estúdio; somente a rota administrativa deve permitir escolher perfil, após verificar que quem solicita é administrador.
  - **Referências:** `routes/publicSolicitanteRoutes.js`; `routes/adminRoutes.js`; `src/controllers/solicitanteController.js` (verificação de sessão e atribuição de `role`).

- [ ] **Alta — Senha em texto puro nos logs e hash na resposta**
  - O controlador registra `req.body` inteiro, que inclui a senha original, e responde com o documento completo do usuário, que contém o hash bcrypt.
  - **Recomendação:** nunca registrar senha ou corpo completo; retornar uma lista explícita de campos públicos, excluindo senha e dados internos.
  - **Referência:** `src/controllers/solicitanteController.js` (log do corpo e resposta `201`).

- [ ] **Alta — Tenant/estúdio órfão se a criação do usuário falhar**
  - Para um estúdio novo, o tenant e o documento de estúdio são criados antes de salvar o usuário. Se o nome de usuário ou e-mail já existir, o índice único rejeita o usuário, mas o tenant e o estúdio podem permanecer sem administrador.
  - **Recomendação:** validar os dados e duplicidades antes do provisionamento e implementar provisionamento recuperável, com estado explícito ou compensação/limpeza quando a criação do usuário falhar.
  - **Referência:** `src/controllers/solicitanteController.js` (criação do tenant/estúdio antes de `novoSolicitante.save()`).

- [ ] **Alta — Cadastro público sem rate limit específico**
  - O limitador existente cobre `/login` e `/solicitantes/solicitantes`, mas o formulário de cadastro envia para `POST /solicitantes`. Esse endpoint público pode ser usado repetidamente para tentar criar usuários e tenants.
  - **Recomendação:** aplicar limite de tentativas diretamente a `POST /solicitantes`; avaliar também verificação de e-mail e controles contra automação.
  - **Referências:** `index.js` (montagem de `authLimiter`); `routes/publicSolicitanteRoutes.js`; `frontend/js/loginCriar.js`.

- [ ] **Média — Colisão e correspondência insegura no nome do tenant/estúdio**
  - O nome do tenant é derivado do nome do estúdio e truncado em 25 caracteres, portanto nomes longos diferentes podem gerar o mesmo identificador. Além disso, o nome informado é interpolado em uma expressão regular sem escape. O índice único de `tenantDbName` pode barrar a colisão, mas isso ocorre depois do início do provisionamento.
  - **Recomendação:** escapar o nome usado na busca e gerar identificadores de tenant estáveis e sem colisão, por exemplo com sufixo derivado de ID/hash; verificar conflitos antes de abrir ou inicializar o banco.
  - **Referências:** `src/controllers/solicitanteController.js` (geração do slug e busca por regex); `src/models/estudiomodel.js` (índice único de `tenantDbName`).

- [ ] **Média — Estúdio existente sem tenant vinculado pode receber banco não provisionado**
  - Quando o estúdio existe, mas não possui `tenantDbName`, o código gera e grava um nome no documento do estúdio, porém esse ramo não chama `getTenantConnection` nem inicializa o banco. O usuário pode ficar associado a um tenant ainda não provisionado.
  - **Recomendação:** provisionar e validar o tenant antes de vincular o nome ao estúdio; se isso não puder ser feito, interromper o cadastro com erro operacional claro.
  - **Referência:** `src/controllers/solicitanteController.js` (ramo de estúdio existente sem `tenantDbName`).

## Observações do comportamento atual

- O cadastro procura primeiro um estúdio por ID e, se não encontrar, por nome exato sem diferenciar maiúsculas/minúsculas.
- Se o estúdio não existe, ele cria e inicializa um tenant e define o primeiro usuário como `admin`.
- Se o estúdio existe e o cadastro é público sem sessão, o usuário recebe `pendente`.
- Nome de usuário e e-mail têm índices únicos globais no Master; e-mail é normalizado para minúsculas. A duplicidade é detectada na gravação e convertida em HTTP `409`, não por uma verificação prévia.
- A senha é validada atualmente com mínimo de quatro caracteres.
