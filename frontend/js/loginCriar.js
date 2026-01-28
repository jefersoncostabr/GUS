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
 * Fetches the list of studios from the backend and populates the select dropdown.
 */
async function carregarEstudios() {
    const selectEstudio = document.getElementById('estudio');
    const baseUrl = getBaseUrl();

    // Adiciona feedback visual e desabilita enquanto carrega
    selectEstudio.innerHTML = '<option value="" disabled selected>Carregando...</option>';
    selectEstudio.disabled = true;

    try {
        // Assuming a GET /estudios endpoint exists to fetch all studios
        const url = `${baseUrl}/estudios`;
        // console.log(`Buscando estúdios em: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const estudios = await response.json();

        // Clear the placeholder option
        selectEstudio.innerHTML = '';
        selectEstudio.disabled = false;

        if (estudios && estudios.length > 0) {
            // Add a default, disabled option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Selecione o estúdio';
            defaultOption.disabled = true;
            defaultOption.selected = true;
            selectEstudio.appendChild(defaultOption);

            // Populate with studios from the API
            // Assuming the studio object has a 'nome' property which is unique.
            estudios.forEach(estudio => {
                const option = document.createElement('option');
                option.value = estudio._id; // Envia o ID (esperado pelo banco) em vez do nome
                option.textContent = estudio.nome;
                selectEstudio.appendChild(option);
            });
        } else {
            selectEstudio.innerHTML = '<option value="">Nenhum estúdio disponível</option>';
        }

    } catch (error) {
        console.error('Erro ao carregar estúdios:', error);
        selectEstudio.innerHTML = '<option value="">Erro ao carregar estúdios</option>';
        selectEstudio.disabled = true;
    }
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

    if (!data.estudio) {
        msgDiv.textContent = 'Por favor, selecione um estúdio.';
        return;
    }

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
            msgDiv.textContent = 'Conta criada com sucesso! Você será redirecionado para o login.';
            setTimeout(() => { window.location.href = './login.html'; }, 2500);
        } else {
            msgDiv.style.color = 'red';
            console.error('Detalhes do erro 400:', result); // Mostra no console o motivo exato da recusa
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
    carregarEstudios();

    const criarForm = document.getElementById('criarForm');
    if (criarForm) {
        criarForm.addEventListener('submit', handleCriarConta);
    }
});