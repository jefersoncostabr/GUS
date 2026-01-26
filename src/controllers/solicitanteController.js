import solicitanteModelo from "../models/usuariosmodel.js";
import bcrypt from "bcrypt";

export const listarSolicitantes = async (req, res) => {
    try {
        const listaDeSolicitantes = await solicitanteModelo.find({});
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
        const solicitante = await solicitanteModelo.findById(req.params.id);
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
        const solicitanteEncontrado = await solicitanteModelo.findOne({
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

        const { senha } = req.body; // extrai a senha do corpo da requisição
        const saltRounds = 10; // número de rodadas para o hash
        const hashedPassword = await bcrypt.hash(senha, saltRounds); // gera o hash da senha

        const novoSolicitante = new solicitanteModelo({ // cria um novo objeto solicitante
            ...req.body, // copia os demais campos do corpo da requisição
            senha: hashedPassword, // substitui a senha pelo hash gerado
            role: "user"
        });
        await novoSolicitante.save(); // salva o novo objeto no banco de dados
        console.log("Novo solicitante criado:", novoSolicitante);

        res.status(201).json(novoSolicitante); 
    } catch (error) {
        res.status(400).json({ message: error.message }); 
    }
};

export const atualizarSolicitante = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };

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

        const solicitante = await solicitanteModelo.findByIdAndUpdate(id, updates, { new: true });
        if (!solicitante) {
            res.status(404).json({ error: 'solicitante não encontrado' });
            return;
        }

        // Atualiza a sessão se o usuário estiver alterando o próprio cadastro
        if (req.session.user && String(req.session.user._id) === id) {
            req.session.user.solicitante = solicitante.solicitante;
            req.session.user.role = solicitante.role;
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
        const solicitante = await solicitanteModelo.findByIdAndDelete(req.params.id);
        if (!solicitante) {
            res.status(404).json({ error: 'solicitante não encontrado' });
            return;
        }
        res.status(200).json({ message: 'solicitante removido com sucesso' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao remover solicitante' });
    }
};