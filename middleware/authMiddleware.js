/**
 * Middleware de Autenticação (authMiddleware)(Session-Based Authentication)
 * -----------------------------------------------------------------------------
 * Este middleware protege as rotas, garantindo que apenas usuários logados
 * tenham acesso.
 *
 * Explicação passo a passo para estudo:
 * 1. Verifica se existe uma sessão ativa (`req.session.user`).
 * 2. Se NÃO existir (usuário não logado):
 *    a. Requisições de API recebem erro 401 em JSON.
 *    b. Navegação HTML é redirecionada para o login com um aviso.
 * 3. Se existir (usuário logado):
 *    - Chama `next()` para permitir que a requisição continue para a rota.
 */
export function authMiddleware(req, res, next) {
    // 1. Verificação da Sessão: Se req.session.user for undefined/null, não está logado.
    if (!req.session.user) {
        
        console.log(`[BLOQUEIO AUTH] Requisição sem sessão: ${req.method} ${req.originalUrl}`);

        const acceptHeader = req.headers?.accept || '';
        const isApiRoute = req.originalUrl.includes('/solicitantes') || 
                           req.originalUrl.includes('/admin') || 
                           req.originalUrl.includes('/usos') ||
                           req.originalUrl.includes('/platform');
        const isHtmlNavigation = req.method === 'GET'
            && acceptHeader.includes('text/html')
            && !acceptHeader.includes('application/json');

        if (req.method !== 'GET' || isApiRoute || !isHtmlNavigation) {
            console.log(` -> Resposta: 401 JSON (Correto para APIs)`);
            return res.status(401).json({
                error: 'É necessário fazer login para acessar esta rota.',
                loginUrl: '/login.html'
            });
        }

        console.log(' -> Redirecionando para login com aviso de autenticação necessária.');
        return res.redirect('/login.html?aviso=login-obrigatorio');
    }

    // 4. Permissão de Acesso (Usuário Logado)
    // Passa o controle para a próxima função ou rota definida
    next();
}

// Verifica se o usuário tem permissão de administrador
export async function verificaRole(req, res, next) {
    const { role: userRole } = req.session.user;
    const rolesPermitidas = ['admin', 'adm'];

    if (!rolesPermitidas.includes(userRole)) {
        console.log('Você não tem permissão para acessar');
        return res.status(403).json({ error: 'Você não tem permissão para acessar esta rota' });
    }

    next();
}

export function requireSuperAdmin(req, res, next) {
    if (req.session?.user?.role !== 'superadmin') {
        return res.status(403).json({ error: 'Acesso restrito ao desenvolvedor.' });
    }
    next();
}

export function requireTenantCanCreate(req, res, next) {
    const lifecycle = req.tenantLifecycle;
    if (!lifecycle || lifecycle.approvalStatus === 'approved') return next();

    const expirado = !lifecycle.trialEndsAt
        || new Date(lifecycle.trialEndsAt).getTime() <= Date.now();
    if (lifecycle.approvalStatus === 'pending' && !expirado) return next();

    return res.status(423).json({
        error: lifecycle.approvalStatus === 'rejected'
            ? 'Este tenant foi reprovado. Novas inclusões estão bloqueadas.'
            : 'O período de teste expirou. Novas inclusões estão bloqueadas; edição e exclusão continuam disponíveis.',
        tenantLocked: true
    });
}

// ⚠️ IMPORTANTE: verificaSolicitante foi removida deste arquivo
// Movida para dentro do controller, após tenantMiddleware ter injetado os modelos
// Ver: src/controllers/usoController.js - validação implementada nas funções PUT/DELETE

// Verifica se o usuário logado é o dono da conta que está tentando alterar
export async function verificaPermissaoSolicitante(req, res, next) {
    try {
        const idAlvo = req.params.id;
        const idSessao = req.session.user?._id;
        const role = req.session.user?.role;

        // Admin pode tudo, usuário comum só pode mexer no próprio ID
        if (role !== 'admin' && idAlvo !== idSessao) {
            return res.status(403).json({ error: 'Você não tem permissão para alterar este usuário' });
        }

        next();
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao verificar permissão de usuário' });
    }
}

// Bloqueia usuários com role 'pendente' (cadastro aguardando aprovação do admin)
export function verificaPendente(req, res, next) {
    if (req.session?.user?.role === 'pendente') {
        return res.status(403).json({
            error: 'Acesso pendente de aprovação do administrador do estúdio.'
        });
    }
    next();
}

//verifica duplicidade do uso para evitar o registro do mesmo uso
// ⚠️ IMPORTANTE: verificaDuplicidade foi removida deste arquivo
// Movida para dentro do controller, após tenantMiddleware ter injetado os modelos
// Ver: src/controllers/usoController.js - validação implementada na função POST


// Como acessar propriedades

// Propriedade dos parametros
//const uso = await usoModelo.findById(req.params.id); 
//const solicitanteUso = uso.solicitante;

// Propriedade da sessão
// const solicitanteSession = req.session.user?.solicitante; 
// const roleSession = req.session.user?.role; 
// O ponto e interrogação ? serve para evitar erros

/*
================================================================================
DOCUMENTAÇÃO DO ARQUIVO: authMiddleware.js
================================================================================

1. FINALIDADE
   Centraliza os middlewares de segurança e validação de regras de negócio
   utilizados nas rotas da aplicação.

2. FUNÇÕES
   - authMiddleware: Garante que a rota só seja acessada por usuários logados.
   - verificaRole: Restringe o acesso apenas a usuários com perfil 'admin'.
   - verificaSolicitante: Garante que apenas o criador do registro possa 
     alterá-lo ou excluí-lo.
   - verificaDuplicidade: Impede agendamentos conflitantes (mesma sala, dia e hora).

3. OBSERVAÇÕES
   - Utiliza a sessão (req.session.user) para validar permissões.
   - Interage com o modelo 'usoModelo' para validações de banco de dados.
================================================================================
*/