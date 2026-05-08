# Plano de Implementação: Recuperação de Senha (GUS)

> Funcionalidade de "Esqueci minha senha" respeitando a arquitetura Multi-Tenant, com token seguro e envio de e-mail.

---

## 1. Visão Geral do Fluxo

```
[Usuário] → esqueci-senha.html → POST /auth/esqueci-senha
                                        ↓
                               Gera token → salva HASH no Master DB
                                        ↓
                               Envia e-mail com link único
                                        ↓
[Usuário] → resetar-senha.html?token=XXX → POST /auth/resetar-senha
                                        ↓
                               Valida token → atualiza senha → invalida token
```

---

## 2. Bibliotecas Necessárias

| Biblioteca | Situação | Finalidade |
|---|---|---|
| `crypto` | ✅ Nativa do Node.js | Gerar token aleatório e hashear antes de salvar no banco |
| `bcrypt` | ✅ Já instalada | Hash da nova senha |
| `express-rate-limit` | ✅ Já instalada | Limitar tentativas na rota de recuperação |
| `resend` | ❌ **Precisa instalar** | Envio do e-mail com o link de recuperação |

### Instalar Resend

```bash
npm install resend
```

---

## 3. Variáveis de Ambiente (`.env`)

Adicione as seguintes variáveis ao seu `.env`:

```env
# Configuração de E-mail (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM="GUS Sistema <noreply@seudominio.com>"

# URL base do frontend (para montar o link no e-mail)
APP_URL=http://localhost:3000
```

