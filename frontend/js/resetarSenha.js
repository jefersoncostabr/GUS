import { API_BASE_URL } from './config.js';

function obterTokenDaUrl() {
    return new URLSearchParams(window.location.search).get('token');
}

async function handleResetarSenha(event) {
    event.preventDefault();

    const token = obterTokenDaUrl();
    const painelMensagem = document.getElementById('painelMensagem');

    if (!token) {
        painelMensagem.style.color = 'red';
        painelMensagem.textContent = 'Token ausente na URL. Solicite um novo link de recuperacao.';
        return;
    }

    const form = event.target;
    const novaSenha = document.getElementById('novaSenha').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;

    if (novaSenha !== confirmarSenha) {
        painelMensagem.style.color = 'red';
        painelMensagem.textContent = 'As senhas nao coincidem.';
        return;
    }

    const btnSubmit = form.querySelector('button[type="submit"]');
    const textoOriginal = btnSubmit.textContent;

    btnSubmit.textContent = 'Redefinindo...';
    btnSubmit.disabled = true;
    painelMensagem.textContent = '';

    try {
        const response = await fetch(`${API_BASE_URL}/resetar-senha`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, novaSenha })
        });

        let result = {};
        try {
            result = await response.json();
        } catch {
            result = {};
        }

        if (response.ok) {
            painelMensagem.style.color = 'green';
            painelMensagem.textContent = result.message || 'Senha redefinida com sucesso. Redirecionando para login...';
            setTimeout(() => {
                window.location.href = './login.html';
            }, 1800);
        } else {
            painelMensagem.style.color = 'red';
            painelMensagem.textContent = result.error || 'Token invalido ou expirado.';
        }
    } catch (error) {
        console.error('Erro ao resetar senha:', error);
        painelMensagem.style.color = 'red';
        painelMensagem.textContent = 'Erro de conexao com o servidor.';
    } finally {
        btnSubmit.textContent = textoOriginal;
        btnSubmit.disabled = false;
    }
}

const resetarSenhaForm = document.getElementById('resetarSenhaForm');
if (resetarSenhaForm) {
    resetarSenhaForm.addEventListener('submit', handleResetarSenha);
}
