import mongoose from 'mongoose';
import 'dotenv/config';

// Cache para armazenar as conexões dos tenants ativas.
const tenantConnections = {};

/**
 * Conecta ao banco de dados "Master".
 * Esta conexão é usada para autenticação e para obter informações dos tenants.
 * Deve ser chamada uma vez na inicialização do servidor.
 */
export async function connectToMasterDb() {
    try {
        // Assume que seu .env terá uma URI para o banco master. Ex: MONGO_URI_MASTER
        await mongoose.connect(process.env.MONGO_URI_MASTER);
        console.log('Conexão com o banco de dados Master estabelecida com sucesso.');
    } catch (error) {
        console.error('Erro ao conectar ao banco de dados Master:', error);
        process.exit(1); // Encerra a aplicação se não conseguir conectar ao Master.
    }
}

/**
 * Obtém ou cria uma conexão para um tenant específico.
 * As conexões são cacheadas para reutilização, evitando sobrecarga.
 * @param {string} tenantId - O identificador único do tenant (ex: 'estudio_a').
 * @returns {Promise<mongoose.Connection>} A conexão do Mongoose para o banco do tenant.
 */
export async function getTenantConnection(tenantId) {
    const dbName = `gus_tenant_${tenantId}`;

    // validação preventiva: Atlas limita a 38 bytes
    if (dbName.length > 38) {
        const msg = `Nome de banco inválido (comprimento ${dbName.length}>38): ${dbName}. ` +
            `Gere um tenantId mais curto ou corrija os registros existentes.`;
        console.error(msg);
        throw new Error(msg);
    }

    // 1. Verifica se a conexão já existe no cache e está pronta para uso.
    const existing = tenantConnections[dbName];
    if (existing) {
        if (existing.readyState === 1) {
            if (process.env.DEBUG_TENANT === 'true') {
                console.log(`Reutilizando conexão para o banco: ${dbName}`);
            }
            return existing;
        }
        if (existing.readyState === 2) {
            // já está em processo de conexão; aguardamos a promessa para evitar duplicatas
            console.log(`Conexão para ${dbName} já está se estabelecendo, aguardando...`);
            await existing.asPromise();
            return existing;
        }
        // readyState 0 ou 3 = desconectada, vamos recriar abaixo
    }

    // 2. Se não existe ou precisa ser recriada, cria uma nova conexão usando createConnection.
    try {
        console.log(`Criando nova conexão para o banco: ${dbName}`);
        // Assume uma URI base no .env sem o nome do banco. Ex: MONGO_URI_BASE
        const mongoUriBase = process.env.MONGO_URI_BASE;
        const tenantConnection = mongoose.createConnection(`${mongoUriBase}/${dbName}?retryWrites=true&w=majority`);

        // Aguarda a conexão ser estabelecida.
        await tenantConnection.asPromise();

        // 3. Armazena a nova conexão no cache para futuras requisições.
        tenantConnections[dbName] = tenantConnection;

        // Opcional: Lida com eventos de desconexão para limpar o cache.
        tenantConnection.on('disconnected', () => {
            console.log(`Conexão com ${dbName} foi perdida.`);
            delete tenantConnections[dbName];
        });

        return tenantConnection;
    } catch (error) {
        console.error(`Erro ao conectar ao banco do tenant ${dbName}:`, error);
        throw error; // Propaga o erro para ser tratado pelo chamador.
    }
}

/*
================================================================================
DOCUMENTAÇÃO: O Conceito de "Connection Factory" (Fábrica de Conexões)
================================================================================

1. O PROBLEMA A SER RESOLVIDO
   Em uma arquitetura multi-tenant (um banco por cliente/estúdio), a aplicação
   não pode mais ter uma única conexão global com o banco de dados. Ela precisa
   ser capaz de se conectar a múltiplos bancos:
   - Um banco "Master": para dados globais como usuários e a lista de estúdios (tenants).
   - Vários bancos "Tenant": um para cada estúdio, contendo seus dados de negócio
     (agendamentos, salas, etc.).

2. O QUE É A "CONNECTION FACTORY"?
   É um padrão de projeto implementado neste arquivo. Em vez de conectar-se
   diretamente, o resto da aplicação "pede" uma conexão a esta "fábrica".
   Esta fábrica é responsável por decidir qual conexão entregar.

3. COMO ESTE ARQUIVO IMPLEMENTA O PADRÃO
   - `connectToMasterDb()`: Estabelece a conexão principal e única com o banco Master
     na inicialização do servidor.
   - `getTenantConnection(tenantId)`: É a função "fábrica". Quando um controller
     precisa acessar os dados de um estúdio específico, ele chama esta função
     com o ID do estúdio.
   - Cache de Conexões (`tenantConnections`): Esta é a parte mais importante para a
     performance. Criar uma nova conexão com o banco a cada requisição é muito lento.
     Este objeto funciona como um "pool" ou "cache":
       - Se uma conexão para o `tenantId` já foi criada e está ativa, ela é
         instantaneamente reutilizada.
       - Se não, uma nova conexão é criada, armazenada no cache e retornada.

EM RESUMO: Este arquivo atua como uma "central telefônica" inteligente para o
banco de dados. Ele gerencia um conjunto de conexões e entrega a conexão
correta (seja a Master ou a de um estúdio específico) de forma rápida e eficiente.
================================================================================
*/