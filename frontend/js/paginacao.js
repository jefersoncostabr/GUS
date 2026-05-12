export let currentPage = 1;
export const itemsPorPagina = 6; // default page size
export let totalPages = 1;

let onPageChange = null; // callback a ser registrado por ver.js

/**
 * Define a função de callback a ser executada quando houver mudança de página.
 * @param {Function} cb - Função que recarrega os dados (ex: verFetchPage).
 */
export function setOnPageChange(cb) {
    onPageChange = cb;
}

/**
 * Atualiza o número total de páginas disponíveis.
 * @param {number} tp - Total de páginas.
 */
export function setTotalPages(tp) {
    totalPages = tp;
    updatePaginaInfo();
}

/**
 * Define manualmente a página atual.
 * @param {number} p - Número da página.
 */
export function setPage(p) {
    currentPage = p;
    updatePaginaInfo();
}

/**
 * Atualiza os textos informativos e o estado (habilitado/desabilitado) dos botões de paginação.
 */
function updatePaginaInfo() {
    const infoEl = document.getElementById('paginaInfo');
    const btnPrev = document.getElementById('btnVoltarTab');
    const btnNext = document.getElementById('btnAvancarTab');
    if (infoEl) {
        // Se a tela for menor que 600px, usa formato curto "1/10", senão "Página 1 / 10"
        const isMobile = window.innerWidth < 600;
        infoEl.textContent = isMobile ? `${currentPage}/${totalPages}` : `Página ${currentPage} / ${totalPages}`;
    }
    if (btnPrev) btnPrev.disabled = false;
    if (btnNext) btnNext.disabled = false;
}

/**
 * Cria e insere os elementos DOM dos botões de navegação (Voltar/Avançar) e info da página.
 */
export function criarElementospaginacaoTab() {
    // Remove container existente, se houver
    const existing = document.getElementById('containerTabBotoes');
    if (existing) existing.remove();

    var containerTabBotoes = document.createElement('div');
    containerTabBotoes.className = 'containerTabBotoes';
    // containerTabBotoes.style.margin = '10px 0 0 0';
    containerTabBotoes.style.margin = '10px';
    containerTabBotoes.id = 'containerTabBotoes';

    // Verifica largura da tela para decidir o texto do botão
    const isMobile = window.innerWidth < 600;

    var btnVoltarTab = document.createElement('button');
    btnVoltarTab.className = 'btnVoltarTab';
    btnVoltarTab.id = 'btnVoltarTab';
    btnVoltarTab.textContent = isMobile ? '◄' : 'Voltar'; // Seta ou Texto
    btnVoltarTab.style.marginRight = '10px';
    btnVoltarTab.addEventListener('click', voltarPaginacao);

    var paginaInfo = document.createElement('span');
    paginaInfo.id = 'paginaInfo';
    paginaInfo.style.marginRight = '10px';

    var btnAvancarTab = document.createElement('button');
    btnAvancarTab.className = 'btnAvancarTab';
    btnAvancarTab.id = 'btnAvancarTab';
    btnAvancarTab.textContent = isMobile ? '►' : 'Avançar'; // Seta ou Texto
    btnAvancarTab.addEventListener('click', avancarPaginacao);

    containerTabBotoes.appendChild(btnVoltarTab);
    containerTabBotoes.appendChild(paginaInfo);
    containerTabBotoes.appendChild(btnAvancarTab);

    var containerPaginacao = document.getElementById('containerPaginacao') || document.getElementById('containerTabela');
    if (containerPaginacao) {
        containerPaginacao.appendChild(containerTabBotoes);
    }

    updatePaginaInfo();

    // Adiciona ouvinte para ajustar textos caso o usuário gire a tela ou redimensione
    window.addEventListener('resize', () => {
        // Recria os elementos para ajustar texto (simples e eficaz)
        criarElementospaginacaoTab();
    }, { once: true }); // once: true evita loop infinito de listeners, mas o ideal seria debouncing. Para simplificar, recarrega ao mudar.
}

/**
 * Retrocede uma página (se possível) e aciona o callback de mudança.
 */
export async function voltarPaginacao() {
    currentPage = currentPage > 1 ? currentPage - 1 : totalPages;
    updatePaginaInfo();
    if (onPageChange) onPageChange();
}

/**
 * Avança uma página e aciona o callback de mudança.
 * Ao ultrapassar a última página, volta para a primeira.
 */
export async function avancarPaginacao() {
    currentPage = currentPage < totalPages ? currentPage + 1 : 1;
    updatePaginaInfo();
    if (onPageChange) onPageChange();
}

/*
================================================================================
DOCUMENTAÇÃO DO ARQUIVO: paginacao.js
================================================================================

1. FINALIDADE
   Gerencia o estado da paginação (página atual, total de páginas) e a criação/
   atualização dos controles visuais (botões Voltar/Avançar) na interface.

2. FUNÇÕES PRINCIPAIS
   - setOnPageChange: Registra a função que busca os dados quando a página muda.
   - criarElementospaginacaoTab: Gera o HTML dos botões e insere no DOM.
   - voltarPaginacao / avancarPaginacao: Lógica de navegação e disparo de eventos.
   - updatePaginaInfo: Atualiza visualmente o contador de páginas e estado dos botões.

3. OBSERVAÇÕES
   - Este módulo é puramente frontend e mantém o estado local da navegação.
   - É utilizado principalmente por 'ver.js' (que fornece o callback de busca)
     e 'tabela.js' (que exibe os dados resultantes).
================================================================================
*/
