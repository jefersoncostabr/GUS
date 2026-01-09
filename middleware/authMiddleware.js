import usoModelo from "../src/models/utilizacaomodel.js";

// Verifica se o usuário está autenticado (sessão ativa)
export function authMiddleware(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login.html');
    }
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