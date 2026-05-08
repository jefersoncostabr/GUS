import { API_BASE_URL } from './config.js';

async function handleEsqueciSenha(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const painelMensagem = document.getElementById('painelMensagem');
    const btnSubmit = form.querySelector('button[type="submit"]');
    const textoOriginal = btnSubmit.textContent;

    btnSubmit.textContent = 'Enviando...';
    btnSubmit.disabled = true;
    painelMensagem.textContent = '';

    try {
        const response = await fetch(`${API_BASE_URL}/esqueci-senha`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ solicitante: data.solicitante, email: data.email })
        });

        let result = {};
        try {
            result = await response.json();
        } catch {
            result = {};
        }

        if (response.ok) {
            painelMensagem.style.color = 'green';
            painelMensagem.textContent = result.message || 'Se este e-mail estiver cadastrado, voce recebera as instrucoes em breve.';
            form.reset();
        } else {
            painelMensagem.style.color = 'red';
            painelMensagem.textContent = result.error || 'Nao foi possivel processar sua solicitacao agora.';
        }
    } catch (error) {
        console.error('Erro ao solicitar recuperacao:', error);
        painelMensagem.style.color = 'red';
        painelMensagem.textContent = 'Erro de conexao com o servidor.';
    } finally {
        btnSubmit.textContent = textoOriginal;
        btnSubmit.disabled = false;
    }
}

const esqueciSenhaForm = document.getElementById('esqueciSenhaForm');
if (esqueciSenhaForm) {
    esqueciSenhaForm.addEventListener('submit', handleEsqueciSenha);
}
