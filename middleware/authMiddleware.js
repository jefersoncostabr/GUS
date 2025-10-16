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
        console.log('Você não tem permissão para acessar');
        document.getElementById('painelSaida').innerText = 'Sem permissão';
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
            console.log('Usuário não autenticado');
            document.getElementById('painelSaida').innerText = 'Não autenticado';
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        
        if (solicitanteUso !== solicitanteSession) {
            console.log('Você não tem permissão para excluir este uso');
            document.getElementById('painelSaida').innerText = 'Sem permissão';
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