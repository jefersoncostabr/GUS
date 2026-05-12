import { criaTabela, getDados } from "./tabela.js";
import { currentPage, itemsPorPagina, setOnPageChange, setTotalPages, setPage, criarElementospaginacaoTab } from "./paginacao.js";
import { tratarDados } from "./tratamentoDeDados.js";
import { normalizarListaAulas } from "./normalizador.js";

let mostrandoAulasFixas = false;
let dadosAulasFixasCached = []; // cache para paginação client-side das aulas fixas
let filtrosBuscaAtual = {}; // mantém os filtros aplicados na última busca (botão Ver)
let filtrosFrontend = {}; // filtros a serem aplicados localmente (client-side)

function setTabelaLoading(carregando) {
    const indicador = document.getElementById('tabelaLoadingIndicator');
    if (!indicador) return;

    indicador.classList.toggle('is-visible', carregando);
    indicador.setAttribute('aria-hidden', carregando ? 'false' : 'true');
}

/**
 * Atualiza o span #filtrosAtivos com um resumo legível dos filtros ativos.
 */
function atualizarFiltrosLabel() {
    const el = document.getElementById('filtrosAtivos');
    if (!el) return;

    const partes = [];

    const solicitante = document.getElementById('solicitante')?.value.trim();
    if (solicitante) partes.push(solicitante);

    const estudioSel = document.getElementById('estudio');
    if (estudioSel && estudioSel.value) partes.push(estudioSel.options[estudioSel.selectedIndex]?.text || estudioSel.value);

    const salaSel = document.getElementById('sala');
    if (salaSel && salaSel.value) partes.push(salaSel.options[salaSel.selectedIndex]?.text || salaSel.value);

    const dia = document.getElementById('date')?.value;
    if (dia) {
        const [y, m, d] = dia.split('-');
        partes.push(`${d}/${m}/${y}`);
    }

    const hora = document.getElementById('hora')?.value.trim();
    if (hora) partes.push(hora);

    const motivoSel = document.getElementById('motivo');
    if (motivoSel && motivoSel.value) partes.push(motivoSel.options[motivoSel.selectedIndex]?.text || motivoSel.value);

    el.textContent = partes.length ? partes.join(' | ') : '';
}

/**
 * Filtra localmente um array de dados de acordo com os filtros do frontend.
 * @param {Array} dados - Array com os dados a filtrar
 * @param {Object} filtros - Objeto com filtros { solicitante, sala, dia, hora, motivo }
 * @returns {Array} Array filtrado
 */
function filtrarDadosLocalmente(dados, filtros) {
    if (!dados || dados.length === 0 || Object.keys(filtros).length === 0) {
        return dados;
    }

    return dados.filter(item => {
        // Filtro por solicitante
        if (filtros.solicitante && item.solicitante) {
            if (!item.solicitante.toLowerCase().includes(filtros.solicitante.toLowerCase())) {
                return false;
            }
        }

        // Filtro por sala (comparação numérica)
        if (filtros.sala !== undefined && item.sala !== filtros.sala) {
            return false;
        }

        // Filtro por dia (para usos é DD/MM/AA, para aulas é nome do dia)
        if (filtros.dia && item.dia) {
            if (!item.dia.toString().includes(filtros.dia.toString())) {
                return false;
            }
        }

        // Filtro por hora
        if (filtros.hora && item.hora) {
            if (!item.hora.includes(filtros.hora)) {
                return false;
            }
        }

        // Filtro por motivo
        if (filtros.motivo && item.motivo) {
            if (!item.motivo.toLowerCase().includes(filtros.motivo.toLowerCase())) {
                return false;
            }
        }

        return true;
    });
}

/**
 * Remove o conteúdo atual da tabela do DOM para preparar nova renderização.
 * Limpa apenas a área da tabela (não remove os controles de paginação).
 */
function limparTabela() {
    // Limpa apenas a área da tabela (não remove os controles de paginação)
    const containerInner = document.getElementById('tableInner');
    if (containerInner) containerInner.innerHTML = '';
}


