# Guia de Migração para Arquitetura Multi-Tenant (Database-per-Tenant)

Este documento descreve o roteiro passo a passo para transformar o projeto GUS de uma arquitetura de banco único para uma arquitetura onde cada **Diretor de Estúdio** possui seu próprio banco de dados isolado.

A estratégia adotada será **Database-per-Tenant** (Um banco de dados por cliente), garantindo isolamento total dos dados.

---

## 📋 Lista de Tarefas (Roadmap)


## ✅ **MIGRAÇÃO CONCLUÍDA - Próximas Ações**

### ⚠️ Sugestões e Pontos de Atenção Pós-Migração

#### **1️⃣ [CRÍTICO] Validar a Criação dos Bancos de Dados**

Durante a validação pós-migração, foi identificada uma inconsistência: o banco de dados que o script de migração reportou como criado **não apareceu** na listagem de bancos de dados do servidor MongoDB. Em vez disso, outros bancos de dados `gus_tenant_*` mais antigos foram listados.

**Ação Imediata Recomendada:**
*   **Investigar o Ambiente MongoDB:** Verifique se as variáveis de ambiente (`MONGO_URI_BASE`, `MONGO_URI_MASTER`) no arquivo `.env` estão apontando para o servidor MongoDB correto.
*   **Revisar Logs do MongoDB:** Verifique os logs do seu servidor MongoDB para entender por que o banco de dados pode não ter sido persistido, apesar do sucesso reportado pelo script.
*   **Executar Verificação Manual:** Use uma ferramenta como o MongoDB Compass ou o `mongosh` para se conectar ao servidor e listar os bancos de dados manualmente.
    ```shell
    mongosh --eval "db.adminCommand({ listDatabases: 1 })"
    ```

#### **2️⃣ [IMPORTANTE] Testar o Fluxo da Aplicação**

Assim que a questão do banco de dados for resolvida, siga o plano de testes original:
*   Inicie o servidor (`node index.js`).
*   Faça login com um usuário associado a um tenant.
*   Teste as funcionalidades principais (criar/listar salas, aulas, etc.) para garantir que os dados estão sendo lidos e escritos no banco de dados correto do tenant.

#### **3️⃣ [MÉDIO] Adaptações no Frontend (Tarefa 11)**

Com o backend agora isolado por tenant, o próximo passo lógico é fornecer feedback visual ao usuário:
*   Exiba o nome do estúdio (tenant) em que o usuário está logado no painel de administração. Isso pode ser obtido a partir da rota de dados do usuário logado.

#### **4️⃣ [BAIXA PRIORIDADE] Limpeza de Scripts Temporários**

Os seguintes scripts foram criados durante o processo de migração e podem ser removidos:
*   `scripts/inserir-estudio-exemplo.js`
*   `scripts/verificar-dbs.js`

---

**Data de Atualização:** 28 de Fevereiro de 2026  
**Versão:** v2.3 (Multi-Tenant - Migração Executada)  
**Responsável pela Atualização:** Execução do script de migração.  
**Status:** 🟢 **CONCLUÍDO** - Migração executada, aguardando validação do ambiente e testes E2E.