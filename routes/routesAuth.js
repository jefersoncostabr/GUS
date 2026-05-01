import express from 'express'
import { login, logout, verificarSessao } from '../src/controllers/authController.js'

const routesAuth = express.Router()

// Rota de Login: Recebe credenciais, verifica e cria a sessão
routesAuth.post('/login', login)

// Rota de Logout: Destrói a sessão do usuário
routesAuth.post('/logout', logout)

// Rota para o frontend verificar quem está logado
routesAuth.get('/usuario-logado', verificarSessao);

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
