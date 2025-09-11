import express from "express";
import usoModelo from "../src/models/utilizacaomodel.js";

const routerUsos = express.Router();
// http://localhost:3000/usos
routerUsos.get("/", (req, res) => {
    res.status(200).send("Rota inicial funcionando");
});

// http://localhost:3000/usos/usos
routerUsos.get("/usos", async (req, res) => {
    const listaDeUsos = await usoModelo.find({});
    if (listaDeUsos.length === 0) {
        res.status(404).json({ message: 'Nenhum artista encontrado' });
    } else {
        res.status(200).json(listaDeUsos);
    }
});

// http://localhost:3000/usos/usos/:id
routerUsos.get("/usos/:id", async (req, res) => {
    const uso = await usoModelo.findById(req.params.id);
    if (!uso) {
        res.status(404).json({ message: 'Uso não encontrado com esse id' });
    } else {
        res.status(200).json(uso);
    }
});

routerUsos.get('/buscaid', async (req, res) => {
    const { solicitante, sala, dia, hora, diaDaSemana, motivo } = req.query;
    // Validação de entrada
    if (!solicitante || !sala || !dia || !hora) {
        return res.status(400).json({ error: 'Parâmetros obrigatórios não fornecidos' });
    }
    try {
        const uso = await usoModelo.findOne({
            solicitante,
            sala: Number(sala),
            dia: Number(dia),
            hora: Number(hora),
            motivo
        });
        if (!uso) {
            return res.status(404).json({ message: 'Uso não encontrado' });
        }
        res.status(200).json({ id: uso._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar uso' });
    }
});

// http://localhost:3000/usos/usos
routerUsos.post('/usos', async (req, res) => {
    try {
        const novoUso = new usoModelo(req.body);
        await novoUso.save();
        res.status(201).json(novoUso);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// http://localhost:3000/usos/usos/:id
routerUsos.put('/usos/:id', async (req, res) => {
    try {
        const uso = await usoModelo.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!uso) {
            res.status(404).json({ error: 'Uso não encontrado' });
            return;
        }
        res.status(200).json(uso);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar uso' });
    }
});

// http://localhost:3000/usos/usos/:id
routerUsos.delete('/usos/:id', async (req, res) => {
    try {
        const uso = await usoModelo.findByIdAndDelete(req.params.id);
        if (!uso) {
            res.status(404).json({ error: 'Uso não encontrado' });
            return;
        }
        res.status(200).json({ message: 'Uso removido com sucesso' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao remover uso' });
    }
});

export default routerUsos;