/**
 * Busca os dados no servidor com paginação e filtros, e renderiza a tabela.
 * Reseta para a primeira página ao fazer uma nova busca.
 * @returns {Promise<Object>} O objeto JSON retornado pelo servidor contendo dados e metadados.
 */
export async function verFetch() {
    setTabelaLoading(true);
    try {
        mostrandoAulasFixas = false;
        dadosAulasFixasCached = [];
        atualizarVisualBotaoToggle(false);
        atualizarFiltrosLabel();

        document.getElementById('containerTabela').style.display = 'block';

        // Reseta para a primeira página ao fazer uma nova busca
        setPage(1);

        const rawValues = {
            solicitante: document.getElementById('solicitante').value,
            sala: document.getElementById('sala').value,
            dia: document.getElementById('date').value,
            hora: document.getElementById('hora').value,
            motivo: document.getElementById('motivo').value,
        };

        // Trata os dados antes de filtrar (ex: formata hora 14 para 14:00)
        const inputValues = tratarDados(rawValues);

        // Detecta se há algum filtro preenchido
        const temFiltros = Object.values(rawValues).some(v => v && v.toString().trim() !== '');
        console.log('temFiltros:', temFiltros, 'rawValues:', rawValues);

        // Se houver filtros, guardar para filtragem local
        if (temFiltros) {
            // Limpar exibição de filtros
            const el = document.getElementById('filtrosAtivos');
            if (el) el.textContent = '';
            console.log('Filtros detectados, limpando #filtrosAtivos');

            filtrosFrontend = {};
            if (inputValues.solicitante) filtrosFrontend.solicitante = inputValues.solicitante;
            if (inputValues.sala) filtrosFrontend.sala = parseInt(inputValues.sala);
            if (inputValues.dia) filtrosFrontend.dia = inputValues.dia;
            
            let horaBusca = rawValues.hora.trim();
            const horaNumeros = horaBusca.replace(/\D/g, '');
            if (horaNumeros.length > 0 && horaNumeros.length <= 2) {
                horaBusca = horaNumeros.padStart(2, '0') + ':00';
            }
            if (horaBusca) filtrosFrontend.hora = horaBusca;

            if (rawValues.motivo) filtrosFrontend.motivo = rawValues.motivo.trim();
            console.log('filtrosFrontend:', filtrosFrontend);
        } else {
            filtrosFrontend = {};
        }

        // Congela os filtros da busca atual para paginação consistente
        filtrosBuscaAtual = temFiltros ? {} : {}; // Se tem filtros, não usar no servidor

        // Registra callback de troca de página para recarregar dados
        setOnPageChange(async () => {
            await verFetchPage();
        });

        // Carrega a primeira página de usos + aulas regulares em paralelo
        // Se tem filtros do frontend, não enviar para servidor, trazer TODOS e filtrar localmente
        const filtersParaServidor = temFiltros ? {} : (Object.keys(filtrosFrontend).length === 0 ? {} : filtrosFrontend);
        
        const [resultUsos, respAulas] = await Promise.all([
            getDados(currentPage, itemsPorPagina, filtersParaServidor),
            fetch('/admin/relatorios/aulas').catch(() => ({ ok: false }))
        ]);

        const usosData = resultUsos.data || [];
        let aulasData = [];
        
        if (respAulas.ok) {
            try {
                const aulasOriginais = await respAulas.json();
                aulasData = normalizarListaAulas(aulasOriginais);
            } catch (e) {
                console.error('Erro ao processar aulas:', e);
            }
        }

        // Combina usos e aulas
        let dadosCombinados = [...usosData, ...aulasData];

        // Se há filtros do frontend, aplicar filtragem local
        if (temFiltros) {
            dadosCombinados = filtrarDadosLocalmente(dadosCombinados, filtrosFrontend);
            // Quando há filtros, não exibe a tabela
            limparTabela();
            criaTabela({ data: [], page: resultUsos.page, limit: resultUsos.limit, totalItems: 0, totalPages: 1 });
            setTotalPages(1);
            criarElementospaginacaoTab();
            return { data: [], ...resultUsos };
        }

        if (!dadosCombinados || dadosCombinados.length === 0) {
            console.log("Nenhum registro encontrado");
            const painelSaida = document.getElementById('painelMensagem');
            if (painelSaida) {
                painelSaida.innerText = 'Nenhum registro encontrado';
                setTimeout(() => {
                    painelSaida.innerText = '';
                }, 5000);
            }
        }

        limparTabela();
        criaTabela({ data: dadosCombinados, page: resultUsos.page, limit: resultUsos.limit, totalItems: dadosCombinados.length, totalPages: resultUsos.totalPages });
        setTotalPages(resultUsos.totalPages || 1);
        criarElementospaginacaoTab();

        return { data: dadosCombinados, ...resultUsos };
    } catch (error) {
        console.error("Não deu certo. Erro:", error);
    } finally {
        setTabelaLoading(false);
    }
}

