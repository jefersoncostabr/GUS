/**
 * Determina a URL base da API verificando o hostname atual.
 * @returns {string} A URL base para as requisições (localhost ou produção).
 */
function getBaseUrl() {
    return window.location.hostname.includes("onrender.com")
        ? "https://gus-q7nn.onrender.com"
        : `http://${window.location.hostname}:3000`;
}

/**
 * Gerencia o envio do formulário de login.
 * @param {Event} event - O evento de submit do formulário.
 */
async function handleLogin(event) {
    event.preventDefault(); // Impede o envio padrão do formulário

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const painelSaida = document.getElementById('painelSaida');

    // Feedback visual de carregamento
    const btnSubmit = form.querySelector('button');
    const textoOriginal = btnSubmit.textContent;
    btnSubmit.textContent = 'Entrando...';
    btnSubmit.disabled = true;
    painelSaida.textContent = '';

    try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            // Login com sucesso: Redireciona para o Painel Geral
            window.location.href = './painelGeral.html';
        } else {
            // Erro: Exibe mensagem (ex: Senha incorreta)
            painelSaida.textContent = 'Usuário ou senha incorretos.';
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