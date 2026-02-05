import bcrypt from 'bcrypt';
import solicitanteModelo from '../models/usuariosmodel.js';

// Compara a senha fornecida (texto plano) com o hash armazenado no banco
async function comparePasswords(password, hashedPassword) {
    try {
        if (!hashedPassword) return false;
        const match = await bcrypt.compare(password, hashedPassword);
        return match;
    } catch (error) {
        console.error('Erro ao comparar senhas:', error);
        return false;
    }
}

// Busca um usuário no banco de dados pelo nome do solicitante
async function encontraUmUsuario(nomeSolicitante) {
    try {
        if (!nomeSolicitante || typeof nomeSolicitante !== 'string') return null;

        // Busca utilizando Regex para ignorar maiúsculas/minúsculas
        const nomeRegex = new RegExp(`^${nomeSolicitante.trim()}$`, 'i');
        const usuario = await solicitanteModelo.findOne({ solicitante: { $regex: nomeRegex } });
        return usuario;
    } catch (err) {
        console.error('Erro na query de usuário:', err);
        throw err;
    }
}

export async function login(req, res) {
    try {
        const { solicitante, password } = req.body;

        const usuario = await encontraUmUsuario(solicitante);

        if (!usuario) {
            return res.status(401).json({ error: 'Usuário não encontrado' });
        }

        const passwordDoBanco = usuario.senha;
        const passwordMatch = await comparePasswords(password, passwordDoBanco);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Senha inválida' });
        }

        req.session.user = { solicitante: usuario.solicitante, role: usuario.role, _id: usuario._id };
        return res.json({ message: 'Login realizado!' });
    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ error: 'Erro no servidor' });
    }
}

export const logout = (req, res) => {
    req.session.destroy(() => {
        res.json({ message: 'Logout feito' });
    });
};

export const verificarSessao = (req, res) => {
    if (req.session && req.session.user) {
        return res.status(200).json(req.session.user);
    }
    return res.status(200).json({ authenticated: false });
};