/**
 * Função auxiliar para buscar a página atual (acionada por paginacao.js).
 * Reaplica os filtros atuais e renderiza a tabela mantendo a página selecionada.
 * @returns {Promise<Object>} O objeto JSON retornado pelo servidor.
 */
export async function verFetchPage() {
    setTabelaLoading(true);
    try {
        const resultUsos = await getDados(currentPage, itemsPorPagina, filtrosBuscaAtual);
        let aulasData = [];
        
        try {
            const respAulas = await fetch('/admin/relatorios/aulas');
            if (respAulas.ok) {
                const aulasOriginais = await respAulas.json();
                aulasData = normalizarListaAulas(aulasOriginais);
            }
        } catch (e) {
            console.error('Erro ao buscar aulas:', e);
        }

        let dadosCombinados = [...(resultUsos.data || []), ...aulasData];

        // Se há filtros do frontend, aplicar filtragem local
        if (Object.keys(filtrosFrontend).length > 0) {
            dadosCombinados = filtrarDadosLocalmente(dadosCombinados, filtrosFrontend);
        }

        limparTabela();
        criaTabela({ data: dadosCombinados, ...resultUsos });
        setTotalPages(resultUsos.totalPages || 1);
        // recria os controles de paginação a cada mudança de página
        criarElementospaginacaoTab();
        return { data: dadosCombinados, ...resultUsos };
    } catch (error) {
        console.error("Não deu certo. Erro:", error);
    } finally {
        setTabelaLoading(false);
    }
}

/**
 * Busca e exibe as Aulas Regulares (Usos Fixos)
 */
