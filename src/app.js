import express from 'express';
import conectaNaDatabase from "./config/dbConnect.js";
import usoModelo from './models/utilizacaomodel.js';

const conexao = await conectaNaDatabase();

conexao.on("error", (erro) => {
    console.error("erro de conexão com o DB", erro);
});

conexao.once("open", () => {
    console.log("Conexao com o banco feita com sucesso");
})

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
    res.status(200).send("Rota inicial funcionando");
});

app.get("/usos", async (req, res) => {
    const listaDeUsos = await usoModelo.find({});
    if (listaDeUsos.length === 0) {
        res.status(404).json({ message: 'Nenhum artista encontrado' });
    } else {
        res.status(200).json(listaDeUsos);
    }
});

app.get("/usos/:id", async (req, res) => {
    const uso = await usoModelo.findById(req.params.id);
    if (!uso) {
        res.status(404).json({ message: 'Uso não encontrado com esse id' });
    } else {
        res.status(200).json(uso);
    }
});

app.post('/usos', async (req, res) => {
    const novoUso = new usoModelo(req.body);
    try {
        const usoSalvo = await novoUso.save();
        res.status(201).json();
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.put('/usos/:id', async (req, res) => {
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

app.delete('/usos/:id', async (req, res) => {
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

export default app;