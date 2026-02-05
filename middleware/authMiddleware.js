import usoModelo from "../src/models/utilizacaomodel.js";

/**
 * Middleware de Autenticação (authMiddleware)(Session-Based Authentication)
 * -----------------------------------------------------------------------------
 * Este middleware protege as rotas, garantindo que apenas usuários logados
 * tenham acesso.
 *
 * Explicação passo a passo para estudo:
 * 1. Verifica se existe uma sessão ativa (`req.session.user`).
 * 2. Se NÃO existir (usuário não logado):
 *    a. Verifica se a requisição espera JSON (API) ou é uma rota específica.
 *       - Se sim: Retorna erro 401 (Unauthorized) em JSON.
 *       - Isso evita que o frontend tente ler HTML de login como JSON.
 *    b. Se não (navegador comum): Redireciona para a página de login.
 * 3. Se existir (usuário logado):
 *    - Chama `next()` para permitir que a requisição continue para a rota.
 */
export function authMiddleware(req, res, next) {
    // 1. Verificação da Sessão: Se req.session.user for undefined/null, não está logado.
    if (!req.session.user) {
        
        // 2. Tratamento para APIs e Requisições JSON
        // Verifica se o header 'Accept' pede JSON ou se a URL contém '/rotas-disponiveis'
        if ((req.headers.accept && req.headers.accept.includes('application/json')) || req.originalUrl.includes('/rotas-disponiveis')) {
            // Retorna status 401 (Não Autorizado) com mensagem JSON
            return res.status(401).json({ error: 'Usuário não autenticado. Faça login primeiro.' });
        }

        // 3. Tratamento para Navegação Comum (Navegador)
        // Redireciona o usuário para a tela de login
        return res.redirect('/login.html');
    }

    // 4. Permissão de Acesso (Usuário Logado)
    // Passa o controle para a próxima função ou rota definida
    next();
}

// Verifica se o usuário tem permissão de administrador
export async function verificaRole(req, res, next) {
    const { role: userRole } = req.session.user;
    const role = 'admin';

    if (userRole !== role) {
        console.log('Você não tem permissão para acessar');
        return res.status(403).json({ error: 'Você não tem permissão para acessar esta rota' });
    }

    next();
}

// Verifica se o usuário logado é o dono do registro alvo
export async function verificaSolicitante(req, res, next) {

    try {
        const uso = await usoModelo.findById(req.params.id); 
        
        if (!uso) {
            return res.status(404).json({ error: 'Registro não encontrado' });
        }

        // Compara IDs (convertendo para string para garantir igualdade)
        const solicitanteIdUso = uso.solicitante.toString();
        const solicitanteIdSession = req.session.user?._id; 
        const roleSession = req.session.user?.role;

        if (!solicitanteIdSession) {
            console.log('Usuário não autenticado');
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        
        // Verifica se é o dono do registro OU se é admin
        if (roleSession !== 'admin' && solicitanteIdUso !== String(solicitanteIdSession)) {
            console.log('Você não tem permissão para excluir este uso');
            return res.status(403).json({ error: 'Você não tem permissão para excluir/editar este uso' });
        }
        
        next();
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao verificar permissão para excluir/editar uso' });
    }
}

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

//verifica duplicidade do uso para evitar o registro do mesmo uso
export async function verificaDuplicidade(req, res, next) {
    const { sala, dia, hora } = req.body;
    const uso = await usoModelo.findOne({ sala, dia, hora });
    if (uso) {
        
        return res.status(400).json({ error: 'Uso duplicado' });
    }
    next();
}


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