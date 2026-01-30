# Documentação do Projeto GUS (Gerenciamento de Uso de Sala)- Módulo de Autenticação

## 1. Visão Geral
O projeto consiste em uma aplicação web utilizando **Node.js** e **Express**, focada na implementação de um sistema de autenticação seguro. Atualmente, possui rotas protegidas, gerenciamento de sessão e conexão inicial com banco de dados.

## 2. Backend (Node.js/Express)

### Funcionalidades Implementadas
- **Gerenciamento de Sessão:** Configurado via `express-session`.
- **Middleware de Segurança:** `authMiddleware` protege rotas que exigem login.
- **Rotas:**
  - Login e Logout funcionais.
  - Estrutura organizada de rotas.
- **Banco de Dados:** Conexão com **MongoDB** estabelecida (infraestrutura pronta).

### Estado Atual da Autenticação
- **Usuários:** Atualmente *hardcoded* (fixos no código) para testes.
- **Sessão:** Armazenada em memória (não persiste após reinício do servidor).
- **Interface:** Login via requisições JSON (API).

## 3. Frontend / Lógica do Cliente

O sistema possui utilitários JavaScript para controle de tempo de solicitações via `localStorage`.

### Controle de Sessão Local (`confereDataDaSessao.js`)
| Função | Descrição |
| :--- | :--- |
| `salvarSolicitacao(obj)` | Salva um objeto no `localStorage` adicionando um `timestamp` atual. |
| `obterSolicitacao()` | Recupera e converte o objeto salvo do `localStorage`. |
| `passouDezMinutos()` | Verifica se passaram mais de 10 minutos desde o `timestamp` salvo. Retorna `true` ou `false`. |

## 4. Roadmap / Próximos Passos

Para tornar a aplicação robusta e pronta para produção, as seguintes melhorias foram identificadas:

1.  **Persistência de Dados:**
    - Migrar usuários fixos para o **MongoDB**.
    - Implementar hash de senhas com **bcrypt**.    - **Índices de banco:** Adicionar índices em `usos` para otimizar consultas e prevenir duplicidades (ex.: `{ sala:1, dia:1, hora:1 }`).
      - Em produção, considere um índice único para `sala+dia+hora` se quiser garantir atomicamente que não ocorram duplicidades (verificar/limpar dados existentes antes de aplicar).2.  **Persistência de Sessão:**
    - Utilizar `connect-mongo` ou `connect-redis` para que o login não caia ao reiniciar o servidor.
3.  **Interface de Usuário (UI):**
    - Criar página HTML com formulário de login (`<form>`) para substituir o envio via JSON/Prompt.
    - Implementar feedback visual para erros de login.
4.  **Segurança:**
    - Configurar Cookies com `httpOnly: true` e `secure: true`.
    - Mover segredos (Session Secret) para variáveis de ambiente (`.env`).

## 5. Estrutura de Pastas

Abaixo está a organização atual dos arquivos e diretórios do projeto:

```text
GUS/
├── node_modules/ # Dependências instaladas (npm)
|     frontend/            
│  ── middleware/               # Middlewares de Segurança
│   │   └── authMiddleware.js      # Proteção de rotas
├── routes/                        # Gerenciamento de rotas
│   ├── routes.js                  # Rotas principais
│   └── routesAuth.js              # Rotas de autenticação
├── src/
│   ├── config/
│   │   └── dbConnect.js           # Conexão com o Banco de Dados
│   └── models/                    # Modelos do Banco (Mongoose)
│       ├── usuariosmoel.js        # Schema de Usuários
│       └── utilizacaomodel.js     # Schema de Usuários
├── .env                           # Variáveis de ambiente (SENSÍVEL)
├── analise ia do meu projeto.txt  # Notas de análise do projeto
├── confereDataDaSessao.txt        # Rascunho de lógica frontend
├── DOCUMENTACAO.md                # Documentação do projeto
├── index.js                       # Arquivo principal (Servidor)
├── package-lock.json              # Versões exatas das dependências
└── package.json                   # Configurações do Node.js
```

Endpoints utilizados:

http://localhoast:3000/
http://localhoast:3000/painelGeral.html
http://localhoast:3000/painelAdm.html
http://localhost:3000/sobre.html
http://localhost:3000/login.html
http://localhost:3000/loginCriar.html


