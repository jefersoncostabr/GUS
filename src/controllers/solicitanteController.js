import { getSolicitanteModel } from "../models/usuariosmodel.js";
import { getEstudioModel } from "../models/estudiomodel.js";
import { getTenantConnection, dropTenantDatabase } from "../config/connectionFactory.js";
import { enviarAvisoNovoTenant } from "../services/emailService.js";
import bcrypt from "bcrypt";
import crypto from 'node:crypto';
import mongoose from "mongoose";

const masterConnection = mongoose.connection;

function escaparRegex(valor) {
    return valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Lista todos os estúdios com apenas nome e ID (para preenchimento do modal no frontend).
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const listarEstudiosSimples = async (req, res) => {
    console.log("[CONTROLLER] Acessando listarEstudiosSimples (público)");
    try {
        const EstudioModel = getEstudioModel(masterConnection);
        const estudios = await EstudioModel.find({}, 'nome _id');
        res.status(200).json(estudios);
    } catch (error) {
        console.error('Erro ao listar estúdios:', error);
        res.status(500).json({ error: 'Erro ao buscar estúdios' });
    }
};

/**
 * Gera um slug único para o banco de dados do tenant baseado no nome do estúdio.
 * Ex: "Estúdio Centro" -> "estudio-centro"
 * @param {string} estudioName - O nome do estúdio
 * @returns {string} Um slug único formatado para o nome do banco
 */
function gerarTenantDbName(estudioName) {
    // Remove acentos, converte para lowercase, substitui espaços por hífens
    let slug = estudioName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .toLowerCase()
        .replace(/\s+/g, '-') // Espaços viram hífens
        .replace(/[^a-z0-9\-]/g, ''); // Remove caracteres especiais
    
    // Trunca o slug se o nome total for muito longo para evitar exceder o limite do DB.
    // Limite do DB é ~64, mas Atlas pode ter limites menores (ex: 38 bytes).
    const maxSlugLength = 20;
    if (slug.length > maxSlugLength) {
        slug = slug.substring(0, maxSlugLength);
    }

    // Remove hífens no final do slug que podem ter sido criados pelo truncamento
    slug = slug.replace(/-+$/, '');

    const sufixoUnico = crypto.randomBytes(3).toString('hex');
    return `gus_tenant_${slug}-${sufixoUnico}`;
}

/**
 * Inicializa um novo banco de dados de tenant com coleções e dados padrão.
 * @param {mongoose.Connection} tenantConnection - A conexão do nova tenant
 */
async function inicializarTenantDb(tenantConnection) {
    try {
        // Força a criação do banco de dados criando uma coleção de metadados
        // Isso garante que o banco apareça na lista do MongoDB imediatamente
        await tenantConnection.createCollection('metadata_tenant');
        
        // Cria um documento inicial para garantir a persistência do banco
        const Metadata = tenantConnection.model('MetadataTenant', new mongoose.Schema({ criadoEm: Date, versao: String }));
        await Metadata.create({ criadoEm: new Date(), versao: '1.0' });

        console.log('Banco de dados do tenant foi inicializado e persistido com sucesso.');
    } catch (error) {
        console.error('Erro ao inicializar banco do tenant:', error);
        // Ignora erro se a coleção já existir (código 48)
        if (error.code !== 48) throw error;
    }
}

export const listarSolicitantes = async (req, res) => {
    try {
        const tenantDbName = req.session?.user?.tenantDbName;
        if (!['admin', 'adm'].includes(req.session?.user?.role) || !tenantDbName) {
            return res.status(403).json({ error: 'A listagem de usuários exige administração do tenant.' });
        }

        const SolicitanteModel = getSolicitanteModel(masterConnection);
        const listaDeSolicitantes = await SolicitanteModel.find({ tenantDbName }).select('-senha');
        res.status(200).json(listaDeSolicitantes || []);
    } catch (error) {
        console.error('Erro ao buscar solicitantes:', error);
        res.status(500).json({ error: 'Erro interno ao buscar solicitantes' });
    }
};

export const buscarSolicitanteAdminPorId = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de usuário inválido.' });
        }

        const usuario = req.session?.user;
        if (!['admin', 'adm'].includes(usuario?.role) || !usuario.tenantDbName) {
            return res.status(403).json({ error: 'A consulta exige administração do tenant.' });
        }

        const SolicitanteModel = getSolicitanteModel(masterConnection);
        const solicitante = await SolicitanteModel.findOne({ _id: id, tenantDbName: usuario.tenantDbName })
            .select('solicitante email role')
            .lean();
        if (!solicitante) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        return res.status(200).json(solicitante);
    } catch (error) {
        console.error('Erro ao buscar usuário administrativo:', error);
        return res.status(500).json({ error: 'Erro ao buscar usuário.' });
    }
};

