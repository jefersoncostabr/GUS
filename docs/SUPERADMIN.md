# Superadmin da plataforma GUS

O `superadmin` administra o ciclo de vida dos estúdios (tenants) na plataforma.
Ele é diferente do `admin`, que gerencia apenas o próprio estúdio, e do `user`,
que usa o sistema sem permissões administrativas.

## O que o superadmin pode fazer

- Listar os estúdios cadastrados e consultar quais aguardam aprovação.
- Aprovar um estúdio permanentemente ou reprová-lo, bloqueando novas inclusões.
- Excluir um estúdio da plataforma. Essa ação remove o banco tenant, o registro
  do estúdio, os usuários vinculados e as sessões, e não pode ser desfeita.

O superadmin não é criado automaticamente junto com o primeiro administrador de
um estúdio. Sua conta é criada separadamente pelo comando
`npm run superadmin:create`, em um terminal interativo.

## Acesso e limites

As operações de plataforma exigem login com papel `superadmin`. Um `admin` de
estúdio ou um `user` não tem acesso a essas rotas. A exclusão de um tenant exige
a confirmação exata do nome do banco, mas continua sendo irreversível; faça
backup e confira o tenant antes de executá-la.

Para consultar o mapa das rotas exclusivas da plataforma, use
`GET /rotas-superadimin`. Esse endpoint também exige uma sessão `superadmin`.
O mapa geral `GET /rotas-disponiveis` é exclusivo para `admin`/`adm` e não
inclui operações de superadmin. Sem sessão, requisições de API recebem `401`;
uma navegação pelo navegador é redirecionada ao login com aviso para entrar.

## Documentação relacionada

- [Manual de rotas e operações do superadmin](./SUPERADMIN_ROTAS.md)
- [Mapa de rotas multi-tenant](./ROTAS_MULTI_TENANT.md)
- [Manutenção e exclusão de dados](./MANUTENCAO_DB.md)

## Lista de rotas

- Fazer login como superadmin (obrigatório) - POST /login
- Confirmar usuário logado e papel - GET /usuario-logado
- Consultar rotas exclusivas de superadmin - GET /rotas-superadimin
- Listar todos os tenants - GET /platform/tenants
- Ver fila de aprovação (pending) - GET /platform/tenants/pending-approval
- Aprovar um tenant permanentemente - POST /platform/tenants/:id/approve
- Reprovar um tenant (bloquear) - POST /platform/tenants/:id/reject
- Excluir um tenant (irreversível) - DELETE /platform/tenants/:id