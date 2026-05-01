/**
 * GUS - Gerenciamento de Uso de Salas
 * JS for loginCriar.html
 */

/**
 * Determines the API base URL by checking the current hostname.
 * @returns {string} The base URL for API requests.
 */
function getBaseUrl() {
    if (window.location.hostname.includes("onrender.com")) {
        return "https://gus-q7nn.onrender.com";
    }
    // Garante localhost se estiver rodando localmente ou via arquivo (hostname vazio)
    const host = window.location.hostname || "localhost";
    return `http://${host}:3000`;
}

/**
 * Handles the submission of the account creation form.
 * @param {Event} event The form submission event.
 */
async function handleCriarConta(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    const msgDiv = document.getElementById('msg');
    const btnSubmit = form.querySelector('button.btnLogin');

    // Validação: Verifica se o nome do estúdio foi preenchido.
    if (!data.estudio) {
        msgDiv.textContent = 'Por favor, selecione ou crie um estúdio.';
        msgDiv.style.color = 'red';
        return;
    }

    // SEGURANÇA: Não enviar o role. O backend determinará automaticamente baseado na existência do estúdio
    // Se for novo estúdio: role = 'admin'
    // Se for estúdio existente: role = 'user'
    
    const originalButtonText = btnSubmit.textContent;
    btnSubmit.textContent = 'Criando...';
    btnSubmit.disabled = true;
    msgDiv.textContent = '';

    try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/solicitantes/solicitantes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            msgDiv.style.color = 'green';
            const role = result.role || 'user';
            msgDiv.textContent = `Conta criada com sucesso! Você é ${role === 'admin' ? 'Administrador' : 'Usuário'} do estúdio. Redirecionando para login...`;
            setTimeout(() => { window.location.href = './login.html'; }, 2500);
        } else {
            msgDiv.style.color = 'red';
            console.error('Detalhes do erro:', result);
            msgDiv.textContent = result.error || 'Ocorreu um erro ao criar a conta.';
        }
    } catch (error) {
        console.error('Erro na requisição para criar conta:', error);
        msgDiv.style.color = 'red';
        msgDiv.textContent = 'Erro de conexão. Tente novamente mais tarde.';
    } finally {
        btnSubmit.textContent = originalButtonText;
        btnSubmit.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const criarForm = document.getElementById('criarForm');
    if (criarForm) {
        criarForm.addEventListener('submit', handleCriarConta);
    }
});