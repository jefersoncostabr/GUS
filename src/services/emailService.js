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

function escaparHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

export const enviarAvisoNovoTenant = async ({ nomeEstudio, tenantDbName, usuarioNome, usuarioEmail, usuarioRole, trialEndsAt }) => {
    const fimDoTrial = trialEndsAt
        ? new Date(trialEndsAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        : 'não informado';
    const dados = {
        nomeEstudio: escaparHtml(nomeEstudio),
        tenantDbName: escaparHtml(tenantDbName),
        usuarioNome: escaparHtml(usuarioNome),
        usuarioEmail: escaparHtml(usuarioEmail),
        usuarioRole: escaparHtml(usuarioRole),
        fimDoTrial: escaparHtml(fimDoTrial)
    };

    const { error } = await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: 'jefersonb88@gmail.com',
        subject: 'Novo estúdio e tenant criados no GUS',
        html: `
            <h2>Novo tenant criado</h2>
            <p><strong>Estúdio:</strong> ${dados.nomeEstudio}</p>
            <p><strong>Banco tenant:</strong> ${dados.tenantDbName}</p>
            <p><strong>Usuário inicial:</strong> ${dados.usuarioNome}</p>
            <p><strong>E-mail do usuário:</strong> ${dados.usuarioEmail}</p>
            <p><strong>Perfil atribuído:</strong> ${dados.usuarioRole}</p>
            <p><strong>Fim do período de teste:</strong> ${dados.fimDoTrial}</p>
        `
    });

    if (error) throw error;
};
