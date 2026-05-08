/**
 * Define a URL base da API com base no ambiente (produção ou local).
 * @returns {string} A URL base.
 */
let todasAsSalas = [];
// Expõe globalmente para que tabela.js possa consultar sem importação circular
window.__todasAsSalas = todasAsSalas;

function getBaseUrl() {
    return window.location.hostname.includes("onrender.com")
        ? "https://gus-q7nn.onrender.com"
        : `http://${window.location.hostname}:3000`;
}

/**
 * Busca os dados do usuário logado na sessão e preenche o campo 'solicitante'.
 */
async function carregarDadosUsuario() {
    try {
        const response = await fetch(`${getBaseUrl()}/usuario-logado`);
        if (!response.ok) {
            throw new Error('Usuário não logado ou sessão expirada.');
        }
        const userData = await response.json();
        const solicitanteInput = document.getElementById('solicitante');
        if (solicitanteInput && userData && userData.solicitante) {
            solicitanteInput.value = userData.solicitante;
        }
    } catch (error) {
        console.warn(error.message); // Apenas um aviso, pois o usuário pode preencher manualmente.
    }
}

/**
 * Busca a lista de estúdios disponíveis e preenche o campo select.
 */
async function carregarEstudios() {
    const selectEstudio = document.getElementById('estudio');
    if (!selectEstudio) return;

    try {
        const response = await fetch(`${getBaseUrl()}/estudios`);
        if (!response.ok) {
            throw new Error('Falha ao carregar estúdios.');
        }
        const estudios = await response.json();

        // Limpa opções existentes e adiciona uma padrão
        selectEstudio.innerHTML = '<option value="">Selecione</option>';

        estudios.forEach(estudio => {
            const option = document.createElement('option');
            option.value = estudio._id; // O valor será o ID do estúdio
            option.textContent = estudio.nome; // O texto visível será o nome
            selectEstudio.appendChild(option);
        });

    } catch (error) {
        console.error('Erro ao carregar estúdios:', error.message);
        selectEstudio.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

/**
 * Busca todas as salas e armazena em cache para filtragem rápida.
 */
async function carregarTodasAsSalas() {
    try {
        const response = await fetch(`${getBaseUrl()}/admin/salas`);
        if (!response.ok) {
            throw new Error('Falha ao carregar lista de salas.');
        }
        todasAsSalas = await response.json();
        window.__todasAsSalas = todasAsSalas; // mantém referência global atualizada
    } catch (error) {
        console.error('Erro ao carregar todas as salas:', error.message);
        todasAsSalas = [];
        window.__todasAsSalas = [];
    }
}

/**
 * Filtra e exibe as salas disponíveis com base no estúdio selecionado.
 * Esta função é chamada sempre que o select de estúdio é alterado.
 */
function atualizarSalasDisponiveis() {
    const selectEstudio = document.getElementById('estudio');
    const selectSala = document.getElementById('sala');
    const estudioId = selectEstudio.value;

    if (!selectSala) return;

    // Limpa as opções de sala e adiciona uma opção padrão
    selectSala.innerHTML = '<option value="">Selecione</option>';

    if (!estudioId) {
        return; // Se nenhum estúdio for selecionado, deixa o select de sala vazio (com a opção padrão)
    }

    // Filtra as salas que pertencem ao estúdio selecionado
    const salasDoEstudio = todasAsSalas.filter(sala => {
        // Lida com o caso de o estúdio ser um objeto populado ou apenas um ID
        const eVal = sala.estudio || sala.estudioId;
        const idDoEstudioNaSala = (eVal && typeof eVal === 'object') ? (eVal._id || eVal.id) : eVal;
        return idDoEstudioNaSala == estudioId;
    });

    // Preenche o select de salas com as opções filtradas
    salasDoEstudio.forEach(sala => {
        const option = document.createElement('option');
        option.value = sala.numero; 
        option.textContent = sala.nome ? `${sala.nome} (Sala ${sala.numero})` : `Sala ${sala.numero}`;
        selectSala.appendChild(option);
    });
}

// Lógica para completar minutos automaticamente ao sair do campo de hora
const horaField = document.getElementById('hora');
if (horaField) {
    horaField.addEventListener('blur', function() {
        let valor = this.value.trim();
        // Se o usuário digitou apenas números (1 ou 2 dígitos), ex: "9" ou "14"
        if (valor && !valor.includes(':')) {
            if (valor.length <= 2) {
                const hora = valor.padStart(2, '0');
                this.value = `${hora}:00`;
            }
        }
    });
}

// Adiciona o evento de clique ao campo para acionar o preenchimento automático.
const solicitanteField = document.getElementById('solicitante');
if (solicitanteField) {
    solicitanteField.addEventListener('click', carregarDadosUsuario);
}

// Expõe atualizarSalasDisponiveis globalmente para que tabela.js possa acionar
window.__atualizarSalasDisponiveis = atualizarSalasDisponiveis;

// Adiciona o listener para o evento de mudança no select de estúdio.
const estudioSelect = document.getElementById('estudio');
if (estudioSelect) {
    estudioSelect.addEventListener('change', atualizarSalasDisponiveis);
}

// Função de inicialização para carregar dados essenciais em paralelo.
async function init() {
    await Promise.all([
        carregarEstudios(),
        carregarTodasAsSalas()
    ]);
}

init();