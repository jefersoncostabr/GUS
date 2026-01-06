import { criaTabela, getDados } from "./tabela.js";
import { currentPage, itemsPorPagina, setOnPageChange, setTotalPages, setPage, criarElementospaginacaoTab } from "./paginacao.js";
import { tratarDados } from "../tratamentodedados.js";

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
    document.getElementById('containerTabela').style.display = 'block';

    // Reseta para a primeira página ao fazer uma nova busca
    setPage(1);

    const rawValues = {
        solicitante: document.getElementById('solicitante').value,
        sala: document.getElementById('sala').value,
        dia: document.getElementById('dia').value,
        hora: document.getElementById('hora').value,
        motivo: document.getElementById('motivo').value,
    };

    // Trata os dados antes de filtrar (ex: formata hora 14 para 14:00)
    const inputValues = tratarDados(rawValues);

    // Constrói filtros para enviar ao servidor (converte números quando aplicável)
    const filters = {};
    if (inputValues.solicitante) filters.solicitante = inputValues.solicitante;
    if (inputValues.sala) filters.sala = parseInt(inputValues.sala);
    if (inputValues.dia) filters.dia = inputValues.dia; // Envia string formatada (ex: 05/01)
    if (inputValues.hora) filters.hora = inputValues.hora; // Envia string formatada (ex: 14:00)
    if (inputValues.motivo) filters.motivo = inputValues.motivo;

    // Registra callback de troca de página para recarregar dados
    setOnPageChange(async () => {
        await verFetchPage();
    });

    // Carrega a primeira página
    const result = await getDados(currentPage, itemsPorPagina, filters);

    limparTabela();
    criaTabela(result);
    setTotalPages(result.totalPages || 1);
    criarElementospaginacaoTab();

    return result;
}

/**
 * Função auxiliar para buscar a página atual (acionada por paginacao.js).
 * Reaplica os filtros atuais e renderiza a tabela mantendo a página selecionada.
 * @returns {Promise<Object>} O objeto JSON retornado pelo servidor.
 */
export async function verFetchPage() {
    const rawValues = {
        solicitante: document.getElementById('solicitante').value,
        sala: document.getElementById('sala').value,
        dia: document.getElementById('dia').value,
        hora: document.getElementById('hora').value,
        motivo: document.getElementById('motivo').value,
    };

    const inputValues = tratarDados(rawValues);

    const filters = {};
    if (inputValues.solicitante) filters.solicitante = inputValues.solicitante;
    if (inputValues.sala) filters.sala = parseInt(inputValues.sala);
    if (inputValues.dia) filters.dia = inputValues.dia;
    if (inputValues.hora) filters.hora = inputValues.hora;
    if (inputValues.motivo) filters.motivo = inputValues.motivo;

    const result = await getDados(currentPage, itemsPorPagina, filters);
    limparTabela();
    criaTabela(result);
    setTotalPages(result.totalPages || 1);
    // recria os controles de paginação a cada mudança de página
    criarElementospaginacaoTab();
    return result;
}
document.getElementById('getUsosBtn').addEventListener('click', verFetch);

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