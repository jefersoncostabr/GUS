# Testes automatizados do GUS

Os testes usam Jest e Supertest, já configurados no projeto. O comando geral é
`npm test`; não é necessário iniciar o servidor manualmente.

## Arquivos

### `app.test.js`

Testa a criação do Express sem conexão automática ao MongoDB, o health check,
o carregamento do painel estático, a proteção de rotas sem sessão e regras
isoladas de autorização para trial e superadmin.

Este arquivo não precisa de MongoDB nem de variáveis de conexão.

```powershell
npm test -- --runTestsByPath scripts\testes\app.test.js
```

### `testDatabase.test.js`

Testa a infraestrutura de banco descartável: nomes exclusivos, bloqueio fora do
ambiente de teste, exigência de uma URI explicitamente destinada a testes e
rejeição de URIs inválidas. Esses testes não abrem conexão com o MongoDB.

```powershell
npm test -- --runTestsByPath scripts\testes\testDatabase.test.js
```

### `testDatabase.js`

Utilitário para testes de integração que precisem de MongoDB. Ele exige
`NODE_ENV=test` e `MONGO_URI_TEST`, cria um nome aleatório com prefixo
`gus_test_` e, ao chamar `dispose()`, remove somente esse banco e encerra a
conexão.

Exemplo para um futuro teste de integração:

```js
import { connectToTestDatabase } from './testDatabase.js';

let database;

beforeAll(async () => {
    database = await connectToTestDatabase();
});

afterAll(async () => {
    await database?.dispose();
});
```

Use uma URI de uma instância MongoDB dedicada a testes. O utilitário não lê
`MONGO_URI_MASTER` e não usa fallback para bancos da aplicação. Não configure
uma URI de produção em `MONGO_URI_TEST`.

### `authentication.test.js`

Testa o login e o encerramento/verificação da sessão, incluindo busca por
e-mail ou nome, senha correta/incorreta, resposta genérica para credenciais
inválidas, ausência de exposição do hash e falhas na consulta. Também verifica
autorização de rotas por sessão, papel administrativo, superadmin, titularidade
da conta e estado pendente.

As dependências de e-mail são simuladas; nenhum e-mail é enviado e não é
necessário configurar `RESEND_API_KEY` nem conectar ao MongoDB.

```powershell
npm test -- --runTestsByPath scripts\testes\authentication.test.js
```

### `tenantMiddleware.test.js`

Testa que sessões de tenants diferentes recebem conexões e modelos separados,
que tenant ausente/inexistente ou em provisionamento/exclusão não abre a conexão
de tenant e que falhas de conexão geram resposta de erro. Usa dependências
simuladas e não precisa de MongoDB.

```powershell
npm test -- --runTestsByPath scripts\testes\tenantMiddleware.test.js
```

### `usos.test.js`

Testa criação e normalização de agendamentos, mapeamento de duplicidade para
`409`, presença do índice único por sala/data/horário, filtros e paginação
(padrões, limites máximos, páginas fora do intervalo e lista vazia), além das
permissões de edição e exclusão para proprietário e administrador. As consultas
ao banco são simuladas; o arquivo não precisa de MongoDB.

```powershell
npm test -- --runTestsByPath scripts\testes\usos.test.js
```

O caso de rota em `app.test.js` também garante que as APIs de agendamentos
exigem sessão.

### `tenantLifecycle.test.js`

Testa listagem, aprovação/reprovação e exclusão de tenants: status legado,
validação de ID e motivo, registro do operador, confirmação exata do nome do
banco, invalidação de sessões, remoção dos registros Master e recuperação
quando uma etapa destrutiva falha. Todas as operações de persistência e drop
são simuladas; não precisa de MongoDB.

```powershell
npm test -- --runTestsByPath scripts\testes\tenantLifecycle.test.js
```

### `registrationAdmin.test.js`

Testa validação de cadastro, duplicidade, normalização de nome/e-mail, hash de
senha, papel atribuído pelo servidor, bloqueio de cadastro privilegiado,
escopo de atualização/exclusão de usuários ao tenant e mapeamentos/validações
de operações de sala e aula. MongoDB e serviços externos são simulados.

```powershell
npm test -- --runTestsByPath scripts\testes\registrationAdmin.test.js
```

### `relatorios.test.js`

Testa os limites de semana e mês (incluindo virada de ano e fevereiro bissexto),
filtro de usos por professor, escopo de professores ao tenant administrativo,
exclusão de senhas e mapeamento de salas em aulas regulares. Os modelos são
simulados; não precisa de MongoDB.

