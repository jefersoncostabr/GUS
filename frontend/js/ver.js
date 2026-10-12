import { criaTabela, getDados } from "./tabela.js";
import { currentPage, itemsPorPagina, setOnPageChange, setTotalPages, setPage, criarElementospaginacaoTab } from "./paginacao.js";
import { tratarDados } from "./tratamentoDeDados.js";
import { normalizarListaAulas } from "./normalizador.js";

let mostrandoAulasFixas = false;
let dadosAulasFixasCached = []; // cache para paginação client-side das aulas fixas
let dadosTabelaAtual = [];
let filtrosBuscaAtual = {}; // mantém os filtros aplicados na última busca (botão Ver)
let filtrosFrontend = {}; // filtros a serem aplicados localmente (client-side)

function setTabelaLoading(carregando) {
    const indicador = document.getElementById('tabelaLoadingIndicator');
    if (!indicador) return;

    indicador.classList.toggle('is-visible', carregando);
    indicador.setAttribute('aria-hidden', carregando ? 'false' : 'true');
}

function exibirMensagemBusca(mensagem) {
    const painelSaida = document.getElementById('painelSaida') || document.getElementById('painelMensagem');
    if (!painelSaida) return;

    painelSaida.textContent = mensagem;
    window.setTimeout(() => {
        if (painelSaida.textContent === mensagem) painelSaida.textContent = '';
    }, 5000);
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
 * @param {Object} filtros - Objeto com filtros { solicitante, estudio, sala, dia, hora, motivo }
 * @returns {Array} Array filtrado
 */
function filtrarDadosLocalmente(dados, filtros) {
    if (!dados || dados.length === 0 || Object.keys(filtros).length === 0) {
        return dados;
    }

    return dados.filter(item => {
        // Filtro por solicitante
        const nomeSolicitante = typeof item.solicitante === 'object'
            ? item.solicitante?.solicitante
            : item.solicitante;
        if (filtros.solicitante && nomeSolicitante) {
            if (!nomeSolicitante.toLowerCase().includes(filtros.solicitante.toLowerCase())) {
                return false;
            }
        }

        if (filtros.estudio) {
            const estudio = item.estudioId || item.estudio;
            const estudioId = estudio && typeof estudio === 'object'
                ? String(estudio._id || estudio.id || '')
                : String(estudio || '');
            if (estudioId !== String(filtros.estudio)) return false;
        }

        // O filtro pode ser apenas o número ou a chave composta estúdio|número.
        if (filtros.sala !== undefined && filtros.sala !== '') {
            const salaFiltro = String(filtros.sala);
            const [estudioFiltro, numeroFiltro] = salaFiltro.split(/[|:]/);
            const salaItem = String(item.sala ?? '');
            const [estudioDaSala, numeroDaSala] = salaItem.split(/[|:]/);
            const estudioItem = item.estudioId || item.estudio;
            const estudioIdItem = estudioItem && typeof estudioItem === 'object'
                ? String(estudioItem._id || estudioItem.id || '')
                : String(estudioItem || estudioDaSala || '');
            const numeroItem = numeroDaSala || estudioDaSala;

            if (numeroFiltro !== undefined) {
                if (numeroItem !== numeroFiltro || estudioIdItem !== estudioFiltro) return false;
            } else if ((numeroDaSala || salaItem) !== salaFiltro) {
                return false;
            }
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

function ocultarTabelaBusca() {
    const containerTabela = document.getElementById('containerTabela');
    if (containerTabela) containerTabela.style.display = 'none';

    limparTabela();
    const containerPaginacao = document.getElementById('containerPaginacao');
    if (containerPaginacao) containerPaginacao.innerHTML = '';
}

async function buscarTodosUsos(filtros = {}) {
    const primeiraPagina = await getDados(1, 100, filtros);
    if (primeiraPagina.error || primeiraPagina.accessDenied) return primeiraPagina;

    const usos = [...(primeiraPagina.data || [])];
    for (let pagina = 2; pagina <= (primeiraPagina.totalPages || 1); pagina += 1) {
        const resultado = await getDados(pagina, 100, filtros);
        if (resultado.error || resultado.accessDenied) return resultado;
        usos.push(...(resultado.data || []));
    }

    return { ...primeiraPagina, data: usos, totalItems: usos.length };
}

function renderPaginaTabela(dados) {
    const totalPaginas = Math.max(1, Math.ceil(dados.length / itemsPorPagina));
    setTotalPages(totalPaginas);
    if (currentPage > totalPaginas) setPage(totalPaginas);

    const inicio = (currentPage - 1) * itemsPorPagina;
    const fatia = dados.slice(inicio, inicio + itemsPorPagina);
    criaTabela({
        data: fatia,
        page: currentPage,
        limit: itemsPorPagina,
        totalItems: dados.length,
        totalPages: totalPaginas
    });
    criarElementospaginacaoTab();
}


/**
 * Busca os dados no servidor com paginação e filtros, e renderiza a tabela.
 * Reseta para a primeira página ao fazer uma nova busca.
 * @returns {Promise<Object>} O objeto JSON retornado pelo servidor contendo dados e metadados.
 */
export async function verFetch() {
    const campoData = document.getElementById('date');
    const existeOutroFiltro = ['solicitante', 'estudio', 'sala', 'hora', 'motivo']
        .some((id) => String(document.getElementById(id)?.value || '').trim() !== '');
    if (campoData?.validity?.badInput && !existeOutroFiltro) {
        if (!navigator.onLine) {
            exibirMensagemBusca('Sem conexão com a internet. Verifique sua conexão e tente novamente.');
            return;
        }

        try {
            const respostaSessao = await fetch('/usuario-logado', { credentials: 'include' });
            if (respostaSessao.status === 401) {
                exibirMensagemBusca('É preciso logar para ver.');
                return;
            }
            if (!respostaSessao.ok) {
                exibirMensagemBusca('Não foi possível verificar a sessão.');
                return;
            }
        } catch (error) {
            console.error('Erro ao verificar sessão antes da busca:', error);
            exibirMensagemBusca('Não foi possível verificar a sessão.');
            return;
        }

        exibirMensagemBusca('Complete a data');
        return;
    }

    setTabelaLoading(true);
    try {
        const painelSaida = document.getElementById('painelSaida') || document.getElementById('painelMensagem');
        if (painelSaida) painelSaida.textContent = '';

        if (!navigator.onLine) {
            ocultarTabelaBusca();
            exibirMensagemBusca('Sem conexão com a internet. Verifique sua conexão e tente novamente.');
            return;
        }

        mostrandoAulasFixas = false;
        dadosAulasFixasCached = [];
        atualizarVisualBotaoToggle(false);
        atualizarFiltrosLabel();

        document.getElementById('containerTabela').style.display = 'block';

        // Reseta para a primeira página ao fazer uma nova busca
        setPage(1);

        const rawValues = {
            solicitante: document.getElementById('solicitante').value,
            estudio: document.getElementById('estudio')?.value || '',
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
            if (rawValues.estudio) filtrosFrontend.estudio = rawValues.estudio;
            if (inputValues.sala) filtrosFrontend.sala = inputValues.sala;
            if (inputValues.dia) filtrosFrontend.dia = inputValues.dia;
            
            if (inputValues.hora) filtrosFrontend.hora = inputValues.hora;

            if (inputValues.motivo) filtrosFrontend.motivo = inputValues.motivo;
            console.log('filtrosFrontend:', filtrosFrontend);
        } else {
            filtrosFrontend = {};
        }

        // Mantém os filtros na busca de cada página.
        filtrosBuscaAtual = { ...filtrosFrontend };

        // Registra callback de troca de página para recarregar dados
        setOnPageChange(async () => {
            await verFetchPage();
        });

        const [resultUsos, respAulas] = await Promise.all([
            buscarTodosUsos(filtrosBuscaAtual),
            fetch('/admin/relatorios/aulas').catch(() => ({ ok: false }))
        ]);

        if (resultUsos.error || resultUsos.accessDenied) {
            ocultarTabelaBusca();
            if (resultUsos.error) exibirMensagemBusca('É preciso logar para ver.');
            return resultUsos;
        }

        const usosData = resultUsos.data || [];
        let aulasData = [];

        if (respAulas.ok) {
            try {
                const aulasOriginais = await respAulas.json();
                aulasData = normalizarListaAulas(aulasOriginais);
            } catch (e) {
                console.error('Erro ao processar aulas:', e);
                exibirMensagemBusca('Não foi possível processar as aulas fixas.');
            }
        } else {
            exibirMensagemBusca('Não foi possível carregar as aulas fixas.');
        }

        // As aulas fixas não vêm do endpoint paginado de usos, então são filtradas localmente.
        const aulasFiltradas = temFiltros
            ? filtrarDadosLocalmente(aulasData, filtrosFrontend)
            : aulasData;
        const dadosCombinados = [...usosData, ...aulasFiltradas];

        if (!dadosCombinados || dadosCombinados.length === 0) {
            console.log("Nenhum registro encontrado");
            exibirMensagemBusca('Nenhum registro encontrado');
        }

        dadosTabelaAtual = dadosCombinados;
        setOnPageChange(verFetchPage);
        renderPaginaTabela(dadosTabelaAtual);

        return { ...resultUsos, data: dadosCombinados };
    } catch (error) {
        console.error("Não deu certo. Erro:", error);
    } finally {
        setTabelaLoading(false);
    }
}

/**
 * Renderiza a página atual do conjunto de dados já carregado.
 * @returns {Promise<Object>} Dados e metadados da página exibida.
 */
export async function verFetchPage() {
    setTabelaLoading(true);
    try {
        renderPaginaTabela(dadosTabelaAtual);
        const totalPages = Math.max(1, Math.ceil(dadosTabelaAtual.length / itemsPorPagina));
        return {
            data: dadosTabelaAtual.slice((currentPage - 1) * itemsPorPagina, currentPage * itemsPorPagina),
            page: currentPage,
            limit: itemsPorPagina,
            totalItems: dadosTabelaAtual.length,
            totalPages
        };
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
            buscarTodosUsos(filters)
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