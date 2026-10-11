# Scripts disponíveis no projeto

Este documento resume os scripts existentes e os scripts novos criados para manutenção do tenant e dos lançamentos de salas.

## Scripts de limpeza e manutenção

### 1) limpar_lancamentos_salas.js
- Objetivo: apagar os documentos de lançamentos e aulas regulares do banco do tenant informado.
- Não remove salas, estúdios, usuários ou professores.

### 2) repopular_lancamentos_salas.js
- Objetivo: inserir dados de exemplo para testar os lançamentos de salas.
- Cria até 3 lançamentos e 2 aulas regulares, usando salas já cadastradas no tenant e usuários existentes no banco Master.
- Cada execução insere novos documentos; não execute repetidamente sem verificar os dados para evitar duplicatas.

## Como executar no Windows (PowerShell)

Abra o PowerShell na pasta raiz do projeto. Informe o tenant e depois execute o script. O identificador é a parte após `gus_tenant_`: por exemplo, para `gus_tenant_inova-matriz`, use `inova-matriz`.

### Limpar lançamentos

```powershell
$env:TENANT_ID = "inova-matriz"
npm run limpar-lancamentos
```

Também é possível executar o arquivo diretamente:

```powershell
$env:TENANT_ID = "inova-matriz"
node scripts/limpar_lancamentos_salas.js
```

O script informa o tenant, quantos documentos havia e quantos foram removidos. Confirme que o tenant exibido é o correto antes de considerar a operação concluída.

### Repopular com dados de exemplo

```powershell
$env:TENANT_ID = "inova-matriz"
npm run repopular-lancamentos
```

Ou diretamente:

```powershell
$env:TENANT_ID = "inova-matriz"
node scripts/repopular_lancamentos_salas.js
```

O script informa quantos lançamentos e aulas foram criados. Ele precisa encontrar o estúdio correspondente no Master e pelo menos uma sala no tenant. Ambos os scripts também aceitam `TENANT` ou `TENANT_DB_NAME`; com `TENANT_DB_NAME`, informe o nome completo, por exemplo `gus_tenant_inova-matriz`.

As variáveis definidas com `$env:` permanecem disponíveis na janela atual do PowerShell. Para removê-las ao terminar:

```powershell
Remove-Item Env:TENANT_ID
```

## Scripts já existentes no projeto

### limpar_dados_inconsistentes.js
- Remove agendamentos antigos que ficaram com `solicitante` como String.
- Remove registros órfãos sem usuário válido.

### backup_db.js
- Faz backup do banco de dados configurado.

### gerarHash.js
- Gera hash de senha para testes ou manutenção.

### fix_tenant_names_and_migratebkp.js
- Script de correção de nomes de tenant e migração antiga.

### migracao-dados-multi-tenantbkp.js
- Script de migração multi-tenant histórico.

## Observações importantes

- Os scripts de limpeza e repopulação operam no tenant selecionado; a repopulação também consulta o Master para localizar o estúdio e usuários.
- A limpeza é permanente. Confira o identificador do tenant antes de executá-la, especialmente em produção.
