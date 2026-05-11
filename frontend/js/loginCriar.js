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
    const btnSubmit = form.querySelector('button[type="submit"]');

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
        const response = await fetch(`${baseUrl}/solicitantes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        // Tratamento robusto para a resposta
        let result;
        const contentType = response.headers.get("content-type");
        
        if (contentType && contentType.indexOf("application/json") !== -1) {
            result = await response.json();
        } else {
            // Se não for JSON, provavelmente recebemos um redirecionamento HTML por erro de auth
            const text = await response.text();
            console.error('Resposta não-JSON recebida:', text.substring(0, 100));
            throw new Error('O servidor negou o acesso ou redirecionou a requisição. Verifique as rotas públicas.');
        }

        if (response.ok) {
            msgDiv.style.color = 'green';
            const role = result.role || 'user';
            msgDiv.textContent = `Conta criada com sucesso! Você é ${role === 'admin' ? 'Administrador' : 'Usuário'} do estúdio. Redirecionando para login...`;
            setTimeout(() => { window.location.href = './login.html'; }, 2500);
        } else {
            msgDiv.style.color = 'red';
            msgDiv.textContent = result.error || 'Ocorreu um erro ao criar a conta.';
        }
    } catch (error) {
        console.error('Erro detalhado:', error.message);
        msgDiv.style.color = 'red';
        msgDiv.textContent = `Erro: ${error.message}`;
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