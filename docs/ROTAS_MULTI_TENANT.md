# Documentação de rotas

[Visão geral do superadmin](./SUPERADMIN.md) · [Manual de rotas do superadmin](./SUPERADMIN_ROTAS.md) · [Manutenção do banco](./MANUTENCAO_DB.md)

Este documento descreve os endpoints registrados em `app.js` e nos roteadores
do projeto, incluindo quais exigem sessão, papel administrativo ou contexto de
tenant. Os mapas JSON também estão disponíveis em `/rotas-disponiveis` e
`/rotas-superadimin`, com controles de acesso diferentes.

## Como funcionam as respostas sem sessão

- Navegação de navegador que solicita HTML é redirecionada para
  `/login.html?aviso=login-obrigatorio`, onde aparece a mensagem para entrar.
- Requisições de API, inclusive Postman, recebem `401` JSON:
  `{ "error": "É necessário fazer login para acessar esta rota.", "loginUrl": "/login.html" }`.
- Rotas restritas a um papel específico respondem `403` quando a sessão existe,
  mas não tem a permissão necessária.

## Rotas públicas e autenticação

| Método | Endpoint | Acesso / descrição |
|--------|----------|--------------------|
| GET | `/health` | Público; health check, retorna `200` e `{ "status": "ok" }` |
| GET | `/` | Público; redireciona para `/painelGeral.html` |
| GET | `/home` | Público; atalho que redireciona para o painel |
| GET | `/painelgeral` | Público; atalho que redireciona para o painel |
| GET | `/painelgeral.html` | Público; variação em minúsculas que redireciona para o painel |
| POST | `/login` | Público; cria a sessão |
| POST | `/logout` | Encerra a sessão |
| GET | `/usuario-logado` | Retorna os dados da sessão ou `401` |
| POST | `/esqueci-senha` | Público; solicita recuperação, limitado por IP |
| POST | `/resetar-senha` | Público; redefine senha com token, limitado por IP |
| GET | `/solicitantes/lista-simples` | Público; lista estúdios para o cadastro |
| POST | `/solicitantes` | Público; cadastra usuário e pode provisionar um tenant |

O cadastro público exige `solicitante`, `senha`, `email` e `estudioName`.
Consulte [a coleção Postman](./GUS.postman_collection.json) para exemplos dos
corpos das requisições.

Os atalhos do painel e a rota raiz respondem com redirecionamento HTTP `302`
para `/painelGeral.html`. O endpoint `/health` é separado e não redireciona,
para que verificadores de disponibilidade recebam diretamente uma resposta
`200`.

## Descoberta de rotas

| Método | Endpoint | Acesso / descrição |
|--------|----------|--------------------|
| GET | `/rotas-disponiveis` | Exige sessão com papel `admin` ou `adm`; lista rotas gerais, sem as rotas da plataforma |
| GET | `/rotas-superadimin` | Exige sessão com papel `superadmin`; lista rotas exclusivas da plataforma |

O nome `/rotas-superadimin` é intencional e corresponde ao endpoint registrado.
As rotas detalhadas de superadmin estão em [SUPERADMIN_ROTAS.md](./SUPERADMIN_ROTAS.md).

## Rotas autenticadas do tenant

As rotas de dados usam a sessão para identificar o usuário e o tenant. Operações
de criação podem ser bloqueadas pela situação do tenant (`423` quando trial
expirou ou o tenant foi reprovado).

### Usos (agendamentos)

| Método | Endpoint | Observação |
|--------|----------|------------|
| GET | `/usos` | Resposta de teste |
| GET | `/usos/usos` | Lista paginada |
| GET | `/usos/usos/:id` | Busca uso |
| POST | `/usos/usos` | Cria uso |
| POST | `/usos/usos/gerar-teste` | Somente `admin`/`adm`; cria registros de teste |
| PUT | `/usos/usos/:id` | Atualiza uso conforme permissões |
| DELETE | `/usos/usos/:id` | Remove uso conforme permissões |
| GET | `/usos/buscaid` | Busca por `solicitante`, `sala`, `dia` e `hora`; `motivo` é opcional |

### Solicitantes

| Método | Endpoint | Observação |
|--------|----------|------------|
| GET | `/solicitantes` | Resposta de teste; requer sessão |
| GET | `/solicitantes/solicitantes` | Lista solicitantes conforme papel e tenant |
| GET | `/solicitantes/solicitantes/:id` | Busca solicitante conforme permissões |
| GET | `/solicitantes/buscaidsolicitante` | Requer query `solicitante` e `estudio` |
| PUT | `/solicitantes/solicitantes/:id` | Atualiza solicitante conforme permissões |
| DELETE | `/solicitantes/solicitantes/:id` | Remove solicitante conforme permissões |

