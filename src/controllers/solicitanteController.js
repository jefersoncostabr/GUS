import { getSolicitanteModel } from "../models/usuariosmodel.js";
import { getEstudioModel } from "../models/estudiomodel.js";
import { getTenantConnection } from "../config/connectionFactory.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

/**
 * Lista todos os estúdios com apenas nome e ID (para preenchimento do modal no frontend).
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const listarEstudiosSimples = async (req, res) => {
    try {
        const masterConnection = mongoose.connection;
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
    
    // Adiciona um hash curto do timestamp para garantir unicidade e tamanho reduzido
    const shortTimestamp = Date.now().toString(36);

    // Trunca o slug se o nome total for muito longo para evitar exceder o limite do DB.
    // Limite do DB é ~64, mas Atlas pode ter limites menores (ex: 38 bytes).
    // prefixo (11) + slug + _ (1) + timestamp (~9) = ~21 + slug. Deixamos 15 para o slug.
    const maxSlugLength = 15;
    if (slug.length > maxSlugLength) {
        slug = slug.substring(0, maxSlugLength);
    }

    // Remove hífens no final do slug que podem ter sido criados pelo truncamento
    slug = slug.replace(/-+$/, '');

    return `gus_tenant_${slug}_${shortTimestamp}`;
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
        // Usa o modelo do banco Master (Solicitantes são globais)
        const SolicitanteModel = getSolicitanteModel(mongoose.connection);
        
        const query = {};
        if (req.session?.user?.tenantDbName) {
            query.tenantDbName = req.session.user.tenantDbName;
        }

        const listaDeSolicitantes = await SolicitanteModel.find(query);
        if (listaDeSolicitantes.length === 0) {
            res.status(404).json({ message: 'Nenhum solicitante encontrado' });
        } else {
            res.status(200).json(listaDeSolicitantes);
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar solicitantes' });
    }
};

export const buscarSolicitantePorId = async (req, res) => {
    try {
        const SolicitanteModel = getSolicitanteModel(mongoose.connection);
        const solicitante = await SolicitanteModel.findById(req.params.id);
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
        const SolicitanteModel = getSolicitanteModel(mongoose.connection);
        const solicitanteEncontrado = await SolicitanteModel.findOne({
            solicitante,
            estudio: Number(estudio)
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
    console.log("Requisição para criar novo solicitante:", req.body);
    try {
        // Capitaliza a primeira letra do solicitante e remove espaços extras
        if (req.body.solicitante && typeof req.body.solicitante === 'string') {
            const nome = req.body.solicitante.trim();
            req.body.solicitante = nome.charAt(0).toUpperCase() + nome.slice(1);
        }

        let { senha, role, estudioName, estudio } = req.body;

        // Lógica de compatibilidade para o formulário público de criação de conta.
        // Se a requisição for pública (sem usuário na sessão) e o campo 'estudio' for enviado,
        // ele deve ser tratado como o nome do novo estúdio ('estudioName').
        if (!req.session?.user && estudio) {
            estudioName = estudio;
        }

        // SEGURANÇA: Remover role vindo do frontend (será determinado automaticamente)
        if (!req.session?.user) {
            // Para registros públicos, ignorar o role e deixar ser determinado pela lógica
            role = undefined;
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(senha, saltRounds);

        // Validação de entrada
        if (!estudioName) {
            return res.status(400).json({ error: 'O nome do estúdio é obrigatório.' });
        }

        const masterConnection = mongoose.connection;
        const EstudioModel = getEstudioModel(masterConnection);

        // Verificar se o estúdio já existe no banco Master (case-insensitive)
        const estudioExistente = await EstudioModel.findOne({ 
            nome: { $regex: new RegExp(`^${estudioName}$`, 'i') } 
        });

        // Determinar o role automaticamente baseado na existência do estúdio
        let tenantDbName;
        let roleAssigned;
        let idDoEstudio;

        if (estudioExistente) {
            // Cenário A: Estúdio existe
            // O novo usuário será um 'user' desse estúdio
            tenantDbName = estudioExistente.tenantDbName || gerarTenantDbName(estudioExistente.nome);
            idDoEstudio = estudioExistente._id;
            roleAssigned = 'user';
            console.log(`✓ Estúdio existente encontrado: ${estudioExistente.nome}`);
        } else {
            // Cenário B: Estúdio não existe
            // Criar novo estúdio e provisionar tenant
            // O primeiro para este estúdio será 'admin'
            try {
                tenantDbName = gerarTenantDbName(estudioName);
                const tenantId = tenantDbName.replace('gus_tenant_', '');
                const tenantConnection = await getTenantConnection(tenantId);
                
                // Inicializar banco do tenant
                await inicializarTenantDb(tenantConnection);
                
                // Criar registro do Estúdio no banco Master
                const novoEstudio = new EstudioModel({ 
                    nome: estudioName,
                    tenantDbName: tenantDbName
                });
                await novoEstudio.save();
                idDoEstudio = novoEstudio._id;
                
                roleAssigned = 'admin'; // Primeiro usuário é admin
                console.log(`✓ Novo estúdio criado e banco provisionado: ${tenantDbName}`);
            } catch (error) {
                console.error('Erro ao provisionar estúdio:', error);
                return res.status(500).json({ error: 'Erro ao provisionar novo estúdio.' });
            }
        }

        const SolicitanteModel = getSolicitanteModel(masterConnection);

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
        delete novoSolicitanteData.estudio; // Se for string de entrada

        const novoSolicitante = new SolicitanteModel(novoSolicitanteData);
        await novoSolicitante.save();
        
        console.log(`Novo solicitante criado com sucesso: Usuário="${novoSolicitante.solicitante}" (Use exatamente assim no login), Banco="${novoSolicitante.tenantDbName}"`);
        res.status(201).json(novoSolicitante); 
    } catch (error) {
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
        const updates = { ...req.body };

        // Garante que se o frontend enviar 'nome', ele seja tratado como 'solicitante'
        if (updates.nome && !updates.solicitante) {
            updates.solicitante = updates.nome;
            delete updates.nome;
        }

        // Proteção: Apenas admin pode alterar o campo 'role'
        if (updates.role && req.session.user?.role !== 'admin') {
            delete updates.role;
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
            const saltRounds = 10;
            updates.senha = await bcrypt.hash(updates.senha, saltRounds);
        }

        const masterConnection = mongoose.connection;
        const SolicitanteModel = getSolicitanteModel(masterConnection);

        const solicitante = await SolicitanteModel.findByIdAndUpdate(id, updates, { new: true });
        if (!solicitante) {
            res.status(404).json({ error: 'solicitante não encontrado' });
            return;
        }

        // Atualiza a sessão se o usuário estiver alterando o próprio cadastro
        if (req.session.user && String(req.session.user._id) === id) {
            req.session.user.solicitante = solicitante.solicitante;
            req.session.user.role = solicitante.role;
            req.session.user.tenantDbName = solicitante.tenantDbName;
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

        const solicitante = await SolicitanteModel.findByIdAndDelete(req.params.id);
        if (!solicitante) {
            res.status(404).json({ error: 'solicitante não encontrado' });
            return;
        }
        res.status(200).json({ message: 'solicitante removido com sucesso' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao remover solicitante' });
    }
};