```powershell
npm test -- --runTestsByPath scripts\testes\relatorios.test.js
```

### `adminRelatorios.test.js`

Testa a interface de relatórios administrativos: seleção progressiva dos tipos,
exigência de professor no relatório correspondente, eventos enviados para cada
tipo, limpeza do resultado ao mudar a seleção, visualização nos formatos TXT e
JSON, exibição de Copiar/Salvar somente enquanto o conteúdo está visível, cópia
do formato exibido, gravação pelo seletor de destino e tratamento de erros.
Também verifica o preenchimento da lista de professores. O DOM e os módulos
externos são simulados; não precisa de navegador, MongoDB ou serviços externos.

```powershell
npm test -- --runTestsByPath scripts\testes\adminRelatorios.test.js
```

### `maintenance.test.js`

Testa a limpeza individual de cada coleção do tenant e a limpeza total, que
deve rejeitar modelos ausentes sem iniciar exclusões. Também verifica falhas
de operação e que a limpeza total não chama modelos Master. Os modelos são
simulados; não precisa de MongoDB.

```powershell
npm test -- --runTestsByPath scripts\testes\maintenance.test.js
```

### `frontendUtils.test.js`

Testa normalização de dados de uso, valores compostos de sala, horários,
motivos, mapeamento de aulas regulares e paginação (limites, callback,
controles DOM e rótulos compactos para telas estreitas). O DOM é simulado; não
precisa de navegador nem de MongoDB.

```powershell
npm test -- --runTestsByPath scripts\testes\frontendUtils.test.js
```

### `e2e-auth-session.test.js`

Testa via HTTP o fluxo completo de senha incorreta, login válido, persistência
da sessão entre requisições e logout. A senha é validada com bcrypt real; o
registro de usuário é simulado. Não precisa de MongoDB, navegador ou serviços
externos.

```powershell
npm run test:e2e
```

### `operationalScripts.test.js`

Testa backup sem executar `mongodump`, migração sem conexão real, seleção de
usos órfãos, limpeza isolada por tenant e geração de lançamentos de teste.
Dependências externas e modelos são simulados; nenhum banco ou arquivo de
backup real é alterado.

```powershell
npm test -- --runTestsByPath scripts\testes\operationalScripts.test.js
```

Os scripts operacionais só iniciam suas rotinas quando executados diretamente
pela CLI; importá-los em testes não conecta nem altera dados. Para execução
manual:

```powershell
$env:MONGO_URI_MASTER = "mongodb://127.0.0.1:27017/gus_master"
npm run tenant:migrate-lifecycle
npm run db:backup
```

A limpeza legada `scripts/limpar_dados_inconsistentes.js` exige `MONGO_URI`
explícita e não usa mais fallback para `mongodb://localhost:27017/gus`. A
limpeza/repopulação de lançamentos exige `TENANT_ID`, `TENANT` ou
`TENANT_DB_NAME`; a repopulação também exige `MONGO_URI_MASTER` ou `MONGO_URI`
quando não houver conexão Master já aberta. Revise cuidadosamente o tenant e
o destino antes de executar qualquer operação destrutiva. `mongodump` precisa
estar instalado para realizar backup real.

## Teste geral no terminal

Na raiz do projeto, no PowerShell:

```powershell
npm test
```

Para executar em modo detalhado:

```powershell
npm test -- --verbose
```

Para rodar somente os arquivos desta pasta:

```powershell
npm test -- --testPathPatterns=scripts/testes
```

O GitHub Actions executa `npm ci` e toda a suíte com Node.js 20 e 22 em cada
push e pull request. A configuração está em
`.github/workflows/test.yml`; não exige secrets nem conexão com banco.

O Jest define `NODE_ENV=test` pelo script `test` do `package.json`. Os testes
atuais são isolados e não exigem `MONGO_URI_TEST`. Para testes de integração
que chamem `connectToTestDatabase()`, configure a URI
somente no terminal dessa execução, por exemplo:

```powershell
$env:MONGO_URI_TEST = "mongodb://127.0.0.1:27017"
npm test -- --runTestsByPath scripts\testes\nome-do-teste-integracao.test.js
Remove-Item Env:\MONGO_URI_TEST
```

O banco gerado é descartado ao executar `dispose()`. Garanta que cada teste de
integração chame esse método em `afterAll`, inclusive após falhas, e não rode
testes concorrentes que compartilhem a conexão padrão do Mongoose.
