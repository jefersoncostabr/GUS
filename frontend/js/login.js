console.log('login.js carregado');
import { resetarNavbar } from "./resetarNavbar.js";
import { API_BASE_URL } from "./config.js";

// Ao carregar a página de login, fazemos uma requisição para garantir que a sessão seja encerrada no servidor
(async function logoutAutomatico() {
    try {
        await fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        console.log('Sessão encerrada.');

        resetarNavbar();
    } catch (error) {
        console.error('Erro ao tentar fazer logout:', error);
    }
})();

/**
 * Gerencia o envio do formulário de login.
 * @param {Event} event - O evento de submit do formulário.
 */
async function handleLogin(event) {
    event.preventDefault(); // Impede o envio padrão do formulário

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const painelSaida = document.getElementById('painelMensagem');

    // Feedback visual de carregamento
    const btnSubmit = form.querySelector('button');
    const textoOriginal = btnSubmit.textContent;
    btnSubmit.textContent = 'Entrando...';
    btnSubmit.disabled = true;
    painelSaida.textContent = '';

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        console.log('API_BASE_URL:', API_BASE_URL);

        if (response.ok) {
            // Login com sucesso: verifica o role antes de redirecionar
            let dados = {};
            try { dados = await response.json(); } catch (e) { /* ignora */ }

            if (dados.role === 'pendente') {
                window.location.href = './aguardando.html';
            } else {
                window.location.href = './painelGeral.html';
            }
        } else {
            // Erro: Exibe mensagem (ex: Senha incorreta)
            let errorMessage = 'Usuário ou senha incorretos.';
            try {
                const errorData = await response.json();
                if (errorData.error) errorMessage = errorData.error;
            } catch (e) {
                console.error('Erro ao ler resposta do servidor:', e);
            }
            painelSaida.textContent = errorMessage;
        }
    } catch (error) {
        console.error('Erro no login:', error);
        painelSaida.textContent = 'Erro de conexão com o servidor.';
    } finally {
        btnSubmit.textContent = textoOriginal;
        btnSubmit.disabled = false;
    }
}

// Adiciona o ouvinte de evento ao formulário
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}