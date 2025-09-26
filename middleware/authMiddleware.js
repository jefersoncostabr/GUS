import usoModelo from "../src/models/utilizacaomodel.js";

export function authMiddleware(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login.html');
    }
    next();
}

export async function verificaRole(req, res, next) {
    const { role: userRole } = req.session.user;
    const role = 'admin';

    if (userRole !== role) {
        return res.status(403).json({ error: 'Você não tem permissão para acessar esta rota' });
    }

    next();
}

export async function verificaSolicitante(req, res, next) {

    try {
        const uso = await usoModelo.findById(req.params.id); 
        const solicitanteUso = uso.solicitante;
        const solicitanteSession = req.session.user?.solicitante; 

        if (!solicitanteSession) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        
        if (solicitanteUso !== solicitanteSession) {
            return res.status(403).json({ error: 'Você não tem permissão para excluir este uso' });
        }
        
        next();
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao verificar permissão para excluir uso' });
    }
}


// Como acessar propriedades

// Propriedade dos parametros
//const uso = await usoModelo.findById(req.params.id); 
//const solicitanteUso = uso.solicitante;

// Propriedade da sessão
// const solicitanteSession = req.session.user?.solicitante; 
// const roleSession = req.session.user?.role; 
// O ponto e interrogação ? serve para evitar erros