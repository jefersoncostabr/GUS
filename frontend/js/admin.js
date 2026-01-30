// admin.js - shared helpers for admin UI


/**
 * Base URL da API utilizada pelas funcionalidades administrativas.
 * Seleciona o host remoto quando estiver em onrender, caso contrário usa localhost:3000.
 * @constant {string}
 */
export const baseUrl = window.location.hostname.includes("onrender.com")
  ? "https://gus-q7nn.onrender.com"
  : `http://${window.location.hostname}:3000`;

/**
 * Exibe uma mensagem curta no painel administrativo.
 * @param {string} msg - Texto da mensagem.
 * @param {'info'|'success'|'error'} [type='info'] - Tipo para aplicar classes visuais.
 * @param {number} [timeout=5000] - Tempo em ms até remover a mensagem (0 mantém fixa).
 */
export function showMessage(msg, type = 'info', timeout = 5000) {
  const el = document.getElementById('painelSaida');
  if (!el) return;
  el.textContent = msg;
  el.className = type === 'error' ? 'mensagem erro' : type === 'success' ? 'mensagem sucesso' : 'mensagem';
  if (timeout > 0) setTimeout(() => { el.textContent = ''; el.className = ''; }, timeout);
}

/**
 * Realiza fetch e tenta parsear JSON; quando não é JSON retorna texto.
 * @param {string} url - Endpoint a ser chamado.
 * @param {RequestInit} [options] - Opções para fetch.
 * @returns {Promise<any>} - Resultado parseado (JSON) ou texto.
 */
export async function fetchJson(url, options = {}) {
  const opts = Object.assign({ headers: { 'Content-Type': 'application/json' } }, options);
  if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
  const res = await fetch(url, opts);
  const text = await res.text(); // Lê o corpo da resposta como texto.

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text; // Se não for JSON, o 'data' é o próprio texto (ex: HTML de erro)
  }

  if (!res.ok) {
    // Se a resposta não for 2xx, lança um erro.
    // A mensagem de erro será o JSON de erro do backend (se houver) ou uma mensagem de status.
    const errorMessage = (data && data.error) ? data.error : `Erro HTTP: ${res.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

/**
 * Define a visibilidade da área administrativa com base em um valor externo.
 * IMPORTANTE: Esta função não consulta o servidor; a checagem de sessão deve
 * ser feita em outra camada e então chamar esta função com o resultado.
 * @param {boolean} isAdmin
 */
export function setAdminVisibility(isAdmin) {
  const adminArea = document.getElementById('adminArea');
  if (!adminArea) return;
  adminArea.style.display = isAdmin ? '' : 'none';

  // Limpa qualquer timeout de redirecionamento previamente agendado
  if (window.__adminRedirectTimeout) {
    clearTimeout(window.__adminRedirectTimeout);
    window.__adminRedirectTimeout = null;
  }

  if (!isAdmin) {
    // Mostra mensagem e redireciona para a página de login após 8s
    const redirectMs = 8000;
    showMessage('Acesso restrito: apenas administradores.', 'error', redirectMs);
    window.__adminRedirectTimeout = setTimeout(() => {
      // Evita redirecionar caso já estejamos na página de login
      if (window.location.pathname.includes('login.html')) return;
      window.location.href = './login.html';
    }, redirectMs);
  }
}

/**
 * Popula um <select> de estúdios com uma lista de dados fornecida por outra camada.
 * NÃO realiza chamadas de rede — o responsável pela camada de dados deve chamar isto.
 * @param {HTMLSelectElement} selectEl - Elemento select a ser preenchido.
 * @param {Array<{_id:string,nome:string}>} estudios - Array de estúdios já carregados
 */
export function populateEstudiosOptions(selectEl, estudios = []) {
  if (!selectEl) return;
  selectEl.innerHTML = '<option value="">-- selecione --</option>';
  estudios.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e._id || e.id || '';
    opt.textContent = e.nome || e.name || '--';
    selectEl.appendChild(opt);
  });
}