================================================================================
## LISTA DE ENDPOINTS
================================================================================

GET /usos/
    - Descrição: Rota inicial de teste.
    - Retorno: Mensagem simples confirmando funcionamento.

GET /usos/usos
    - Descrição: Retorna registros paginados de uso. Aceita query params: `page`, `limit`, `solicitante`, `sala`, `dia`.
    - Query Params: `page` (default 1), `limit` (default 5, max 100), `solicitante`, `sala`, `dia`
    - Retorno: JSON com metadados e dados:
        - `data`: array de objetos de uso
        - `page`: número da página retornada
        - `limit`: itens por página
        - `totalItems`: número total de registros que atendem ao filtro
        - `totalPages`: número total de páginas
    - Exemplo:

```json
{
  "data": [ /* objetos de uso */ ],
  "page": 1,
  "limit": 5,
  "totalItems": 42,
  "totalPages": 9
}
```

GET /usos/usos/:id
    - Descrição: Busca os detalhes de um uso específico pelo ID.
    - Retorno: Objeto JSON do uso.

GET /usos/buscaid
    - Descrição: Busca o _id de um uso com base em parâmetros (solicitante, sala, dia, hora, motivo).
    - Query Params: solicitante, sala, dia, hora, motivo.
    - Retorno: JSON com o _id do uso.

POST /usos/usos
    - Descrição: Cria um novo registro de uso.
    - Middleware: verificaDuplicidade.
    - Retorno: Objeto criado.

PUT /usos/usos/:id
    - Descrição: Atualiza um uso existente.
    - Middleware: verificaSolicitante (apenas o dono pode editar).
    - Retorno: Objeto atualizado.

DELETE /usos/usos/:id
    - Descrição: Remove um registro de uso.
    - Middleware: verificaSolicitante (apenas o dono pode remover).
    - Retorno: Mensagem de sucesso.
================================================================================


================================================================================
LISTA DE ENDPOINTS
================================================================================

GET /solicitantes/
    - Descrição: Rota inicial de teste.
    - Retorno: Mensagem simples confirmando funcionamento.

GET /solicitantes/solicitantes
    - Descrição: Retorna todos os registros de solicitantes.
    - Retorno: Array JSON com os objetos de solicitantes.

GET /solicitantes/solicitantes/:id
    - Descrição: Busca os detalhes de um solicitante específico pelo ID.
    - Retorno: Objeto JSON do solicitante.

GET /solicitantes/buscaidsolicitante
    - Descrição: Busca o _id de um solicitante com base em parâmetros (solicitante, estudio).
    - Query Params: solicitante, estudio.
    - Retorno: JSON com o _id do solicitante.

GET /solicitantes/usersess
    - Descrição: Retorna informações do usuário logado na sessão (solicitante e role).
    - Retorno: JSON com dados da sessão.

POST /solicitantes/solicitantes
    - Descrição: Cria um novo solicitante (com hash de senha).
    - Retorno: Objeto criado.

PUT /solicitantes/solicitantes/:id
    - Descrição: Atualiza um solicitante existente.
    - Retorno: Objeto atualizado.

DELETE /solicitantes/solicitantes/:id
    - Descrição: Remove um registro de solicitante.
    - Retorno: Mensagem de sucesso.
================================================================================


================================================================================
LISTA DE ENDPOINTS - ADMINISTRAÇÃO
================================================================================

GET /admin/estudios
    - Descrição: Retorna lista de estúdios cadastrados.
    - Retorno: Array JSON.

POST /admin/estudios
    - Descrição: Cria um novo estúdio.

PUT /admin/estudios/:id
    - Descrição: Atualiza um estúdio existente.

DELETE /admin/estudios/:id
    - Descrição: Remove um estúdio.

GET /admin/salas
    - Descrição: Retorna lista de salas cadastradas.
    - Retorno: Array JSON.

POST /admin/salas
    - Descrição: Cria uma nova sala.

PUT /admin/salas/:id
    - Descrição: Atualiza uma sala existente.

DELETE /admin/salas/:id
    - Descrição: Remove uma sala.

GET /admin/aulas
    - Descrição: Retorna lista de aulas regulares.
    - Retorno: Array JSON.

POST /admin/aulas
    - Descrição: Cria uma nova aula regular.

DELETE /admin/aulas/:id
    - Descrição: Remove uma aula regular.
================================================================================