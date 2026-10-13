import 'dotenv/config';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { getSolicitanteModel } from '../src/models/usuariosmodel.js';

function solicitarSenhaOculta() {
    if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
        throw new Error('Execute este comando em um terminal interativo para informar a senha com segurança.');
    }

    return new Promise((resolve, reject) => {
        let senha = '';
        stdout.write('Senha superadmin (mínimo 12 caracteres): ');
        stdin.setRawMode(true);
        stdin.resume();

        const finalizar = (erro = null) => {
            stdin.setRawMode(false);
            stdin.pause();
            stdin.removeListener('data', receberTecla);
            stdout.write('\n');
            if (erro) reject(erro);
            else resolve(senha);
        };

        const receberTecla = (buffer) => {
            const tecla = buffer.toString('utf8');
            if (tecla === '\u0003') return finalizar(new Error('Operação cancelada.'));
            if (tecla === '\r' || tecla === '\n') return finalizar();
            if (tecla === '\u007f' || tecla === '\b') {
                senha = senha.slice(0, -1);
                return;
            }
            if (!tecla.startsWith('\u001b')) senha += tecla;
        };

        stdin.on('data', receberTecla);
    });
}

async function main() {
    if (!process.env.MONGO_URI_MASTER) throw new Error('MONGO_URI_MASTER não está configurada.');

    const prompt = readline.createInterface({ input: stdin, output: stdout });
    const emailInformado = process.env.SUPERADMIN_EMAIL
        || await prompt.question('E-mail do superadmin: ');
    prompt.close();

    const email = emailInformado.trim().toLowerCase();
    const senha = await solicitarSenhaOculta();
    if (!email || !senha) throw new Error('E-mail e senha são obrigatórios.');
    if (senha.length < 12) throw new Error('A senha do superadmin deve ter pelo menos 12 caracteres.');

    await mongoose.connect(process.env.MONGO_URI_MASTER);
    const Solicitante = getSolicitanteModel(mongoose.connection);
    const existente = await Solicitante.findOne({ $or: [{ email }, { solicitante: email }] }).lean();
    if (existente) throw new Error('Já existe uma conta com esse e-mail ou identificador. Use uma conta dedicada ao superadmin.');

    const senhaHash = await bcrypt.hash(senha, 10);
    await Solicitante.create({
        solicitante: email,
        email,
        senha: senhaHash,
        role: 'superadmin'
    });

    console.log(`Conta superadmin criada para ${email}.`);
}

main()
    .catch((error) => {
        console.error(`Falha ao criar superadmin: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });