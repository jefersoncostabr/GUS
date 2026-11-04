import express from 'express';
import { authMiddleware, requireSuperAdmin, verificaRole } from '../middleware/authMiddleware.js';

const router = express.Router();

const rotasDisponiveis = [
    { metodo: 'GET', endpoint: '/rotas-disponiveis', descricao: 'Exibe as rotas gerais da API; acesso admin/adm' },
    { metodo: 'GET', endpoint: '/', descricao: 'Verifica se a API está acessível' },

    // Autenticação
    { metodo: 'POST', endpoint: '/login', descricao: 'Login de usuário' },
    { metodo: 'POST', endpoint: '/logout', descricao: 'Encerra a sessão' },
    { metodo: 'GET', endpoint: '/usuario-logado', descricao: 'Verifica sessão ativa' },
    { metodo: 'POST', endpoint: '/esqueci-senha', descricao: 'Solicita recuperação de senha' },
    { metodo: 'POST', endpoint: '/resetar-senha', descricao: 'Redefine a senha com token' },

    // Cadastro e consulta pública
    { metodo: 'GET', endpoint: '/solicitantes/lista-simples', descricao: 'Lista estúdios para o cadastro público' },
    { metodo: 'POST', endpoint: '/solicitantes', descricao: 'Cadastra solicitante ou novo estúdio' },

    // Estúdios do usuário autenticado
    { metodo: 'GET', endpoint: '/estudios', descricao: 'Lista estúdios associados ao usuário autenticado' },

    // Usos (Agendamentos)
    { metodo: 'GET', endpoint: '/usos', descricao: 'Rota de teste inicial de usos' },
    { metodo: 'GET', endpoint: '/usos/usos', descricao: 'Lista usos (paginado)' },
    { metodo: 'GET', endpoint: '/usos/usos/:id', descricao: 'Detalhes de um uso específico' },
    { metodo: 'POST', endpoint: '/usos/usos', descricao: 'Cadastra novo uso' },
    { metodo: 'POST', endpoint: '/usos/usos/gerar-teste', descricao: 'Cria usos de teste (admin/adm)' },
    { metodo: 'PUT', endpoint: '/usos/usos/:id', descricao: 'Atualiza um uso existente' },
    { metodo: 'DELETE', endpoint: '/usos/usos/:id', descricao: 'Remove um uso' },
    { metodo: 'GET', endpoint: '/usos/buscaid', descricao: 'Busca ID de uso por filtros' },

    // Solicitantes
    { metodo: 'GET', endpoint: '/solicitantes', descricao: 'Rota de teste inicial de solicitantes' },
    { metodo: 'GET', endpoint: '/solicitantes/solicitantes', descricao: 'Lista solicitantes do tenant' },
    { metodo: 'GET', endpoint: '/solicitantes/solicitantes/:id', descricao: 'Busca solicitante por ID' },
    { metodo: 'GET', endpoint: '/solicitantes/buscaidsolicitante', descricao: 'Busca ID de solicitante por filtros' },
    { metodo: 'PUT', endpoint: '/solicitantes/solicitantes/:id', descricao: 'Atualiza solicitante existente' },
    { metodo: 'DELETE', endpoint: '/solicitantes/solicitantes/:id', descricao: 'Remove solicitante' },

    // Administração do tenant
    { metodo: 'GET', endpoint: '/admin/usuarios', descricao: 'Lista usuários do tenant' },
    { metodo: 'GET', endpoint: '/admin/usuarios/:id', descricao: 'Busca usuário do tenant por ID' },
    { metodo: 'POST', endpoint: '/admin/usuarios', descricao: 'Cria usuário no tenant' },
    { metodo: 'PUT', endpoint: '/admin/usuarios/:id', descricao: 'Atualiza usuário do tenant' },
    { metodo: 'DELETE', endpoint: '/admin/usuarios/:id', descricao: 'Remove usuário do tenant' },

    { metodo: 'GET', endpoint: '/admin/estudios', descricao: 'Lista estúdios do tenant' },
    { metodo: 'POST', endpoint: '/admin/estudios', descricao: 'Cria um estúdio' },
    { metodo: 'PUT', endpoint: '/admin/estudios/:id', descricao: 'Atualiza um estúdio' },
    { metodo: 'DELETE', endpoint: '/admin/estudios/:id', descricao: 'Remove um estúdio' },

    { metodo: 'GET', endpoint: '/admin/motivos', descricao: 'Lista motivos' },
    { metodo: 'POST', endpoint: '/admin/motivos', descricao: 'Cria um motivo' },
    { metodo: 'PUT', endpoint: '/admin/motivos/:id', descricao: 'Atualiza um motivo' },
    { metodo: 'DELETE', endpoint: '/admin/motivos/:id', descricao: 'Remove um motivo' },

    { metodo: 'GET', endpoint: '/admin/salas', descricao: 'Lista salas' },
    { metodo: 'POST', endpoint: '/admin/salas', descricao: 'Cria uma sala' },
    { metodo: 'PUT', endpoint: '/admin/salas/:id', descricao: 'Atualiza uma sala' },
    { metodo: 'DELETE', endpoint: '/admin/salas/:id', descricao: 'Remove uma sala' },

    { metodo: 'GET', endpoint: '/admin/aulas', descricao: 'Lista aulas regulares' },
    { metodo: 'POST', endpoint: '/admin/aulas', descricao: 'Cria uma aula regular' },
    { metodo: 'PUT', endpoint: '/admin/aulas/:id', descricao: 'Atualiza uma aula regular' },
    { metodo: 'DELETE', endpoint: '/admin/aulas/:id', descricao: 'Remove uma aula regular' },

    // Relatórios
    { metodo: 'GET', endpoint: '/admin/relatorios/semana', descricao: 'Relatório de agendamentos da semana' },
    { metodo: 'GET', endpoint: '/admin/relatorios/mes', descricao: 'Relatório de agendamentos do mês' },
    { metodo: 'GET', endpoint: '/admin/relatorios/professor/:id', descricao: 'Relatório de usos por professor' },
    { metodo: 'GET', endpoint: '/admin/relatorios/aulas', descricao: 'Relatório de aulas regulares' },
    { metodo: 'GET', endpoint: '/admin/relatorios/professores', descricao: 'Lista professores para relatórios' },

    // Manutenção do tenant
    { metodo: 'DELETE', endpoint: '/admin/limpar/usos', descricao: 'Remove todos os usos do tenant' },
    { metodo: 'DELETE', endpoint: '/admin/limpar/motivos', descricao: 'Remove todos os motivos do tenant' },
    { metodo: 'DELETE', endpoint: '/admin/limpar/salas', descricao: 'Remove todas as salas do tenant' },
    { metodo: 'DELETE', endpoint: '/admin/limpar/aulas', descricao: 'Remove todas as aulas regulares do tenant' },
    { metodo: 'DELETE', endpoint: '/admin/limpar/tudo', descricao: 'Remove dados operacionais do tenant' }
];

