import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectToMasterDb } from './src/config/connectionFactory.js';
import { createApp } from './app.js';

dotenv.config();

await connectToMasterDb();
const conexao = mongoose.connection;

conexao.on('error', (erro) => {
    console.error('erro de conexão com o DB', erro);
});

conexao.once('open', () => {
    console.log('Conexao com o banco feita com sucesso');
});

let sessionStore;
if (process.env.NODE_ENV !== 'test') {
    const { default: MongoStore } = await import('connect-mongo');
    sessionStore = MongoStore.create({
        client: conexao.getClient(),
        collectionName: 'sessions_gus',
        touchAfter: 24 * 3600
    });
}
const app = createApp({ sessionStore });
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Servidor rodando na porta ${PORT}`);

        const baseUrl = process.env.NODE_ENV === 'production'
            ? 'https://gus-q7nn.onrender.com'
            : `http://localhost:${PORT}/painelgeral.html`;
        console.log('Resultado do teste de URL:', baseUrl);
    });
}

export default app;
