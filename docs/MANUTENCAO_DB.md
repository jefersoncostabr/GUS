# Documentação de Manutenção do Banco de Dados (GUS)

Esta documentação descreve as rotas criadas para limpeza e manutenção das coleções do banco de dados MongoDB do projeto GUS.

> **⚠️ ZONA DE PERIGO:** Estas rotas removem dados permanentemente. Não há opção de desfazer. Use com extrema cautela, preferencialmente apenas em ambiente de desenvolvimento.

## Endpoints de Limpeza

Todas as rotas abaixo utilizam o método HTTP **DELETE**.

*Base URL:* `http://localhost:3000` (ajuste conforme seu ambiente).
*Prefixo:* `/admin` (conforme configuração padrão de rotas administrativas).

| Coleção Alvo | Rota Completa | Descrição |
| :--- | :--- | :--- |
| **Solicitantes** | `DELETE /admin/limpar/solicitantes` | Remove todos os usuários/solicitantes cadastrados. |
| **Usos (Agendamentos)** | `DELETE /admin/limpar/usos` | Remove todos os agendamentos de salas. |
| **Estúdios** | `DELETE /admin/limpar/estudios` | Remove todos os estúdios cadastrados. |
| **Motivos** | `DELETE /admin/limpar/motivos` | Remove todos os motivos de uso. |
| **Salas** | `DELETE /admin/limpar/salas` | Remove todas as salas cadastradas. |
| **Aulas Regulares** | `DELETE /admin/limpar/aulas` | Remove todas as aulas regulares. |
| **LIMPAR TUDO** | `DELETE /admin/limpar/tudo` | **Apaga todo o banco de dados** (executa todas as operações acima sequencialmente). |

---

## Como Configurar o Postman

Para executar essas rotas utilizando o Postman, siga os passos abaixo:

### 1. Configuração Básica da Requisição
1. Abra o Postman e clique em **New Request** (Nova Requisição).
2. Dê um nome descritivo (ex: "Limpar Agendamentos").
3. **Importante:** Mude o método de requisição de `GET` para **`DELETE`** no menu dropdown ao lado da barra de endereço.
4. Insira a URL do endpoint desejado.
   - Exemplo: `http://localhost:3000/admin/limpar/usos`

### 2. Autenticação (Sessão)
O sistema GUS utiliza autenticação via sessão (Cookies). Se as rotas estiverem protegidas (middleware `verificaRole` ativo), você precisará estar logado como Admin.

**Passo a Passo para Autenticar no Postman:**

1. Crie uma nova requisição `POST` para a rota de login: `http://localhost:3000/login`.
2. Vá na aba **Body**, selecione **raw** e escolha **JSON**.
3. Insira suas credenciais de administrador:
   ```json
   {
     "solicitante": "admin",
     "password": "sua_senha_admin"
   }
   ```
4. Clique em **Send**. Se o login for bem-sucedido, o Postman salvará automaticamente o cookie `connect.sid`.
5. Agora, volte para a requisição **DELETE** criada no passo 1 e clique em **Send**. O cookie de sessão será enviado automaticamente.

### 3. Interpretando a Resposta

- **Sucesso (Status 200 OK):**
  ```json
  {
      "message": "Todos os usos foram removidos."
  }
  ```
- **Erro de Servidor (Status 500):** Indica falha na conexão com o banco ou erro interno.
- **Não Autorizado (Status 401/403):** Indica que você não fez login ou não tem permissão de admin.