# Arquitetura do Projeto GUS

## Visão Geral

O projeto segue o padrão **MVC (Model-View-Controller)** com **Express.js** no backend e segue uma estrutura de camadas bem definida.

---

## Estrutura de Camadas

```
Request → Router → Middleware → Controller → Model → Database
   ↓                                                      ↓
Response ← Formatação JSON ← Processamento ← Query ← Results
```

---

## Componentes Principais

### 1. **Router** (Definição de Rotas)
Responsável por mapear URLs para controladores.

```javascript
// routes/temaRouter.js
import express from 'express';
import TemaController from '../controllers/temaController.js';

const router = express.Router();

router.get('/', TemaController.listar);
router.post('/', TemaController.criar);
router.put('/:id', TemaController.atualizar);
router.delete('/:id', TemaController.deletar);

export default router;
```

**Arquivo principal (index.js):**
```javascript
import express from 'express';
import temaRouter from './routes/temaRouter.js';

const app = express();

app.use(express.json());
app.use('/tema', temaRouter);

app.listen(3000, () => console.log('Servidor rodando!'));
```

---

### 2. **Controller** (Lógica de Negócio)
Processa requisições, valida dados e interage com o Model.

```javascript
// controllers/temaController.js
import TemaModelo from '../models/temamodel.js';

class TemaController {
    // READ - Listar todos
    static async listar(req, res) {
        try {
            const temas = await TemaModelo.find({});
            res.status(200).json(temas);
        } catch (erro) {
            res.status(500).json({ mensagem: 'Erro ao listar temas', erro });
        }
    }

    // READ - Buscar por ID
    static async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const tema = await TemaModelo.findById(id);
            
            if (!tema) {
                return res.status(404).json({ mensagem: 'Tema não encontrado' });
            }
            
            res.status(200).json(tema);
        } catch (erro) {
            res.status(500).json({ mensagem: 'Erro ao buscar tema', erro });
        }
    }

    // CREATE - Criar novo
    static async criar(req, res) {
        try {
            const { nome, descricao } = req.body;

            // Validações
            if (!nome) {
                return res.status(400).json({ mensagem: 'Nome é obrigatório' });
            }

            const novoTema = new TemaModelo({ nome, descricao });
            await novoTema.save();

            res.status(201).json({
                mensagem: 'Tema criado com sucesso',
                tema: novoTema
            });
        } catch (erro) {
            res.status(500).json({ mensagem: 'Erro ao criar tema', erro });
        }
    }

    // UPDATE - Atualizar
    static async atualizar(req, res) {
        try {
            const { id } = req.params;
            const { nome, descricao } = req.body;

            const temaAtualizado = await TemaModelo.findByIdAndUpdate(
                id,
                { nome, descricao },
                { new: true, runValidators: true }
            );

            if (!temaAtualizado) {
                return res.status(404).json({ mensagem: 'Tema não encontrado' });
            }

            res.status(200).json({
                mensagem: 'Tema atualizado com sucesso',
                tema: temaAtualizado
            });
        } catch (erro) {
            res.status(500).json({ mensagem: 'Erro ao atualizar tema', erro });
        }
    }

    // DELETE - Deletar
    static async deletar(req, res) {
        try {
            const { id } = req.params;

            const temaDeletado = await TemaModelo.findByIdAndDelete(id);

            if (!temaDeletado) {
                return res.status(404).json({ mensagem: 'Tema não encontrado' });
            }

            res.status(200).json({ mensagem: 'Tema deletado com sucesso' });
        } catch (erro) {
            res.status(500).json({ mensagem: 'Erro ao deletar tema', erro });
        }
    }
}

export default TemaController;
```

---

### 3. **Model** (Estrutura de Dados)
Define o esquema do banco de dados com validações.

```javascript
// models/temamodel.js
import mongoose from 'mongoose';

const temaSchema = new mongoose.Schema(
    {
        nome: {
            type: String,
            required: [true, 'Nome é obrigatório'],
            trim: true,
            maxlength: [100, 'Nome não pode exceder 100 caracteres']
        },
        descricao: {
            type: String,
            default: '',
            maxlength: [500, 'Descrição não pode exceder 500 caracteres']
        },
        ativo: {
            type: Boolean,
            default: true
        },
        dataCriacao: {
            type: Date,
            default: Date.now
        }
    },
    { versionKey: false }
);

const TemaModelo = mongoose.model('Tema', temaSchema);

export default TemaModelo;
```

