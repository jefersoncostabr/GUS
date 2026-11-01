# Plano de testes automatizados — GUS

Este plano cobre o sistema como um todo e prioriza testes que previnam falhas
funcionais, vazamento entre tenants e regressões nos fluxos principais. É uma
lista de cenários a implementar, não uma afirmação de que todos já existem.

## Diretrizes

- Mover os testes existesntes para pasta scripts/testes.
- De preferencia mantenhas os testes existentes.
- Apagar deste MD o que já foi feito ou não é mais necessário.
- Crie teste sem mudar o código do projeto.

## Situação atual

- O projeto usa Jest e Supertest (`npm test`).
- O teste existente está em `scripts/app.test.js` e combina testes de
  integração HTTP com verificações de middlewares.
- A configuração atual dos testes depende da inicialização do app e de acesso
  ao MongoDB Master. A suíte deve evoluir para permitir testes isolados sem
  banco externo e testes de integração com banco descartável.
- Manter os novos arquivos de teste nesta pasta, com sufixos `.test.js` ou
  `.spec.js`, conforme o padrão do Jest.

## Prioridade P0 — proteção de dados e fluxos críticos

### Autenticação, sessão e autorização

- Login com credenciais válidas inicia sessão e retorna os dados esperados,
  sem expor senha, hash ou tokens internos.
- Senha incorreta, usuário inexistente e dados obrigatórios ausentes são
  rejeitados com status e formato de resposta consistentes.
- Logout invalida a sessão; requisições subsequentes às rotas protegidas
  recebem `401` ou redirecionamento apropriado ao tipo de requisição.
- Rotas de API sem sessão retornam JSON `401`, enquanto páginas protegidas
  seguem o comportamento esperado no navegador.
- Usuário comum, administrador do tenant e superadmin recebem permissões
  distintas: `403` quando não autorizados e acesso apenas às rotas permitidas.
- Usuário com papel pendente não consegue executar ações bloqueadas.
- Alteração e exclusão de usuário por usuário comum só afetam a própria conta;
  administrador age dentro do tenant correto.
- Rate limit de login e cadastro bloqueia tentativas acima do limite e volta a
  permitir chamadas após a janela, usando relógio controlado nos testes.

### Isolamento multi-tenant

- Requisições de usuários de tenants diferentes consultam e alteram somente os
  dados do tenant presente na sessão.
- IDs de registros pertencentes a outro tenant não permitem leitura,
  atualização ou exclusão.
- Sessão sem tenant, tenant inexistente e tenant indisponível recebem respostas
  de erro adequadas sem acessar outro banco por fallback.
- O middleware injeta os modelos correspondentes à conexão do tenant correto.
- Listagens de estúdios e operações administrativas não retornam dados de
  tenants alheios.
- Testes paralelos de dois tenants não compartilham conexão, modelos ou
  resultados de consulta indevidamente.

### Agendamentos de uso de salas

- Criar uso com dados válidos persiste e retorna o registro criado.
- Campos obrigatórios ausentes, IDs inválidos e formatos inválidos são
  rejeitados sem gravação parcial.
- A mesma sala não aceita dois usos na mesma data e horário; combinações
  diferentes continuam permitidas.
- A regra contra duplicidade é garantida também em operações simultâneas,
  validando a resposta do índice único do MongoDB.
- Usuário sem permissão não altera nem exclui uso de outro solicitante.
- Atualização e exclusão respeitam existência do registro, autorização e
  tenant atual.
- Busca por ID e busca pelos critérios de solicitante, sala, data, horário e
  motivo retornam resultado correto ou ausência explícita.
- Paginação respeita página, limite máximo, filtros, total de itens e páginas;
  entradas inválidas não causam resultados inconsistentes.

## Prioridade P1 — regras do produto

### Cadastro e administração do tenant

- Cadastro público valida campos, e-mail, senha e estúdio; duplicidades não
  criam contas ou tenants extras.
- Hash de senha é armazenado em vez da senha original e permite autenticação
  somente com a senha correta.
- Fluxo de recuperação de senha gera token temporário, valida expiração,
  permite redefinir uma única vez e não revela se um e-mail existe.
- Administrador cria, consulta, atualiza e exclui usuários do próprio tenant
  respeitando os campos permitidos e as regras de validação.
- Administrador cria, lista, atualiza e exclui estúdios, salas e motivos; IDs
  inválidos ou recursos inexistentes recebem respostas adequadas.
- Exclusões e atualizações que dependem de registros relacionados mantêm a
  integridade dos dados e não modificam outros tenants.

### Ciclo de vida dos tenants

- Tenant aprovado pode realizar inclusões.
- Tenant pendente dentro do período de trial pode realizar inclusões.
- Tenant pendente com trial expirado e tenant reprovado não podem criar novos
  registros; leituras, edições e exclusões seguem a regra prevista.
- Limites do trial (instante anterior, instante exato e instante posterior ao
  vencimento) são cobertos com relógio controlado.
- Apenas superadmin lista, aprova, reprova ou exclui tenants.
- Reprovação exige motivo e bloqueia inclusões.
- Exclusão exige confirmação exata do banco e remove somente os dados, sessões
  e registros associados ao tenant escolhido.
