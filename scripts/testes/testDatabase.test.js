import {
    connectToTestDatabase,
    createTestDatabaseName
} from './testDatabase.js';

describe('Infraestrutura de banco descartável', () => {
    it('gera nomes de banco exclusivos e identificados como teste', () => {
        const firstName = createTestDatabaseName();
        const secondName = createTestDatabaseName();

        expect(firstName).toMatch(/^gus_test_\d+_[a-f0-9]+$/);
        expect(firstName).not.toBe(secondName);
        expect(firstName.length).toBeLessThanOrEqual(38);
    });

    it('recusa conexão fora do ambiente de testes', async () => {
        const previousEnvironment = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        try {
            await expect(connectToTestDatabase()).rejects.toThrow('NODE_ENV=test');
        } finally {
            if (previousEnvironment === undefined) {
                delete process.env.NODE_ENV;
            } else {
                process.env.NODE_ENV = previousEnvironment;
            }
        }
    });

    it('exige URI exclusiva e não usa a URI Master como fallback', async () => {
        const previousTestUri = process.env.MONGO_URI_TEST;
        const previousMasterUri = process.env.MONGO_URI_MASTER;
        const previousEnvironment = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';
        delete process.env.MONGO_URI_TEST;
        process.env.MONGO_URI_MASTER = 'mongodb://127.0.0.1:27017/gus_master';

        try {
            await expect(connectToTestDatabase()).rejects.toThrow('MONGO_URI_TEST');
        } finally {
            if (previousTestUri === undefined) {
                delete process.env.MONGO_URI_TEST;
            } else {
                process.env.MONGO_URI_TEST = previousTestUri;
            }
            if (previousMasterUri === undefined) {
                delete process.env.MONGO_URI_MASTER;
            } else {
                process.env.MONGO_URI_MASTER = previousMasterUri;
            }
            if (previousEnvironment === undefined) {
                delete process.env.NODE_ENV;
            } else {
                process.env.NODE_ENV = previousEnvironment;
            }
        }
    });

    it('rejeita URI que não seja MongoDB', async () => {
        const previousTestUri = process.env.MONGO_URI_TEST;
        const previousEnvironment = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';
        process.env.MONGO_URI_TEST = 'https://example.invalid/database';

        try {
            await expect(connectToTestDatabase()).rejects.toThrow('URI MongoDB válida');
        } finally {
            if (previousTestUri === undefined) {
                delete process.env.MONGO_URI_TEST;
            } else {
                process.env.MONGO_URI_TEST = previousTestUri;
            }
            if (previousEnvironment === undefined) {
                delete process.env.NODE_ENV;
            } else {
                process.env.NODE_ENV = previousEnvironment;
            }
        }
    });
});