const rotasSuperAdmin = [
    { metodo: 'GET', endpoint: '/rotas-superadimin', descricao: 'Exibe as rotas exclusivas de superadmin' },
    { metodo: 'GET', endpoint: '/platform/tenants', descricao: 'Lista tenants da plataforma' },
    { metodo: 'GET', endpoint: '/platform/tenants/pending-approval', descricao: 'Lista tenants aguardando aprovação' },
    { metodo: 'POST', endpoint: '/platform/tenants/:id/approve', descricao: 'Aprova um tenant' },
    { metodo: 'POST', endpoint: '/platform/tenants/:id/reject', descricao: 'Reprova um tenant' },
    { metodo: 'DELETE', endpoint: '/platform/tenants/:id', descricao: 'Exclui tenant, banco, usuários e sessões relacionados' }
];

function criarRespostaRotas(req, rotas) {
    const forwardedProto = req.headers['x-forwarded-proto'];
    const protocolo = forwardedProto ? forwardedProto.split(',')[0] : req.protocol;
    const baseUrl = `${protocolo}://${req.get('host')}`;

    return {
        baseUrl,
        ambiente: process.env.NODE_ENV || 'development',
        rotas: rotas.map(rota => ({ ...rota, urlCompleta: `${baseUrl}${rota.endpoint}` }))
    };
}

router.get('/rotas-disponiveis', authMiddleware, verificaRole, (req, res) => {
    res.json(criarRespostaRotas(req, rotasDisponiveis));
});

router.get('/rotas-superadimin', authMiddleware, requireSuperAdmin, (req, res) => {
    res.json(criarRespostaRotas(req, rotasSuperAdmin));
});

export default router;
