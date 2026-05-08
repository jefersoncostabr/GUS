import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const enviarEmailRecuperacao = async (destinatario, token) => {
    const link = `${process.env.APP_URL}/resetar-senha.html?token=${token}`;

    await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: destinatario,
        subject: 'Recuperacao de Senha - GUS',
        html: `
            <h2>Recuperacao de Senha</h2>
            <p>Clique no link abaixo para redefinir sua senha. O link expira em <strong>1 hora</strong>.</p>
            <a href="${link}">${link}</a>
            <p>Se voce nao solicitou isso, ignore este e-mail.</p>
        `
    });
};
