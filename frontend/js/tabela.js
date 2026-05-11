document.getElementById('containerTabela').style.display = 'none';

// Pega dados paginados do servidor
export async function getDados(page = 1, limit = 6, filters = {}) {
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
            if (response.status === 403) {
                const painelMensagem = document.getElementById('painelSaida') || document.getElementById('painelMensagem');
                if (painelMensagem) {
                    painelMensagem.textContent = 'Acesso pendente de aprovação';
                }
                return { data: [], page: 1, limit, totalItems: 0, totalPages: 1 };
            }
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
    const elDate = document.getElementById('date');
    const elHora = document.getElementById('hora');
    const elMotivo = document.getElementById('motivo'); // Pode ser Select ou Input
    const elId = document.getElementById('id');

    const converterDiaParaInput = (valorDia) => {
        if (!valorDia || typeof valorDia !== 'string') return '';

        // Já está no formato YYYY-MM-DD — usa direto.
        if (/^\d{4}-\d{2}-\d{2}$/.test(valorDia)) return valorDia;

        // Formatos com barra: D/M/AA, D/M/AAAA, DD/MM/AA, DD/MM/AAAA
        if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(valorDia)) {
            const [diaRaw, mesRaw, anoRaw] = valorDia.split('/');
            const dia = diaRaw.padStart(2, '0');
            const mes = mesRaw.padStart(2, '0');
            const ano = anoRaw.length === 2 ? `20${anoRaw}` : anoRaw;
            return `${ano}-${mes}-${dia}`;
        }

        // Formato ISO com hora (ex: "2026-05-07T00:00:00.000Z")
        if (/^\d{4}-\d{2}-\d{2}T/.test(valorDia)) {
            return valorDia.slice(0, 10);
        }

        return '';
    };

    // Preenchimento básico
    if (elSolicitante) {
        if (dados.solicitante && typeof dados.solicitante === 'object' && dados.solicitante.solicitante) {
            elSolicitante.value = dados.solicitante.solicitante;
        } else {
            elSolicitante.value = dados.solicitante || '';
        }
    }

    // Preenche estúdio (lookup via cache global de salas) e depois a sala
    const salaValor = dados.sala != null ? String(dados.sala) : '';
    if (salaValor) {
        const elEstudio = document.getElementById('estudio');
        const todasAsSalas = window.__todasAsSalas || [];
        const salaEncontrada = todasAsSalas.find((s) => String(s.numero) === salaValor);

        if (salaEncontrada && elEstudio) {
            const eVal = salaEncontrada.estudio || salaEncontrada.estudioId;
            const estudioId = (eVal && typeof eVal === 'object') ? String(eVal._id || eVal.id) : String(eVal || '');
            if (estudioId && elEstudio.value !== estudioId) {
                elEstudio.value = estudioId;
                // Recarrega as opções de sala para o estúdio selecionado
                if (typeof window.__atualizarSalasDisponiveis === 'function') {
                    window.__atualizarSalasDisponiveis();
                }
            }
        }

        if (elSala) {
            const temOpcao = Array.from(elSala.options).some((o) => o.value === salaValor);
            if (!temOpcao) {
                const novaOpcao = document.createElement('option');
                novaOpcao.value = salaValor;
                novaOpcao.textContent = `Sala ${salaValor}`;
                elSala.appendChild(novaOpcao);
            }
            elSala.value = salaValor;
        }
    } else if (elSala) {
        elSala.value = '';
    }

    if (elId) elId.value = dados._id || '';

    if (elDate) {
        elDate.value = converterDiaParaInput(dados.dia);
    }

    // Tratamento para Hora (formato HH:MM)
    if (elHora) {
        elHora.value = dados.hora || '';
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
function atribuirClick(elemento, dados) {
    elemento.addEventListener('click', () => {
        console.log('Registro completo selecionado na tabela:', dados);
        destacarLinhaSelecionada(elemento);
        preencherInputs(dados);
    });
}

function destacarLinhaSelecionada(linhaSelecionada) {
    const tabelaAtual = document.querySelector('#tableInner table');
    if (!tabelaAtual) return;

    tabelaAtual.querySelectorAll('tr').forEach((linha) => {
        linha.classList.remove('linha-destaque');
    });

    if (linhaSelecionada) {
        linhaSelecionada.classList.add('linha-destaque');
    }
}

function destacarUltimoCriado(tabela) {
    const ultimoId = sessionStorage.getItem('ultimoUsoCriadoId');
    if (!ultimoId) return;

    const linhaDestino = tabela.querySelector(`tbody tr[data-id="${ultimoId}"]`);
    if (!linhaDestino) return;

    destacarLinhaSelecionada(linhaDestino);
    sessionStorage.removeItem('ultimoUsoCriadoId');
}

function formatarDiaParaTabela(valorDia) {
        if (!valorDia || typeof valorDia !== 'string') return valorDia || '---';

        // Formato ISO: YYYY-MM-DD -> DD/MM/AA
        if (/^\d{4}-\d{2}-\d{2}$/.test(valorDia)) {
                const [ano, mes, dia] = valorDia.split('-');
                return `${dia}/${mes}/${ano.slice(-2)}`;
        }

        // Formato com barras: DD/MM/YYYY -> DD/MM/AA (mantém DD/MM/AA como está)
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(valorDia)) {
                const [dia, mes, ano] = valorDia.split('/');
                return `${dia}/${mes}/${ano.slice(-2)}`;
        }

        if (/^\d{2}\/\d{2}\/\d{2}$/.test(valorDia)) {
                return valorDia;
        }

        // Para outros formatos (ex: "segunda" em aulas fixas), mantém original.
        return valorDia;
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
        if (dado && dado._id) {
            linha.dataset.id = dado._id;
        }
        const celulaSolicitante = linha.insertCell();
        
        if (dado.solicitante && typeof dado.solicitante === 'object' && dado.solicitante.solicitante) {
            celulaSolicitante.textContent = dado.solicitante.solicitante;
        } else {
            celulaSolicitante.textContent = dado.solicitante || '---';
        }
        atribuirClick(linha, dado);

        linha.insertCell().textContent = dado.sala;
        linha.insertCell().textContent = formatarDiaParaTabela(dado.dia);
        linha.insertCell().textContent = dado.hora;
        linha.insertCell().textContent = dado.motivo;
    });

    // Adicionar tabela ao documento
    containerTabela.appendChild(tabela);

    destacarUltimoCriado(tabela);
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