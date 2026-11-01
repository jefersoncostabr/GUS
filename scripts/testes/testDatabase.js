import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';

export function createTestDatabaseName() {
    return `gus_test_${process.pid}_${randomBytes(6).toString('hex')}`;
}

export async function connectToTestDatabase() {
    if (process.env.NODE_ENV !== 'test') {
        throw new Error('O banco descartável só pode ser usado com NODE_ENV=test.');
    }

    const uri = process.env.MONGO_URI_TEST;
    if (!uri) {
        throw new Error('Configure MONGO_URI_TEST com a URI de uma instância MongoDB exclusiva para testes.');
    }
    if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
        throw new Error('MONGO_URI_TEST deve ser uma URI MongoDB válida.');
    }
    if (mongoose.connection.readyState !== 0) {
        throw new Error('A conexão padrão do Mongoose já está em uso; não é seguro abrir o banco de teste.');
    }

    const databaseName = createTestDatabaseName();
    await mongoose.connect(uri, { dbName: databaseName });
    const connection = mongoose.connection;
    let disposed = false;

    return {
        connection,
        databaseName,
        async dispose() {
            if (disposed) return;

            try {
                await connection.dropDatabase();
            } finally {
                try {
                    await mongoose.disconnect();
                } finally {
                    disposed = true;
                }
            }
        }
    };
}