Não há `POST /solicitantes/solicitantes`: o cadastro público é
`POST /solicitantes`, e a criação por administrador é `POST /admin/usuarios`.

### Estúdios associados ao usuário

| Método | Endpoint | Acesso / descrição |
|--------|----------|--------------------|
| GET | `/estudios` | Requer sessão; lista estúdios associados ao tenant, ou todos para superadmin |

## Administração do tenant

As rotas `/admin/*` passam por sessão, `tenantMiddleware` e papel `admin` ou
`adm`, salvo permissões mais específicas indicadas abaixo.

### Usuários

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/admin/usuarios` | Lista usuários do tenant |
| GET | `/admin/usuarios/:id` | Busca usuário do tenant |
| POST | `/admin/usuarios` | Cria usuário do tenant, respeitando o ciclo de vida do tenant |
| PUT | `/admin/usuarios/:id` | Atualiza usuário conforme permissões |
| DELETE | `/admin/usuarios/:id` | Remove usuário conforme permissões |

### Estúdios, motivos, salas e aulas regulares

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/admin/estudios` | Lista estúdios do tenant |
| POST | `/admin/estudios` | Cria estúdio |
| PUT | `/admin/estudios/:id` | Atualiza estúdio |
| DELETE | `/admin/estudios/:id` | Remove estúdio |
| GET | `/admin/motivos` | Lista motivos |
| POST | `/admin/motivos` | Cria motivo |
| PUT | `/admin/motivos/:id` | Atualiza motivo |
| DELETE | `/admin/motivos/:id` | Remove motivo |
| GET | `/admin/salas` | Lista salas |
| POST | `/admin/salas` | Cria sala |
| PUT | `/admin/salas/:id` | Atualiza sala |
| DELETE | `/admin/salas/:id` | Remove sala |
| GET | `/admin/aulas` | Lista aulas regulares |
| POST | `/admin/aulas` | Cria aula regular |
| PUT | `/admin/aulas/:id` | Atualiza aula regular |
| DELETE | `/admin/aulas/:id` | Remove aula regular |

### Relatórios

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/admin/relatorios/semana` | Agendamentos da semana |
| GET | `/admin/relatorios/mes` | Agendamentos do mês |
| GET | `/admin/relatorios/professor/:id` | Usos por professor |
| GET | `/admin/relatorios/aulas` | Aulas regulares |
| GET | `/admin/relatorios/professores` | Lista de professores |

### Manutenção do tenant

Estas operações são destrutivas e atuam nos dados operacionais do tenant atual.

| Método | Endpoint | Efeito |
|--------|----------|--------|
| DELETE | `/admin/limpar/usos` | Remove todos os usos |
| DELETE | `/admin/limpar/motivos` | Remove todos os motivos |
| DELETE | `/admin/limpar/salas` | Remove todas as salas |
| DELETE | `/admin/limpar/aulas` | Remove todas as aulas regulares |
| DELETE | `/admin/limpar/tudo` | Remove aulas, salas, usos e motivos do tenant |

As antigas rotas `/admin/limpar/solicitantes` e `/admin/limpar/estudios` não
existem: foram removidas por afetarem dados globais do banco Master. A exclusão
de um tenant é feita individualmente pelas rotas de superadmin.

## Gestão da plataforma (superadmin)

Estas rotas não passam pelo `tenantMiddleware` e exigem sessão com papel
`superadmin`. Um usuário autenticado sem esse papel recebe `403`.

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/platform/tenants` | Lista tenants provisionados |
| GET | `/platform/tenants/pending-approval` | Lista tenants pendentes |
| POST | `/platform/tenants/:id/approve` | Aprova tenant |
| POST | `/platform/tenants/:id/reject` | Reprova tenant; body requer `{ "motivo": "..." }` |
| DELETE | `/platform/tenants/:id` | Exclui tenant; body requer `{ "confirmTenantDbName": "..." }` |

A exclusão de tenant é irreversível e remove o banco, usuários e sessões
relacionados. Consulte o [manual de rotas do superadmin](./SUPERADMIN_ROTAS.md)
antes de executar essa operação.

## Referências

- [Coleção Postman](./GUS.postman_collection.json)
- [Visão geral do superadmin](./SUPERADMIN.md)
- [Manual de rotas do superadmin](./SUPERADMIN_ROTAS.md)
- [Manutenção do banco](./MANUTENCAO_DB.md)
