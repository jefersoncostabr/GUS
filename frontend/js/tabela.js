document.getElementById('containerTabela').style.display = 'none';

// Pega dados paginados do servidor
export async function getDados(page = 1, limit = 5, filters = {}) {
    try {
        const baseUrl = window.location.hostname.includes("onrender.com")
            ? "https://gus-q7nn.onrender.com"
            : `http://${window.location.hostname}:3000`;

        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', limit);
        // adicionar filtros não vazios
        Object.keys(filters || {}).forEach((key) => {
            const val = filters[key];
            if (val !== undefined && val !== null && val !== '') {
                params.append(key, val);
            }
        });

        const response = await fetch(`${baseUrl}/usos/usos?${params.toString()}`);
        
        if (!response.ok) {
            const errorMsg = await response.text();
            throw new Error(`Servidor retornou erro ${response.status}: ${errorMsg}`);
        }

        const json = await response.json();

        // Compatibilidade: caso o backend retorne um array diretamente (antigo), normalize
        if (Array.isArray(json)) {
            return { data: json, page: 1, limit, totalItems: json.length, totalPages: 1 };
        }

        return json; // { data, page, limit, totalItems, totalPages }
    } catch (error) {
        console.error('Erro ao buscar dados paginados:', error);
        return { data: [], page: 1, limit, totalItems: 0, totalPages: 1 };
    }
}

// Função para preencher os inputs do formulário
function preencherInputs(dados) {
    // Busca elementos pelo ID para garantir o preenchimento correto
    const elSolicitante = document.getElementById('solicitante');
    const elSala = document.getElementById('sala');
    const elDia = document.getElementById('dia');
    const elMes = document.getElementById('mes'); // Existe apenas no Painel Geral
    const elHora = document.getElementById('hora');
    const elMotivo = document.getElementById('motivo'); // Pode ser Select ou Input
    const elId = document.getElementById('id');

    // Preenchimento básico
    if (elSolicitante) {
        if (dados.solicitante && typeof dados.solicitante === 'object' && dados.solicitante.solicitante) {
            elSolicitante.value = dados.solicitante.solicitante;
        } else {
            elSolicitante.value = dados.solicitante || '';
        }
    }
    if (elSala) elSala.value = dados.sala || '';
    if (elId) elId.value = dados._id || '';

    // Tratamento para Dia (formato DD/MM)
    if (dados.dia && dados.dia.toString().includes('/')) {
        const [diaVal, mesVal] = dados.dia.split('/');
        if (elDia) elDia.value = diaVal;
        if (elMes) elMes.value = mesVal;
    } else {
        if (elDia) elDia.value = dados.dia || '';
    }

    // Tratamento para Hora (formato HH:MM)
    if (elHora) {
        // Se o input for numérico, pega apenas a hora (antes dos dois pontos)
        if (elHora.type === 'number' && dados.hora && dados.hora.toString().includes(':')) {
            elHora.value = dados.hora.split(':')[0];
        } else {
            elHora.value = dados.hora || '';
        }
    }

    // Tratamento para Motivo (Select ou Input)
    if (elMotivo) {
        if (elMotivo.tagName === 'SELECT') {
            // Itera pelas opções para selecionar aquela cujo TEXTO corresponde ao motivo salvo
            // (pois o value pode ser 'opcao1' enquanto o dado é 'Particular')
            Array.from(elMotivo.options).forEach((option, index) => {
                if (option.text === dados.motivo) elMotivo.selectedIndex = index;
            });
        } else {
            elMotivo.value = dados.motivo || '';
        }
    }
}

// Função para atribuir click ao elemento
function atribuirClick(celula, dados) {
  celula.addEventListener('click', () => {
    preencherInputs(dados);
  });
}

function renderTabelaComPaginacao(data) {
    const containerTabela = document.getElementById('tableInner');

    // Criar tabela HTML
    const tabela = document.createElement('table');

    // Criar cabeçalho da tabela
    const cabecalho = tabela.createTHead();
    const linhaCabecalho = cabecalho.insertRow();
    ['Solicitante', 'Sala', 'Dia', 'Hora', 'Motivo'].forEach((coluna) => {
        const celula = linhaCabecalho.insertCell();
        celula.textContent = coluna;
    });

    // Criar linhas da tabela
    data.forEach((dado) => {
        const linha = tabela.insertRow();
        const celulaSolicitante = linha.insertCell();
        
        if (dado.solicitante && typeof dado.solicitante === 'object' && dado.solicitante.solicitante) {
            celulaSolicitante.textContent = dado.solicitante.solicitante;
        } else {
            celulaSolicitante.textContent = dado.solicitante || '---';
        }
        atribuirClick(celulaSolicitante, dado);

        linha.insertCell().textContent = dado.sala;
        linha.insertCell().textContent = dado.dia;
        linha.insertCell().textContent = dado.hora;
        linha.insertCell().textContent = dado.motivo;
    });

    // Adicionar tabela ao documento
    containerTabela.appendChild(tabela);
}

// Cria a tabela c dados
export function criaTabela(data) {
    // data pode ser o objeto de paginação ou um array (compatibilidade)
    let rows = [];
    if (Array.isArray(data)) {
        rows = data;
    } else if (data && Array.isArray(data.data)) {
        rows = data.data;
    }

    // Supondo que você tenha um container para exibir a tabela
    const containerInner = document.getElementById('tableInner');
    if (!containerInner) {
        console.error('Elemento #tableInner não encontrado');
        return;
    }

    // Limpar o container antes de renderizar a tabela (mantendo a paginação em outro container)
    containerInner.innerHTML = '';

    // Chamar a função para criar a tabela com os dados obtidos
    renderTabelaComPaginacao(rows);
}

/*
================================================================================
DOCUMENTAÇÃO DO ARQUIVO: tabela.js
================================================================================

1. FINALIDADE
   Gerencia a busca de dados no servidor e a renderização da tabela HTML no
   frontend, incluindo a integração com a lógica de paginação e preenchimento
   de formulários ao clicar em uma linha.

2. FUNÇÕES
   - getDados: Realiza a requisição GET para a API (/usos/usos) para obter
     a lista completa de registros.
   - preencherInputs: Preenche os campos do formulário de edição com os dados
     da linha selecionada na tabela.
   - atribuirClick: Adiciona um evento de clique nas células da tabela para
     acionar o preenchimento do formulário.
   - renderTabelaComPaginacao: Constrói o HTML da tabela (thead, tbody, rows)
     dinamicamente com base nos dados recebidos.
   - criaTabela: Função principal exportada que orquestra a paginação (via
     paginacao.js) e chama a renderização da tabela.

3. OBSERVAÇÕES
   - Depende de 'paginacao.js' para fatiar os dados conforme a página atual.
   - Manipula diretamente o DOM (document.getElementById, createElement).
================================================================================
*/