---

## Padrões Avançados

### Middleware de Autenticação

```javascript
// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

export const autenticar = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ mensagem: 'Token não fornecido' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch (erro) {
        res.status(403).json({ mensagem: 'Token inválido' });
    }
};

export const autorizar = (permissoes) => {
    return (req, res, next) => {
        if (!permissoes.includes(req.usuario.role)) {
            return res.status(403).json({ mensagem: 'Acesso negado' });
        }
        next();
    };
};
```

**Usando Middleware nas rotas:**
```javascript
import { autenticar, autorizar } from '../middleware/authMiddleware.js';

router.get('/', autenticar, TemaController.listar);
router.post('/', autenticar, autorizar(['admin']), TemaController.criar);
router.put('/:id', autenticar, autorizar(['admin']), TemaController.atualizar);
router.delete('/:id', autenticar, autorizar(['admin']), TemaController.deletar);
```

---

## Tratamento de Erros

### Padrão Recomendado

```javascript
class ErroCustomizado extends Error {
    constructor(mensagem, statusCode) {
        super(mensagem);
        this.statusCode = statusCode;
    }
}

// Middleware de Erro Global
export const tratarErros = (erro, req, res, next) => {
    const statusCode = erro.statusCode || 500;
    const mensagem = erro.message || 'Erro interno do servidor';

    res.status(statusCode).json({
        sucesso: false,
        mensagem,
        ...(process.env.NODE_ENV === 'development' && { stack: erro.stack })
    });
};

// Usando no index.js
app.use(tratarErros);
```

---

## Serviços (Camada de Negócio)

Para lógica complexa, crie serviços separados:

```javascript
// services/temaService.js
import TemaModelo from '../models/temamodel.js';

class TemaService {
    static async buscarComFiltros(filtros) {
        return TemaModelo.find(filtros).sort({ dataCriacao: -1 });
    }

    static async criarMultiplos(dados) {
        return TemaModelo.insertMany(dados);
    }

    static async deletarInativos() {
        return TemaModelo.deleteMany({ ativo: false });
    }
}

export default TemaService;
```

---

## Fluxo Completo de Uma Requisição

**Exemplo: POST /tema (Criar tema)**

```
1. Client: POST /tema
   { "nome": "React", "descricao": "Biblioteca JS" }

2. Express encontra a rota em temaRouter.js
   router.post('/', autenticar, TemaController.criar)

3. Middleware de autenticação (authMiddleware.js)
   → Valida token JWT
   → Passa para o controller

4. TemaController.criar() executa
   → Valida dados (nome obrigatório)
   → Cria instância de TemaModelo
   → Salva no MongoDB

5. TemaModelo.save()
   → Valida schema (maxlength, required)
   → Retorna documento salvo

6. Controller retorna resposta
   201 { "mensagem": "...", "tema": {...} }

7. Client recebe resposta JSON
```

---

## Checklist de Implementação

- [ ] Usar try/catch em todas as funções async
- [ ] Validar dados de entrada no Controller
- [ ] Usar Schemas do Mongoose para validação
- [ ] Implementar middleware de autenticação
- [ ] Retornar status HTTP corretos (200, 201, 400, 404, 500)
- [ ] Usar transações para operações críticas
- [ ] Documentar endpoints com comentários
- [ ] Testar CRUD completo
- [ ] Implementar paginação para listas grandes
- [ ] Usar variáveis de ambiente (.env)

---

## Variáveis de Ambiente (.env)

```
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/gus
JWT_SECRET=sua_chave_secreta_super_segura
```

---

## Recursos Úteis

- [Express.js Docs](https://expressjs.com)
- [Mongoose Docs](https://mongoosejs.com)
- [REST API Best Practices](https://restfulapi.net)
- [HTTP Status Codes](https://httpwg.org/specs/rfc7231.html#status.codes)