export const buscarSolicitantePorId = async (req, res) => {
    try {
        const usuario = req.session?.user;
        if (!usuario) return res.status(401).json({ error: 'Autenticação obrigatória.' });

        const query = { _id: req.params.id };
        if (['admin', 'adm'].includes(usuario.role)) {
            if (!usuario.tenantDbName) {
                return res.status(403).json({ error: 'Administração de usuários exige um tenant associado.' });
            }
            query.tenantDbName = usuario.tenantDbName;
        } else if (String(usuario._id) !== String(req.params.id)) {
            return res.status(403).json({ error: 'Não é permitido consultar outro usuário.' });
        }

        const SolicitanteModel = getSolicitanteModel(masterConnection);
        const solicitante = await SolicitanteModel.findOne(query).select('-senha');
        if (!solicitante) {
            res.status(404).json({ message: 'solicitante não encontrado com esse id' });
        } else {
            res.status(200).json(solicitante);
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar solicitante por id' });
    }
};

export const buscarIdSolicitante = async (req, res) => {
    const { solicitante, estudio } = req.query;
    // Validação de entrada
    if (!solicitante || !estudio) {
        return res.status(400).json({ error: 'Parâmetros obrigatórios não fornecidos' });
    }
    try {
        const SolicitanteModel = getSolicitanteModel(masterConnection);
        // Converte para ObjectId se for uma string válida, senão usa como número (fallback)
        const filtroEstudio = mongoose.Types.ObjectId.isValid(estudio) ? estudio : Number(estudio);
        
        const solicitanteEncontrado = await SolicitanteModel.findOne({
            solicitante,
            estudio: filtroEstudio
        });
        if (!solicitanteEncontrado) {
            return res.status(404).json({ message: 'solicitante não encontrado' });
        }
        res.status(200).json({ id: solicitanteEncontrado._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar solicitante' });
    }
};

export const criarSolicitante = async (req, res) => {
    let provisionamentoNovo = null;
    console.log("\n[CRIAR USUÁRIO] Iniciando processo...");
    try {
        // Capitaliza a primeira letra do solicitante e remove espaços extras
        if (typeof req.body.solicitante !== 'string' || !req.body.solicitante.trim()) {
            return res.status(400).json({ error: 'O nome do usuário é obrigatório.' });
        }
        const nome = req.body.solicitante.trim();
        req.body.solicitante = nome.charAt(0).toUpperCase() + nome.slice(1);

        let { senha, role, estudioName, estudio } = req.body;

        if (typeof senha !== 'string' || senha.length < 4) {
            return res.status(400).json({ error: 'A senha deve ter no minimo 4 caracteres.' });
        }
        if (typeof req.body.email !== 'string' || !req.body.email.trim()) {
            return res.status(400).json({ error: 'O e-mail é obrigatório.' });
        }
        req.body.email = req.body.email.trim().toLowerCase();

        // Unifica a entrada: usa estudioName ou estudio independente da sessão
        if (!estudioName && estudio) {
            estudioName = estudio;
        }

        // SEGURANÇA: Remover role vindo do frontend (será determinado automaticamente)
        const cadastroAdminTenant = (req.originalUrl || '').startsWith('/admin/usuarios')
            && req.session?.user?.role === 'admin';
        if (cadastroAdminTenant && role === 'superadmin') {
            return res.status(403).json({ error: 'Não é permitido criar superadmin pela administração do tenant.' });
        }
        if (!cadastroAdminTenant) role = undefined;

        // Validação de entrada
        if (!estudioName || (typeof estudioName === 'string' && estudioName.trim() === '')) {
            return res.status(400).json({ error: 'O nome do estúdio é obrigatório.' });
        }
        estudioName = String(estudioName).trim();

        const masterConnection = mongoose.connection;
        const EstudioModel = getEstudioModel(masterConnection);
        const SolicitanteModel = getSolicitanteModel(masterConnection);

        const usuarioDuplicado = await SolicitanteModel.findOne({
            $or: [
                { solicitante: req.body.solicitante },
                { email: req.body.email }
            ]
        }).select('solicitante email').lean();
        if (usuarioDuplicado) {
            const campo = usuarioDuplicado.email === req.body.email ? 'e-mail' : 'nome de usuário';
            return res.status(409).json({ error: `Este ${campo} já está cadastrado.` });
        }
        const hashedPassword = await bcrypt.hash(senha, 10);

        // Busca inteligente: tenta por ID primeiro (comum no Admin), senão por Nome (comum no Registro)
        let estudioExistente;
        if (mongoose.Types.ObjectId.isValid(estudioName)) {
            estudioExistente = await EstudioModel.findById(estudioName);
        }

        if (!estudioExistente) {
            estudioExistente = await EstudioModel.findOne({ 
                nome: { $regex: new RegExp(`^${escaparRegex(estudioName)}$`, 'i') }
            });
        }

        // Se não existir, valida o novo nome antes de criar o estúdio
        if (!estudioExistente) {
            console.log(`-> Estúdio "${estudioName}" não encontrado. Tentando criar novo estúdio...`);
            if (cadastroAdminTenant) {
                return res.status(403).json({ error: 'A criação de tenant novo deve ser feita pelo cadastro de plataforma.' });
            }
            const nomesProibidos = ['teste', 'test', 'admin', 'desconhecido', 'asdf', '123456', 'root'];
            const nomeLimpo = String(estudioName).trim().toLowerCase();

            if (nomeLimpo.length < 3) {
                return res.status(400).json({ error: 'O nome do novo estúdio deve ter pelo menos 3 caracteres.' });
            }
            if (nomesProibidos.includes(nomeLimpo) || !/[a-z]/i.test(nomeLimpo)) {
                return res.status(400).json({ error: 'Por favor, insira um nome de estúdio válido para criação.' });
            }
        }

        // Determinar o role automaticamente baseado na existência do estúdio
        let tenantDbName;
        let roleAssigned;
        let idDoEstudio;
        let tenantCriado = false;
        let trialStartedAt;
        let trialEndsAt;

        if (estudioExistente) {
            console.log(`✓✓✓ Estúdio "${estudioExistente.nome}" encontrado para o novo usuário. Associando ao estúdio existente.`);
            console.log(`Detalhes do estúdio encontrado: ID=${estudioExistente._id}, tenantDbName=${estudioExistente.tenantDbName}`);
            // Cenário A: Estúdio existe
            // O novo usuário será um 'user' desse estúdio
            
            if (!estudioExistente.tenantDbName) {
                return res.status(409).json({ error: 'Este estúdio ainda não possui um tenant provisionado. Contate o suporte.' });
            }
            tenantDbName = estudioExistente.tenantDbName;

            const statusTenant = estudioExistente.approvalStatus || 'approved';
            const trialExpirado = statusTenant === 'pending'
                && (!estudioExistente.trialEndsAt || new Date(estudioExistente.trialEndsAt) <= new Date());
            if (statusTenant === 'rejected' || statusTenant === 'provisioning' || statusTenant === 'deleting' || trialExpirado) {
                return res.status(423).json({ error: 'Este tenant não está aceitando novos usuários.' });
            }

            idDoEstudio = estudioExistente._id;
            // Registro público (sem sessão): usuário entra como 'pendente' até aprovação do admin
            // Criação pelo admin (com sessão): usa o role especificado ou 'user' como padrão
            roleAssigned = cadastroAdminTenant ? (role || 'user') : 'pendente';
            estudioName = estudioExistente.nome; // Atualiza para o nome real para o log de sucesso
            console.log(`✓ Estúdio existente encontrado: ${estudioExistente.nome}`);
        } else {
            tenantDbName = gerarTenantDbName(estudioName);
            const novoEstudio = await EstudioModel.create({
                nome: estudioName,
                tenantDbName,
                approvalStatus: 'provisioning',
                quantidadeSalas: req.body.quantidadeSalas || 1
            });
            idDoEstudio = novoEstudio._id;
            provisionamentoNovo = { tenantDbName, estudioId: idDoEstudio };

            const tenantId = tenantDbName.replace('gus_tenant_', '');
            const tenantConnection = await getTenantConnection(tenantId);
            await inicializarTenantDb(tenantConnection);

            trialStartedAt = new Date();
            trialEndsAt = new Date(trialStartedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
            provisionamentoNovo.trialStartedAt = trialStartedAt;
            provisionamentoNovo.trialEndsAt = trialEndsAt;
            roleAssigned = 'admin';
            console.log(`✓ Novo estúdio e tenant provisionados: ${tenantDbName}`);
        }

        // Criar objeto do novo solicitante com role determinado automaticamente
        const novoSolicitanteData = {
            ...req.body,
            senha: hashedPassword,
            role: roleAssigned,
            tenantDbName: tenantDbName,
            estudio: idDoEstudio // Associar ao ID do estúdio existente ou do recém-criado
        };

        // Limpar campos desnecessários
        delete novoSolicitanteData.estudioName;

        const novoSolicitante = new SolicitanteModel(novoSolicitanteData);
        await novoSolicitante.save();
        console.log(`Novo usuário criado: Estúdio "${estudioName}" (Tenant: "${tenantDbName}")`);

        if (provisionamentoNovo) {
            provisionamentoNovo.usuarioId = novoSolicitante._id;
            const resultadoProvisionamento = await EstudioModel.updateOne(
                { _id: idDoEstudio, approvalStatus: 'provisioning' },
                {
                    $set: {
                        approvalStatus: 'pending',
                        trialStartedAt,
                        trialEndsAt
                    }
                }
            );
            if (resultadoProvisionamento.matchedCount !== 1) {
                throw new Error('Não foi possível concluir o estado do tenant provisionado.');
            }
            tenantCriado = true;
        }

        if (tenantCriado) {
            try {
                await enviarAvisoNovoTenant({
                    nomeEstudio: estudioName,
                    tenantDbName,
                    usuarioNome: novoSolicitante.solicitante,
                    usuarioEmail: novoSolicitante.email,
                    usuarioRole: novoSolicitante.role,
                    trialEndsAt
                });
            } catch (emailError) {
                console.error('Usuário e tenant foram criados, mas o aviso por e-mail falhou:', emailError);
            }
        }
        
        console.log(`[SUCESSO] Usuário: ${novoSolicitante.solicitante} | Banco: ${novoSolicitante.tenantDbName}`);
        res.status(201).json({
            _id: novoSolicitante._id,
            solicitante: novoSolicitante.solicitante,
            email: novoSolicitante.email,
            role: novoSolicitante.role,
            tenantDbName: novoSolicitante.tenantDbName
        });
    } catch (error) {
        if (provisionamentoNovo) {
            try {
                const EstudioModel = getEstudioModel(mongoose.connection);
                const SolicitanteModel = getSolicitanteModel(mongoose.connection);
                if (provisionamentoNovo.usuarioId) {
                    await SolicitanteModel.deleteOne({ _id: provisionamentoNovo.usuarioId });
                }
                await dropTenantDatabase(provisionamentoNovo.tenantDbName);
                await EstudioModel.deleteOne({ _id: provisionamentoNovo.estudioId, approvalStatus: 'provisioning' });
            } catch (cleanupError) {
                console.error('Falha ao reverter provisionamento incompleto; o tenant permanece bloqueado:', cleanupError);
                return res.status(500).json({ error: 'Provisionamento incompleto e limpeza pendente. Contate o suporte.' });
            }
        }
        // Captura erros de validação do Mongoose (campos obrigatórios, formato de email, etc)
        if (error.name === 'ValidationError') {
            if (error.errors.email) {
                console.warn(`[CADASTRO] Tentativa de criação de usuário negada por e-mail ausente ou inválido. Solicitante: ${req.body.solicitante || 'Nome não informado'}`);
            }

            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ error: messages.join(', ') });
        }

        // Tratamento de erro de duplicidade (E11000)
        if (error.code === 11000) {
            // Identifica qual campo causou o erro de duplicidade
            const campoDuplicado = Object.keys(error.keyPattern)[0];
            let mensagem = `O valor fornecido para '${campoDuplicado}' já está em uso.`;

            if (campoDuplicado === 'solicitante') {
                mensagem = 'Este nome de usuário já está cadastrado.';
            } else if (campoDuplicado === 'email') {
                mensagem = 'Este e-mail já está em uso.';
            }
            // Retorna 409 Conflict, que é semanticamente mais correto para este caso
            return res.status(409).json({ error: mensagem });
        }
        console.error('Erro ao criar solicitante:', error);
        res.status(400).json({ error: 'Ocorreu um erro inesperado ao criar o solicitante.' }); 
    }
};

export const atualizarSolicitante = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioSessao = req.session?.user;
        if (!usuarioSessao) return res.status(401).json({ error: 'Autenticação obrigatória.' });

        const updates = {};
        for (const campo of ['solicitante', 'nome', 'email', 'senha', 'role']) {
            if (req.body[campo] !== undefined) updates[campo] = req.body[campo];
        }

        // Garante que se o frontend enviar 'nome', ele seja tratado como 'solicitante'
        if (updates.nome && !updates.solicitante) {
            updates.solicitante = updates.nome;
            delete updates.nome;
        }

        // Proteção: Apenas admin pode alterar o campo 'role'
        if (updates.role === 'superadmin') {
            return res.status(403).json({ error: 'Não é permitido atribuir o perfil superadmin.' });
        }
        if (updates.role && !['user', 'admin', 'pendente'].includes(updates.role)) {
            return res.status(400).json({ error: 'Perfil de usuário inválido.' });
        }
        if (updates.role && !['admin', 'adm'].includes(usuarioSessao.role)) {
            delete updates.role;
        }

        if (updates.email !== undefined) {
            if (typeof updates.email !== 'string' || !updates.email.trim()) {
                return res.status(400).json({ error: 'O e-mail não pode ser vazio.' });
            }
            updates.email = updates.email.trim().toLowerCase();
        }

        // Validação e Padronização de Nome
        if (updates.solicitante !== undefined) {
            if (typeof updates.solicitante !== 'string' || updates.solicitante.trim() === '') {
                return res.status(400).json({ error: 'O nome do solicitante não pode ser vazio.' });
            }
            const nome = updates.solicitante.trim();
            updates.solicitante = nome.charAt(0).toUpperCase() + nome.slice(1);
        }

        // Validação e Tratamento de Senha
        if (updates.senha !== undefined) {
            if (typeof updates.senha !== 'string' || updates.senha.trim() === '') {
                return res.status(400).json({ error: 'A senha não pode ser vazia.' });
            }
            if (updates.senha.length < 4) {
                return res.status(400).json({ error: 'A senha deve ter no minimo 4 caracteres.' });
            }
            const saltRounds = 10;
            updates.senha = await bcrypt.hash(updates.senha, saltRounds);
        }

        const masterConnection = mongoose.connection;
        const SolicitanteModel = getSolicitanteModel(masterConnection);
        const query = { _id: id };
        if (['admin', 'adm'].includes(usuarioSessao.role)) {
            if (!usuarioSessao.tenantDbName) {
                return res.status(403).json({ error: 'Administração de usuários exige um tenant associado.' });
            }
            query.tenantDbName = usuarioSessao.tenantDbName;
        } else if (String(usuarioSessao._id) !== String(id)) {
            return res.status(403).json({ error: 'Não é permitido alterar outro usuário.' });
        }

        const solicitante = await SolicitanteModel.findOneAndUpdate(query, updates, { new: true, runValidators: true }).select('-senha');
        if (!solicitante) {
            res.status(404).json({ error: 'solicitante não encontrado' });
            return;
        }

        // Atualiza a sessão se o usuário estiver alterando o próprio cadastro
        if (String(usuarioSessao._id) === String(id)) {
            usuarioSessao.solicitante = solicitante.solicitante;
            usuarioSessao.role = solicitante.role;
            usuarioSessao.tenantDbName = solicitante.tenantDbName;
        }

        res.status(200).json(solicitante);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: 'Este nome de usuário já está em uso.' });
        }
        res.status(500).json({ error: 'Erro ao atualizar solicitante' });
    }
};

export const deletarSolicitante = async (req, res) => {
    try {
        const masterConnection = mongoose.connection;
        const SolicitanteModel = getSolicitanteModel(masterConnection);
        const usuarioSessao = req.session?.user;
        if (!usuarioSessao) return res.status(401).json({ error: 'Autenticação obrigatória.' });

        const query = { _id: req.params.id };
        if (['admin', 'adm'].includes(usuarioSessao.role)) {
            if (!usuarioSessao.tenantDbName) {
                return res.status(403).json({ error: 'Administração de usuários exige um tenant associado.' });
            }
            query.tenantDbName = usuarioSessao.tenantDbName;
        } else if (String(usuarioSessao._id) !== String(req.params.id)) {
            return res.status(403).json({ error: 'Não é permitido excluir outro usuário.' });
        }

        const solicitante = await SolicitanteModel.findOneAndDelete(query);
        if (!solicitante) {
            res.status(404).json({ error: 'solicitante não encontrado' });
            return;
        }
        res.status(200).json({ message: 'solicitante removido com sucesso' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao remover solicitante' });
    }
};