export async function verAulasFixasFetch() {
    try {
        // Lógica de Toggle: Se já estiver mostrando, volta para a visão padrão
        if (mostrandoAulasFixas) {
            mostrandoAulasFixas = false;
            dadosAulasFixasCached = [];
            return await verFetch();
        }

        setTabelaLoading(true);

        document.getElementById('containerTabela').style.display = 'block';
        const container = document.getElementById('containerTabela');
        container.style.display = 'block';
        container.style.marginTop = '20px'; // Adiciona o espaçamento

        const painelSaida = document.getElementById('painelMensagem') || document.getElementById('painelSaida');

        // Obtém os filtros atuais da tela para buscar também os agendamentos pontuais (Usos)
        const rawValues = {
            solicitante: document.getElementById('solicitante').value,
            sala: document.getElementById('sala').value,
            dia: document.getElementById('date').value,
            hora: document.getElementById('hora').value,
            motivo: document.getElementById('motivo').value,
        };
        const inputValues = tratarDados(rawValues);
        const filters = {};
        if (inputValues.solicitante) filters.solicitante = inputValues.solicitante;
        if (inputValues.sala) filters.sala = parseInt(inputValues.sala);
        if (inputValues.dia) filters.dia = inputValues.dia;

        // Busca Aulas Regulares e Usos (Agendamentos) em paralelo para exibir juntos
        const [respAulas, resultUsos] = await Promise.all([
            fetch('/admin/relatorios/aulas'),
            getDados(1, 100, filters) // Busca os agendamentos que batem com o filtro atual
        ]);
        
        if (!respAulas.ok) throw new Error('Erro ao buscar aulas fixas');
        
        const aulasOriginais = await respAulas.json();
        const usosExistentes = resultUsos.data || [];
        
        // Normaliza as aulas fixas para o formato da tabela (compatível com a estrutura de Usos)
        const aulasNormalizadas = normalizarListaAulas(aulasOriginais);

        // Combina os dois tipos de dados para exibição conjunta
        const dadosCombinados = [...usosExistentes, ...aulasNormalizadas];

        if (dadosCombinados.length === 0) {
            if (painelSaida) painelSaida.innerText = 'Nenhum registro (agendamento ou aula fixa) encontrado';
            limparTabela();
            return;
        }

        // Armazena no cache para paginação client-side
        dadosAulasFixasCached = dadosCombinados;
        mostrandoAulasFixas = true;
        atualizarVisualBotaoToggle(true);

        // Reseta para a primeira página
        setPage(1);

        const totalPags = Math.ceil(dadosCombinados.length / itemsPorPagina);

        // Registra callback de troca de página para recarregar a fatia correta
        setOnPageChange(() => {
            const inicio = (currentPage - 1) * itemsPorPagina;
            const fatia = dadosAulasFixasCached.slice(inicio, inicio + itemsPorPagina);
            limparTabela();
            criaTabela({ data: fatia, totalPages: Math.ceil(dadosAulasFixasCached.length / itemsPorPagina) });
            criarElementospaginacaoTab();
        });

        // Renderiza a primeira página
        const fatiaInicial = dadosCombinados.slice(0, itemsPorPagina);
        limparTabela();
        criaTabela({ data: fatiaInicial, totalPages: totalPags });

        if (painelSaida) painelSaida.innerText = ''; // Limpa mensagens anteriores

        setTotalPages(totalPags);
        criarElementospaginacaoTab();

    } catch (error) {
        console.error("Erro ao carregar aulas fixas:", error);
    } finally {
        setTabelaLoading(false);
    }
}

/**
 * Altera visualmente o botão de aulas fixas para indicar se o filtro está ativo.
 */
function atualizarVisualBotaoToggle(ativo) {
    const btn = document.getElementById('btnMostrarAulasRegulares');
    if (!btn) return;

    if (ativo) {
        btn.style.filter = "brightness(0.9)";
        btn.innerText = "Ocultar Aulas Fixas";
    } else {
        btn.style.filter = "";
        btn.innerText = "Aulas Fixas";
    }
}

document.getElementById('getUsosBtn').addEventListener('click', verFetch);
document.getElementById('btnMostrarAulasRegulares')?.addEventListener('click', verAulasFixasFetch);
/*
================================================================================
DOCUMENTAÇÃO DO ARQUIVO: ver.js
================================================================================

1. FINALIDADE
   Gerencia a lógica de visualização, filtragem e atualização da tabela de
   registros de uso na interface do usuário.

2. FUNÇÕES
   - limparTabela: Remove todo o conteúdo HTML do container da tabela para
     evitar duplicação visual antes de uma nova renderização.
   - verFetch: Função central que orquestra a busca de dados (getDados),
     aplica os filtros definidos pelo usuário (inputs), reinicia a paginação
     e solicita a renderização da tabela.

3. OBSERVAÇÕES
   - Atua como controlador entre a obtenção de dados (tabela.js) e a
     paginação (paginacao.js).
   - Realiza filtragem local (no frontend) dos dados recebidos.
   - É acionada automaticamente ao clicar no botão de pesquisa ('getUsosBtn')
     ou ao realizar operações de CRUD em outros módulos.
================================================================================
*/