import { criaTabela, getDados } from "./tabela.js";
import { currentPage, itemsPorPagina, setOnPageChange, setTotalPages, setPage, criarElementospaginacaoTab } from "./paginacao.js";
import { tratarDados } from "./tratamentoDeDados.js";
import { normalizarListaAulas } from "./normalizador.js";

let mostrandoAulasFixas = false;
let dadosAulasFixasCached = []; // cache para paginação client-side das aulas fixas
let filtrosBuscaAtual = {}; // mantém os filtros aplicados na última busca (botão Ver)

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

        // Constrói filtros para enviar ao servidor (converte números quando aplicável)
        const filters = {};
        if (inputValues.solicitante) filters.solicitante = inputValues.solicitante;
        if (inputValues.sala) filters.sala = parseInt(inputValues.sala);
        if (inputValues.dia) filters.dia = inputValues.dia;
        
        // Formata hora para busca: se 1 ou 2 dígitos (ex: "1", "14"), converte para "01:00", "14:00"
        let horaBusca = rawValues.hora.trim();
        const horaNumeros = horaBusca.replace(/\D/g, '');
        if (horaNumeros.length > 0 && horaNumeros.length <= 2) {
            horaBusca = horaNumeros.padStart(2, '0') + ':00';
        }
        if (horaBusca) filters.hora = horaBusca;

        if (rawValues.motivo) filters.motivo = rawValues.motivo.trim();

        // Congela os filtros da busca atual para paginação consistente
        filtrosBuscaAtual = { ...filters };

        // Registra callback de troca de página para recarregar dados
        setOnPageChange(async () => {
            await verFetchPage();
        });

        // Carrega a primeira página
        const result = await getDados(currentPage, itemsPorPagina, filters);

        if (!result.data || result.data.length === 0) {
            console.log("Uso não encontrado");
            const painelSaida = document.getElementById('painelMensagem');
            if (painelSaida) {
                painelSaida.innerText = 'Uso não encontrado';
                setTimeout(() => {
                    painelSaida.innerText = '';
                }, 5000);
            }
        }

        limparTabela();
        criaTabela(result);
        setTotalPages(result.totalPages || 1);
        criarElementospaginacaoTab();

        return result;
    } catch (error) {
        console.error("Não deu certo. Erro:", error);
    }
}

/**
 * Função auxiliar para buscar a página atual (acionada por paginacao.js).
 * Reaplica os filtros atuais e renderiza a tabela mantendo a página selecionada.
 * @returns {Promise<Object>} O objeto JSON retornado pelo servidor.
 */
export async function verFetchPage() {
    try {
        const result = await getDados(currentPage, itemsPorPagina, filtrosBuscaAtual);
        limparTabela();
        criaTabela(result);
        setTotalPages(result.totalPages || 1);
        // recria os controles de paginação a cada mudança de página
        criarElementospaginacaoTab();
        return result;
    } catch (error) {
        console.error("Não deu certo. Erro:", error);
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
            return verFetch();
        }

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