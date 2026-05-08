import bcrypt from 'bcrypt';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { getSolicitanteModel } from '../models/usuariosmodel.js';
import { enviarEmailRecuperacao } from '../services/emailService.js';

/**
 * Realiza o login do usuário, verificando as credenciais no banco de dados Master.
 * Se o login for bem-sucedido, armazena os dados do usuário na sessão,
 * incluindo o `tenantDbName` para a arquitetura multi-tenant.
 */
export const login = async (req, res) => {
    // Permite login com 'email' ou 'solicitante' (nome de usuário)
    const { email, password, solicitante } = req.body;
    const loginIdentifier = (email || solicitante)?.trim();

    if (!loginIdentifier || !password) {
        return res.status(400).json({ error: 'Usuário/Email e senha são obrigatórios.' });
    }

    try {
        // Obtém o modelo 'Solicitante' da conexão principal (Master)
        const Solicitante = getSolicitanteModel(mongoose.connection);

        // Constrói a query para buscar por email ou nome de usuário
        const query = {};
        if (email) {
            // Busca por email (case-insensitive)
            query.email = email.trim().toLowerCase();
        } else {
            // Busca por nome de usuário de forma insensível a maiúsculas (case-insensitive)
            query.solicitante = { $regex: new RegExp(`^${solicitante.trim()}$`, 'i') };
        }
        
        const usuario = await Solicitante.findOne(query).lean();

        if (!usuario) {
            // Retornamos 401 para não dar pista se o usuário existe ou não (boa prática)
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        const senhaCorreta = await bcrypt.compare(password, usuario.senha);

        if (!senhaCorreta) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        // Armazena as informações essenciais do usuário na sessão
        req.session.user = {
            _id: usuario._id,
            solicitante: usuario.solicitante, // O nome do usuário
            email: usuario.email,
            role: usuario.role, // A permissão do usuário
            tenantDbName: usuario.tenantDbName, // Campo CRÍTICO para o multi-tenant
        };

        // Retorna uma resposta de sucesso com os dados do usuário para o frontend
        res.status(200).json({ message: 'Login bem-sucedido!', usuario: req.session.user });

    } catch (error) {
        console.error('Erro no processo de login:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao tentar fazer login.' });
    }
};

/**
 * Realiza o logout do usuário, destruindo a sessão ativa.
 */
export const logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Erro ao destruir a sessão:', err);
            return res.status(500).json({ error: 'Não foi possível fazer logout. Tente novamente.' });
        }
        // Limpa o cookie do cliente para garantir que a sessão foi encerrada
        res.clearCookie('connect.sid'); // 'connect.sid' é o nome padrão do cookie de sessão do Express
        res.status(200).json({ message: 'Logout bem-sucedido.' });
    });
};

/**
 * Verifica se existe uma sessão de usuário ativa.
 * Usado pelo frontend para manter o estado de autenticação do usuário.
 */
export const verificarSessao = (req, res) => {
    if (req.session && req.session.user) {
        // Se a sessão existe, retorna os dados do usuário
        res.status(200).json(req.session.user);
    } else {
        // Se não há sessão, retorna um status de não autenticado
        res.status(401).json({ error: 'Usuário não autenticado.' });
    }
};

export const solicitarRecuperacao = async (req, res) => {
    const { solicitante, email } = req.body;

    if (!solicitante || !email) {
        return res.status(400).json({ error: 'Usuario e e-mail sao obrigatorios.' });
    }

    const RESPOSTA_GENERICA = { message: 'Se os dados estiverem corretos, voce recebera as instrucoes em breve.' };

    try {
        const Solicitante = getSolicitanteModel(mongoose.connection);
        const usuario = await Solicitante.findOne({
            solicitante: { $regex: new RegExp(`^${solicitante.trim()}$`, 'i') },
            email: email.toLowerCase().trim()
        }).select('+passwordResetToken +passwordResetExpires');

        // Resposta generica para evitar enumeracao — nao revela se usuario/e-mail existem.
        if (!usuario) {
            return res.status(200).json(RESPOSTA_GENERICA);
        }

        const tokenBruto = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(tokenBruto).digest('hex');

        usuario.passwordResetToken = tokenHash;
        usuario.passwordResetExpires = new Date(Date.now() + 3_600_000);
        await usuario.save();

        await enviarEmailRecuperacao(usuario.email, tokenBruto);

        return res.status(200).json(RESPOSTA_GENERICA);
    } catch (error) {
        console.error('[solicitarRecuperacao]', error);
        return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
    }
};

export const resetarSenha = async (req, res) => {
    const { token, novaSenha } = req.body;

    if (!token || !novaSenha) {
        return res.status(400).json({ error: 'Token e nova senha sao obrigatorios.' });
    }

    if (novaSenha.length < 6) {
        return res.status(400).json({ error: 'A senha deve ter no minimo 6 caracteres.' });
    }

    try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const Solicitante = getSolicitanteModel(mongoose.connection);
        const usuario = await Solicitante.findOne({
            passwordResetToken: tokenHash,
            passwordResetExpires: { $gt: Date.now() }
        }).select('+passwordResetToken +passwordResetExpires');

        if (!usuario) {
            return res.status(400).json({ error: 'Token invalido ou expirado.' });
        }

        usuario.senha = await bcrypt.hash(novaSenha, 12);
        usuario.passwordResetToken = undefined;
        usuario.passwordResetExpires = undefined;
        await usuario.save();

        return res.status(200).json({ message: 'Senha redefinida com sucesso.' });
    } catch (error) {
        console.error('[resetarSenha]', error);
        return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
    }
};