- Migração do ciclo de vida é idempotente: executá-la mais de uma vez não
  corrompe nem altera indevidamente tenants já tratados.

### Aulas regulares e relatórios

- Criar, listar, atualizar e excluir aulas regulares valida os campos e a
  autorização do administrador.
- Relatórios semanal e mensal respeitam limites de data, virada de mês/ano,
  filtros e timezone definido pelo produto.
- Relatório por professor retorna somente os usos daquele professor e tenant.
- Listas de professores e aulas não incluem registros de outros tenants.
- Consultas sem resultados e datas inválidas retornam respostas previsíveis.

### Manutenção e scripts operacionais

- Cada rotina de limpeza afeta somente a coleção e o tenant previstos.
- Limpeza total exige autorização e afeta exclusivamente o tenant autenticado.
- Scripts operacionais de backup, migração, limpeza e repopulação devem ser
  importáveis sem efeitos colaterais e ter suas decisões testadas com
  dependências simuladas; testes de integração devem verificar os efeitos em
  banco descartável.
- Operações destrutivas devem ter testes que confirmem que dados de outros
  tenants permanecem intactos.

## Prioridade P2 — frontend e comportamento de interface

- Testar normalização de datas, horários e dados antes do envio ao backend.
- Testar paginação: primeira/última página, troca de página, limites e estado
  vazio.
- Testar formulários de login, cadastro, uso, salas, estúdios e motivos:
  validação, mensagens de erro, sucesso e prevenção de envio duplicado.
- Testar carregamento e apresentação de dados quando a API responde com sucesso,
  lista vazia, `401`, `403`, `423` ou `500`.
- Confirmar que o frontend não apresenta como concluída uma operação cuja
  requisição falhou e que a sessão expirada leva ao fluxo de login esperado.
- Usar testes de navegador para os fluxos completos mais importantes, sem
  substituir os testes unitários de regras e utilitários.

## Organização recomendada da suíte

1. **Unitários:** regras puras, validações, normalizadores, paginação e
   middlewares com dependências simuladas.
2. **Integração:** controllers, modelos e rotas com MongoDB de teste isolado,
   fixtures próprias e limpeza após cada caso.
3. **Ponta a ponta:** poucos fluxos essenciais via navegador/API: login,
   cadastro, criação de agendamento e administração de tenant.

## Critérios para evitar testes frágeis ou perigosos

- Nunca usar `.env` de produção, credenciais reais ou banco compartilhado com
  dados reais. Falhar explicitamente se a configuração apontar para produção.
- Usar banco descartável, nomes de tenant exclusivos por execução e fixtures
  determinísticas; não depender da ordem dos testes.
- Limpar somente os dados criados pelo próprio teste e fechar conexões/servidores
  ao final, inclusive quando houver falha.
- Preferir verificar status, contrato e efeitos observáveis em vez de textos
  internos ou detalhes de implementação que podem mudar.
- Controlar relógio e geração aleatória nos casos que dependem de expiração,
  tokens, salt ou rate limit.
- Executar a suíte completa com `npm test` no CI em cada alteração; manter
  testes unitários rápidos separados dos testes de integração e ponta a ponta.

## Ordem sugerida de implementação

1. **Concluído nesta etapa:** separar a criação do Express da inicialização do
   servidor, permitindo testes sem conexão automática; adicionar utilitário
   com URI explícita e nome randômico para MongoDB descartável. Ver
   `scripts/testes/README.md`.
2. **Concluído nesta etapa:** cobrir login, sessão, autorização e roteamento
   isolado por tenant com dependências simuladas. Ver
   `scripts/testes/authentication.test.js` e
   `scripts/testes/tenantMiddleware.test.js`.
3. **Concluído nesta etapa:** cobrir criação, duplicidade, índice de unicidade,
   permissões de edição/exclusão e paginação de agendamentos. As rotas de uso
   também passaram a exigir autenticação explicitamente. Ver
   `scripts/testes/usos.test.js`.
4. **Concluído nesta etapa:** cobrir aprovação/reprovação e exclusão segura de
   tenants, validação e regras de cadastro, escopo de alterações administrativas
   por tenant e operações selecionadas de salas/aulas. Os testes detectaram e
   permitiram corrigir referências incorretas ao tenant durante a exclusão.
   Ver `scripts/testes/tenantLifecycle.test.js` e
   `scripts/testes/registrationAdmin.test.js`.
5. **Parcialmente concluída:** relatórios, limpeza de coleções do tenant,
   utilitários de frontend e decisões dos scripts operacionais são cobertos por
   testes unitários com dependências simuladas. As rotinas operacionais foram
   protegidas contra execução durante import e a limpeza legada não usa mais
   banco local implícito. Ainda faltam testes de integração com MongoDB
   descartável para confirmar efeitos reais de migração e limpeza.
6. **Concluído nesta etapa:** adicionar um fluxo HTTP ponta a ponta de login,
   sessão e logout, além de executar a suíte no GitHub Actions com Node.js 20 e
   22. Ver `scripts/testes/e2e-auth-session.test.js` e
   `.github/workflows/test.yml`.
