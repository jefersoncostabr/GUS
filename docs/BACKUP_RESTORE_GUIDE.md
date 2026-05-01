# Guia de Backup e Restauração - Sistema GUS

Este documento descreve os procedimentos para garantir a segurança dos dados da aplicação GUS (Gerenciador de Uso de Salas), utilizando o sistema de backup automatizado via `mongodump`.

## 1. Pré-requisitos

Para que o backup e a restauração funcionem, é necessário ter o **MongoDB Database Tools** instalado no servidor/máquina:
- Download MongoDB Database Tools

O script utiliza a variável `MONGO_URI_MASTER` definida no arquivo `.env` para acessar todos os bancos de dados do cluster.

## 2. Execução Manual

Você pode disparar um backup a qualquer momento utilizando o comando npm configurado no `package.json`:

```bash
npm run db:backup
```

Os arquivos serão gerados na pasta `/backups` na raiz do projeto, organizados por data e hora.

## 3. Agendamento Automático

### Em Linux (Ubuntu/Debian) usando Cron
Para rodar o backup todos os dias às 03:00 da manhã:

1. Abra o editor do crontab:
   ```bash
   crontab -e
   ```
2. Adicione a seguinte linha (ajuste o caminho para o seu projeto):
   ```bash
   00 03 * * * cd /caminho/para/o/projeto/GUS && /usr/bin/npm run db:backup >> /var/log/gus_backup.log 2>&1
   ```

### Em Windows usando Agendador de Tarefas
1. Abra o **Agendador de Tarefas**.
2. Crie uma **Tarefa Básica**.
3. Disparador: Diário (escolha o horário).
4. Ação: Iniciar um Programa.
5. Programa/script: `cmd.exe`
6. Argumentos: `/c "cd /d D:\Programação\Minha home\GUS && npm run db:backup"`

## 4. Recuperação e Restauração

A restauração é feita através da ferramenta `mongorestore`. **Atenção:** A restauração pode sobrescrever dados existentes.

### 4.1 Restaurar Todo o Cluster (Master + Todos os Tenants)
Use este comando para recuperar o estado completo do servidor a partir de um backup:

```bash
mongorestore --uri="SUA_URI_DO_MONGODB" --drop ./backups/gus_backup_AAAA-MM-DDTHH-MM-SS
```
*O parâmetro `--drop` remove as coleções atuais antes de restaurar as do backup.*

### 4.2 Restaurar Apenas o Banco Master (Usuários e Estúdios)
Se você precisar recuperar apenas a lista de usuários e estúdios sem afetar os agendamentos dos tenants:

```bash
mongorestore --uri="SUA_URI_DO_MONGODB" --nsInclude="gus_master.*" ./backups/gus_backup_.../gus_master
```

### 4.3 Restaurar um Tenant Específico
Se um estúdio específico teve problemas e você precisa restaurar apenas o banco dele:

1. Localize a pasta do tenant dentro do backup (ex: `gus_tenant_estudio_x_123`).
2. Execute:
```bash
mongorestore --uri="SUA_URI_DO_MONGODB" --nsInclude="NOME_DO_BANCO_TENANT.*" ./backups/gus_backup_.../NOME_DO_BANCO_TENANT
```

## 5. Boas Práticas de Segurança

1. **Off-site Backup:** Não mantenha os backups apenas no mesmo servidor da aplicação. Periodicamente, baixe a pasta `/backups` para um local seguro ou nuvem (S3, Google Drive, etc).
2. **Teste de Restauração:** Uma vez por mês, tente restaurar um backup em um banco de dados de teste para garantir que os arquivos não estão corrompidos.
3. **Retenção:** O script atual não apaga backups antigos. Monitore o espaço em disco e remova backups com mais de 30 dias manualmente ou via script auxiliar.

---

<!--
[PROMPT_SUGGESTION]Crie um script em Node.js para deletar automaticamente backups com mais de 15 dias para economizar espaço.[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Como posso enviar o arquivo de backup automaticamente para o Google Drive após a conclusão do script?[/PROMPT_SUGGESTION]
-->