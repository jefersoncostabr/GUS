import express from 'express';
import { authMiddleware, verificaRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/rotas-disponiveis', authMiddleware, verificaRole, (req, res) => {
    // Detecta o protocolo (http ou https) e o host automaticamente
    // 'x-forwarded-proto' é importante para proxies como o do Render
    // Nota: Em alguns casos, o header pode vir como lista (ex: 'https, http'), pegamos o primeiro.
    const forwardedProto = req.headers['x-forwarded-proto'];
    const protocolo = forwardedProto ? forwardedProto.split(',')[0] : req.protocol;
    
    const host = req.get('host');
    const baseUrl = `${protocolo}://${host}`;

    const rotas = [
        { metodo: 'GET', endpoint: '/rotas-disponiveis', descricao: 'Exibe este mapa de rotas' },
        
        // Autenticação
        { metodo: 'POST', endpoint: '/login', descricao: 'Login de usuário' },
        { metodo: 'POST', endpoint: '/logout', descricao: 'Encerra a sessão' },
        { metodo: 'GET', endpoint: '/usuario-logado', descricao: 'Verifica sessão ativa' },

        // Usos (Agendamentos)
        { metodo: 'GET', endpoint: '/usos', descricao: 'Rota de teste inicial de usos' },
        { metodo: 'GET', endpoint: '/usos/usos', descricao: 'Lista usos (paginado)' },
        { metodo: 'GET', endpoint: '/usos/usos/:id', descricao: 'Detalhes de um uso específico' },
        { metodo: 'POST', endpoint: '/usos/usos', descricao: 'Cadastra novo uso' },
        { metodo: 'PUT', endpoint: '/usos/usos/:id', descricao: 'Atualiza um uso existente' },
        { metodo: 'DELETE', endpoint: '/usos/usos/:id', descricao: 'Remove um uso' },
        { metodo: 'GET', endpoint: '/usos/buscaid', descricao: 'Busca ID de uso por filtros' },

        // Solicitantes
        { metodo: 'GET', endpoint: '/solicitantes', descricao: 'Rota de teste inicial de solicitantes' },
        { metodo: 'GET', endpoint: '/solicitantes/solicitantes', descricao: 'Lista todos os solicitantes' },
        { metodo: 'GET', endpoint: '/solicitantes/solicitantes/:id', descricao: 'Busca solicitante por ID' },
        { metodo: 'GET', endpoint: '/solicitantes/buscaidsolicitante', descricao: 'Busca ID de solicitante por filtros' },
        { metodo: 'POST', endpoint: '/solicitantes/solicitantes', descricao: 'Cadastra solicitante' },
        { metodo: 'PUT', endpoint: '/solicitantes/solicitantes/:id', descricao: 'Atualiza solicitante existente' },
        { metodo: 'DELETE', endpoint: '/solicitantes/solicitantes/:id', descricao: 'Remove solicitante' },

        // Admin - Estúdios
        { metodo: 'GET', endpoint: '/admin/estudios', descricao: 'Lista todos os estúdios' },
        { metodo: 'POST', endpoint: '/admin/estudios', descricao: 'Cria um novo estúdio' },
        { metodo: 'PUT', endpoint: '/admin/estudios/:id', descricao: 'Atualiza um estúdio' },
        { metodo: 'DELETE', endpoint: '/admin/estudios/:id', descricao: 'Remove um estúdio' },

        // Admin - Motivos
        { metodo: 'GET', endpoint: '/admin/motivos', descricao: 'Lista todos os motivos' },
        { metodo: 'POST', endpoint: '/admin/motivos', descricao: 'Cria um novo motivo' },
        { metodo: 'PUT', endpoint: '/admin/motivos/:id', descricao: 'Atualiza um motivo existente' },
        { metodo: 'DELETE', endpoint: '/admin/motivos/:id', descricao: 'Remove um motivo' },

        // Admin - Salas
        { metodo: 'GET', endpoint: '/admin/salas', descricao: 'Lista todas as salas' },
        { metodo: 'POST', endpoint: '/admin/salas', descricao: 'Cria uma nova sala' },
        { metodo: 'PUT', endpoint: '/admin/salas/:id', descricao: 'Atualiza uma sala' },
        { metodo: 'DELETE', endpoint: '/admin/salas/:id', descricao: 'Remove uma sala' },

        // Admin - Aulas Regulares
        { metodo: 'GET', endpoint: '/admin/aulas', descricao: 'Lista todas as aulas regulares' },
        { metodo: 'POST', endpoint: '/admin/aulas', descricao: 'Cria uma nova aula regular' },
        { metodo: 'PUT', endpoint: '/admin/aulas/:id', descricao: 'Atualiza uma aula regular' },
        { metodo: 'DELETE', endpoint: '/admin/aulas/:id', descricao: 'Remove uma aula regular' },

        // Admin - Manutenção (Limpeza de Banco de Dados)
        { metodo: 'DELETE', endpoint: '/admin/limpar/solicitantes', descricao: 'Remove todos os solicitantes' },
        { metodo: 'DELETE', endpoint: '/admin/limpar/usos', descricao: 'Remove todos os usos' },
        { metodo: 'DELETE', endpoint: '/admin/limpar/estudios', descricao: 'Remove todos os estúdios' },
        { metodo: 'DELETE', endpoint: '/admin/limpar/motivos', descricao: 'Remove todos os motivos' },
        { metodo: 'DELETE', endpoint: '/admin/limpar/salas', descricao: 'Remove todas as salas' },
        { metodo: 'DELETE', endpoint: '/admin/limpar/aulas', descricao: 'Remove todas as aulas regulares' },
        { metodo: 'DELETE', endpoint: '/admin/limpar/tudo', descricao: 'LIMPA TODO O BANCO DE DADOS' },
    ];

    res.json({
        baseUrl: baseUrl,
        ambiente: process.env.NODE_ENV || 'development',
        rotas: rotas.map(r => ({ ...r, urlCompleta: `${baseUrl}${r.endpoint}` }))
    });
});

export default router;