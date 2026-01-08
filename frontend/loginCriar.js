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
 * Gerencia o envio do formulário de criação de conta.
 * @param {Event} event - O evento de submit do formulário.
 */
async function handleCriarConta(event) {
    event.preventDefault();

    const form = event.target;
    const msgDiv = document.getElementById('msg');
    
    // Captura os valores dos inputs
    const username = document.getElementById('username').value;
    const estudio = document.getElementById('estudio').value;
    const password = document.getElementById('password').value;

    // Monta o objeto de dados
    // Nota: 'solicitante' é usado como nome de usuário no sistema
    const data = {
        solicitante: username,
        estudio: estudio,
        senha: password
    };

    // Feedback visual de carregamento
    const btnSubmit = form.querySelector('button');
    const textoOriginal = btnSubmit.textContent;
    btnSubmit.textContent = 'Criando...';
    btnSubmit.disabled = true;
    msgDiv.textContent = '';

    try {
        const baseUrl = getBaseUrl();
        // Rota ajustada conforme routerSolicitantes.js
        const response = await fetch(`${baseUrl}/solicitantes/solicitantes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            msgDiv.style.color = 'green';
            msgDiv.textContent = 'Conta criada com sucesso! Redirecionando...';
            setTimeout(() => {
                window.location.href = './login.html';
            }, 2000);
        } else {
            let errorMessage = 'Erro ao criar conta.';
            try {
                const errorData = await response.json();
                if (errorData.error) errorMessage = errorData.error;
                if (errorData.message) errorMessage = errorData.message;
            } catch (e) {
                console.error('Erro ao ler resposta do servidor:', e);
            }
            msgDiv.style.color = 'red';
            msgDiv.textContent = errorMessage;
        }
    } catch (error) {
        console.error('Erro ao criar conta:', error);
        msgDiv.style.color = 'red';
        msgDiv.textContent = 'Erro de conexão com o servidor.';
    } finally {
        btnSubmit.textContent = textoOriginal;
        btnSubmit.disabled = false;
    }
}

// Adiciona o ouvinte de evento ao formulário
const criarForm = document.getElementById('criarForm');
if (criarForm) {
    criarForm.addEventListener('submit', handleCriarConta);
}