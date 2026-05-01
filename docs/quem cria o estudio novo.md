O dev cria os estudios do tenant ou o usuário adm?

No modelo do projeto GUS, a criação de estúdios (tenants) foi projetada para ser um processo híbrido, mas focado na autonomia do usuário (Diretor do Estúdio) e na gestão do Super Admin, não dependendo de intervenção direta do desenvolvedor no banco de dados.

Com base na lógica implementada nos controllers e nos planos de melhoria, funciona assim:

1. O Usuário cria ao se cadastrar (Auto-provisionamento)
Conforme o arquivo PLANO_MELHORIA_LOGIN.md e a lógica no solicitanteController.js, o sistema é "inteligente":

Quando um novo usuário acessa a página de cadastro (loginCriar.html) e digita um nome de estúdio que ainda não existe no Banco Master:
O backend cria automaticamente o registro do Estúdio no banco Master.
O sistema gera um tenantDbName único (ex: gus_tenant_meu-estudio-l2k3j4).
O sistema inicializa o banco de dados isolado para esse estúdio.
Esse primeiro usuário recebe automaticamente a role: 'admin', tornando-se o "Dono/Diretor" daquele estúdio.
2. O Super Admin cria manualmente (Gestão Centralizada)
No arquivo adminRoutes.js e adminController.js, existe a rota POST /admin/estudios.

Um usuário que já possui privilégios de administrador global pode criar estúdios manualmente pelo Painel Administrativo.
Isso é útil para quando você quer vender o software como serviço (SaaS) e você mesmo cadastra os clientes antes de entregar o acesso a eles.
Por que você viu o tenantDbName: "desconhecido"?
Aquele log que você mencionou antes aconteceu provavelmente porque:

Um usuário se cadastrou.
O campo "Estúdio" no frontend foi enviado vazio ou com o valor padrão "desconhecido".
A lógica de gerarTenantDbName no controller pegou esse nome e criou um banco de dados para o "Estúdio Desconhecido".
Resumo da responsabilidade:
Desenvolvedor: Cria o código e a infraestrutura (o "molde").
Usuário Diretor: Cria o seu próprio espaço (tenant) ao se registrar pela primeira vez.
Super Admin: Gerencia, limpa ou cria estúdios conforme a necessidade de manutenção.