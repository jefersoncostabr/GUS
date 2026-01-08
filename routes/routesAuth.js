import Router from 'express'
import bcrypt from 'bcrypt'
import solicitanteModelo from '../src/models/usuariosmodel.js'

const routesAuth = Router()

// Compara a senha fornecida (texto plano) com o hash armazenado no banco
async function comparePasswords(password, hashedPassword) {
    try {
        if (!hashedPassword) {
            console.log('Hashedpassword é empty ou undefined')
            return false
        }
        const match = await bcrypt.compare(password, hashedPassword)
        return match
    } catch (error) {
        console.error('Erro ao comparar senhas:', error)
        return false
    }
}

// Busca um usuário no banco de dados pelo nome do solicitante
async function encontraUmUsuario(nomeSolicitante) {
    try {
        if (!nomeSolicitante || typeof nomeSolicitante !== 'string') return null

        // Busca utilizando Regex para ignorar maiúsculas/minúsculas (Case Insensitive)
        // O .trim() remove espaços acidentais no início/fim e ^...$ garante correspondência exata
        const nomeRegex = new RegExp(`^${nomeSolicitante.trim()}$`, 'i')
        const usuario = await solicitanteModelo.findOne({ solicitante: { $regex: nomeRegex } })
        return usuario
    } catch (err) {
        console.error('Erro na query de usuário:', err)
        throw err // repassa para o catch da rota
    }
}

// Rota de Login: Recebe credenciais, verifica e cria a sessão
routesAuth.post('/login', async (req, res) => {
    try {
        const { solicitante, password } = req.body

        const usuario = await encontraUmUsuario(solicitante)

        if (!usuario) {
            return res.status(401).json({ error: 'Usuário não encontrado' })
        }

        const passwordDoBanco = usuario.senha

        const passwordMatch = await comparePasswords(password, passwordDoBanco)

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Senha inválida' })
        }

        req.session.user = { solicitante: usuario.solicitante, role: usuario.role, _id: usuario._id }
        return res.json({ message: 'Login realizado!' })
    } catch (err) {
        console.error('Erro no login:', err)
        res.status(500).json({ error: 'Erro no servidor' })
    }
})

// Rota de Logout: Destrói a sessão do usuário
routesAuth.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ message: 'Logout feito' })
    })
})

// Rota para o frontend verificar quem está logado
// Retornamos sempre 200 para evitar erros 401 exibidos no console do navegador.
// Quando o usuário não está logado retornamos `{ authenticated: false }`.
routesAuth.get('/usuario-logado', (req, res) => {
    if (req.session && req.session.user) {
        return res.status(200).json(req.session.user);
    }
    return res.status(200).json({ authenticated: false });
});

export default routesAuth

/*
================================================================================
DOCUMENTAÇÃO DO ARQUIVO: routesAuth.js
================================================================================

1. FINALIDADE
   Gerencia as rotas relacionadas à autenticação de usuários (Login, Logout e
   Verificação de Sessão).

2. FUNÇÕES PRINCIPAIS
   - comparePasswords: Utiliza bcrypt para validar a senha fornecida contra o hash.
   - encontraUmUsuario: Consulta o banco de dados para recuperar dados do usuário.
   - POST /login: Autentica o usuário e inicializa a sessão (req.session.user).
   - POST /logout: Encerra a sessão ativa.
   - GET /usuario-logado: Retorna os dados do usuário da sessão atual para o frontend.

3. OBSERVAÇÕES
   - Utiliza 'bcrypt' para segurança das senhas.
   - Interage com 'solicitanteModelo' para buscar dados no MongoDB.
================================================================================
*/