> **Dica de desenvolvimento:** Em desenvolvimento, use `onboarding@resend.dev` como remetente — funciona sem domínio verificado, mas só envia para o e-mail da sua conta Resend. Em produção, verifique seu domínio no painel do [Resend](https://resend.com) e troque o remetente. Plano gratuito: **3.000 e-mails/mês, 100/dia**.

---

## 4. Passo a Passo de Implementação

### Passo 1 — Atualizar o Modelo de Usuário

**Arquivo:** `src/models/usuariosmodel.js`

Adicionar dois campos ao `solicitanteSchema`, com `select: false` para não vazar o token em buscas comuns:

```js
passwordResetToken: {
    type: String,
    select: false   // nunca retorna em findOne() comum
},
passwordResetExpires: {
    type: Date,
    select: false
},
```

---

### Passo 2 — Criar o Serviço de E-mail

**Novo arquivo:** `src/services/emailService.js`

Isolar a lógica de e-mail em um serviço dedicado facilita a manutenção e os testes.

```js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const enviarEmailRecuperacao = async (destinatario, token) => {
    const link = `${process.env.APP_URL}/resetar-senha.html?token=${token}`;

    await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: destinatario,
        subject: 'Recuperação de Senha — GUS',
        html: `
            <h2>Recuperação de Senha</h2>
            <p>Clique no link abaixo para redefinir sua senha. O link expira em <strong>1 hora</strong>.</p>
            <a href="${link}">${link}</a>
            <p>Se você não solicitou isso, ignore este e-mail.</p>
        `
    });
};
```

---

### Passo 3 — Desenvolver as Funções no Auth Controller

**Arquivo:** `src/controllers/authController.js`

#### ⚠️ Segurança importante sobre o token

O token enviado no e-mail **não deve ser salvo diretamente no banco**. Salve apenas o seu hash SHA-256. Assim, mesmo que o banco seja comprometido, o token não pode ser reutilizado.

```
token bruto  →  enviado no link do e-mail (nunca salvo)
hash do token  →  salvo no passwordResetToken do banco
```

#### Função `solicitarRecuperacao`

```js
import crypto from 'crypto';
import { enviarEmailRecuperacao } from '../services/emailService.js';

export const solicitarRecuperacao = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail é obrigatório.' });

    try {
        const Solicitante = getSolicitanteModel(mongoose.connection);
        const usuario = await Solicitante.findOne({ email: email.toLowerCase().trim() })
            .select('+passwordResetToken +passwordResetExpires');

        // Resposta genérica — não revela se o e-mail existe (proteção contra enumeração)
        if (!usuario) {
            return res.status(200).json({ message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.' });
        }

        // Gera o token bruto (vai para o e-mail) e o hash (vai para o banco)
        const tokenBruto = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(tokenBruto).digest('hex');

        usuario.passwordResetToken = tokenHash;
        usuario.passwordResetExpires = new Date(Date.now() + 3_600_000); // 1 hora
        await usuario.save();

        await enviarEmailRecuperacao(usuario.email, tokenBruto);

        return res.status(200).json({ message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.' });
    } catch (err) {
        console.error('[solicitarRecuperacao]', err);
        return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
    }
};
```

#### Função `resetarSenha`

```js
export const resetarSenha = async (req, res) => {
    const { token, novaSenha } = req.body;
    if (!token || !novaSenha) return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });
    if (novaSenha.length < 6) return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' });

    try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const Solicitante = getSolicitanteModel(mongoose.connection);
        const usuario = await Solicitante.findOne({
            passwordResetToken: tokenHash,
            passwordResetExpires: { $gt: Date.now() } // token ainda válido
        }).select('+passwordResetToken +passwordResetExpires');

        if (!usuario) {
            return res.status(400).json({ error: 'Token inválido ou expirado.' });
        }

        usuario.senha = await bcrypt.hash(novaSenha, 12);
        usuario.passwordResetToken = undefined; // invalida o token imediatamente
        usuario.passwordResetExpires = undefined;
        await usuario.save();

        return res.status(200).json({ message: 'Senha redefinida com sucesso.' });
    } catch (err) {
        console.error('[resetarSenha]', err);
        return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
    }
};
```

---

### Passo 4 — Definir as Rotas Públicas

**Arquivo:** `routes/routesAuth.js`

As rotas **não passam pelo `authMiddleware`** (usuário não está logado). Aplique rate limiting para evitar abuso.

```js
import rateLimit from 'express-rate-limit';
import { solicitarRecuperacao, resetarSenha } from '../src/controllers/authController.js';

const recuperacaoLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5,                    // máximo 5 tentativas
    message: { error: 'Muitas tentativas. Aguarde 15 minutos.' }
});

// Rotas de Recuperação de Senha (Públicas)
routesAuth.post('/esqueci-senha', recuperacaoLimiter, solicitarRecuperacao);
routesAuth.post('/resetar-senha', recuperacaoLimiter, resetarSenha);
```

---

### Passo 5 — Criar as Interfaces Frontend

#### `frontend/esqueci-senha.html`
- Campo de e-mail + botão "Enviar link de recuperação"
- Exibe a mensagem genérica retornada pelo backend

#### `frontend/resetar-senha.html`
- Campos "Nova Senha" e "Confirmar Senha"
- Captura o token da URL: `new URLSearchParams(window.location.search).get('token')`
- Valida se as senhas coincidem antes de enviar
- Redireciona para `login.html` após sucesso

---

## 5. Resumo das Mudanças nos Arquivos

| Arquivo | Ação | Descrição |
|---|---|---|
| `src/models/usuariosmodel.js` | **Editar** | Adicionar `passwordResetToken` e `passwordResetExpires` |
| `src/controllers/authController.js` | **Editar** | Adicionar funções `solicitarRecuperacao` e `resetarSenha` |
| `src/services/emailService.js` | **Criar** | Serviço de envio de e-mail com Resend |
| `routes/routesAuth.js` | **Editar** | Adicionar rotas públicas de recuperação com rate limiting |
| `frontend/esqueci-senha.html` | **Criar** | Página para solicitar recuperação |
| `frontend/resetar-senha.html` | **Criar** | Página para definir nova senha |
| `.env` | **Editar** | Adicionar `RESEND_API_KEY`, `EMAIL_FROM` e `APP_URL` |

---

## 6. Regras de Segurança

- **Isolamento Master:** toda a lógica de token roda na conexão Master, nunca nos bancos de Tenant.
- **Resposta genérica:** retornar sempre a mesma mensagem independente de o e-mail existir ou não (proteção contra enumeração de usuários).
- **Token hashado:** o token bruto vai apenas no e-mail; o banco armazena somente o hash SHA-256.
- **Expiração curta:** 1 hora é o padrão de mercado.
- **Uso único:** o token é deletado imediatamente após a redefinição bem-sucedida.
- **Rate limiting:** máximo 5 tentativas por IP a cada 15 minutos nas rotas de recuperação.
