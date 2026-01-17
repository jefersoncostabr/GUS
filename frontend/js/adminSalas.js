import { showMessage } from './admin.js';

/**
 * adminSalas.js — UI-only module
 * - Use `setSalasData(array)` para injetar dados
 * - Escute eventos `admin:sala:save` e `admin:sala:delete` para executar as chamadas de rede
 */

/**
 * Renderiza a lista de salas no elemento #tableSalas.
 * Faz GET /admin/salas e monta a tabela com botões de editar/excluir.
 * @returns {Promise<void>}
 */
/**
 * Renderiza a tabela de salas a partir de dados fornecidos.
 * @param {Array<Object>} data
 */
export function renderSalasUI(data = []) {
  const table = document.getElementById('tableSalas');
  if (!table) return;
  if (!Array.isArray(data) || !data.length) { table.innerHTML = 'Nenhuma sala encontrada.'; return; }
  const html = [`<table class="painelTabela"><thead><tr><th>Estúdio</th><th>Número</th><th>Nome</th><th>Ativo</th><th>Ações</th></tr></thead><tbody>`];
  data.forEach(s => {
    html.push(`<tr data-id="${s._id}"><td>${s.estudioNome || s.estudioId || ''}</td><td>${s.numero || ''}</td><td>${s.nome || s.name || ''}</td><td>${s.ativo ? 'Sim' : 'Não'}</td><td><button class="editSala">Editar</button> <button class="delSala">Excluir</button></td></tr>`);
  });
  html.push('</tbody></table>');
  table.innerHTML = html.join('\n');

  table.querySelectorAll('.editSala').forEach(btn => btn.addEventListener('click', ev => {
    const tr = ev.target.closest('tr');
    const id = tr.dataset.id;
    const item = data.find(x => (x._id||x.id) == id);
    if (!item) return;
    document.getElementById('salaId').value = id;
    document.getElementById('salaEstudio').value = item.estudioId || '';
    document.getElementById('salaNumero').value = item.numero || '';
    document.getElementById('salaNome').value = item.nome || item.name || '';
    document.getElementById('salaAtivo').checked = !!item.ativo;
    showMessage('Pronto para editar a sala.', 'info', 3000);
  }));

  table.querySelectorAll('.delSala').forEach(btn => btn.addEventListener('click', ev => {
    const tr = ev.target.closest('tr');
    const id = tr.dataset.id;
    if (!confirm('Excluir sala?')) return;
    // Dispatch event for data layer
    document.dispatchEvent(new CustomEvent('admin:sala:delete', { detail: { id } }));
    showMessage('Solicitada exclusão de sala.', 'info', 3000);
  }));
}

/**
 * Salva (cria ou atualiza) uma sala com os dados do formulário.
 * Faz POST em /admin/salas para criar ou PUT em /admin/salas/:id para atualizar.
 * @returns {Promise<void>}
 */
function salvarSala() {
  const id = document.getElementById('salaId').value;
  const estudioId = document.getElementById('salaEstudio').value;
  const numero = parseInt(document.getElementById('salaNumero').value);
  const nome = document.getElementById('salaNome').value.trim();
  const ativo = document.getElementById('salaAtivo').checked;
  if (!estudioId || !numero) { showMessage('Estúdio e número são obrigatórios.', 'error'); return; }

  const payload = { id: id || null, estudioId, numero, nome, ativo };
  document.dispatchEvent(new CustomEvent('admin:sala:save', { detail: payload }));
  showMessage('Solicitado salvar sala.', 'info', 3000);
  clearForm();
}

/**
 * Limpa o formulário de sala.
 */
function clearForm() {
  const elId = document.getElementById('salaId'); if (elId) elId.value = '';
  const elEst = document.getElementById('salaEstudio'); if (elEst) elEst.value = '';
  const elNum = document.getElementById('salaNumero'); if (elNum) elNum.value = '';
  const elNome = document.getElementById('salaNome'); if (elNome) elNome.value = '';
  const elAtivo = document.getElementById('salaAtivo'); if (elAtivo) elAtivo.checked = true;
}

/**
 * Inicializa a página de salas: carrega opções de estúdios e vincula handlers.
 * Executa somente para administradores.
 * @returns {Promise<void>}
 */
/**
 * Nota: este módulo é UI-only. Para usar:
 * - Chame `setSalasData(array)` com os dados de salas carregados pela camada de dados.
 * - Chame `populateEstudiosOptions(selectEl, estudios)` (fornecido por admin.js) para preencher o select.
 * - Escute eventos `admin:sala:save` e `admin:sala:delete` para realizar as operações de CRUD.
 */

// Bind visual de botões (sem lógica de rede)
const salvarSalaBtn = document.getElementById('salvarSalaBtn');
if (salvarSalaBtn) salvarSalaBtn.addEventListener('click', salvarSala);
const cancelarSalaBtn = document.getElementById('cancelarSalaBtn');
if (cancelarSalaBtn) cancelarSalaBtn.addEventListener('click', clearForm);

// Add Sala button (create empty row to be filled)
const addSalaBtn = document.getElementById('addSalaBtn');
if (addSalaBtn) addSalaBtn.addEventListener('click', addSala);

/**
 * Cria dinamicamente um item de sala para preenchimento múltiplo (+Sala)
 * @returns {HTMLDivElement}
 */
function createSalaItem() {
  const wrapper = document.createElement('div');
  wrapper.className = 'filialItem';
  wrapper.style.marginBottom = '6px';

  const selectEst = document.createElement('select');
  selectEst.className = 'salaEstudioSelect';
  selectEst.style.minWidth = '200px';

  const inputNumero = document.createElement('input');
  inputNumero.type = 'number';
  inputNumero.className = 'salaNumeroInput';
  inputNumero.placeholder = 'Número';
  inputNumero.style.width = '110px';

  const inputNome = document.createElement('input');
  inputNome.type = 'text';
  inputNome.className = 'salaNomeInput';
  inputNome.placeholder = 'Nome da sala';
  inputNome.style.width = '200px';

  // action buttons: Alterar / Apagar
  const actions = document.createElement('div');
  actions.className = 'actionButtons';

  const alterBtn = document.createElement('button');
  alterBtn.type = 'button';
  alterBtn.className = 'alterSala btnSmall';
  alterBtn.textContent = 'Alterar';
  alterBtn.addEventListener('click', () => {
    // copy values into main form for editing
    document.getElementById('salaId').value = wrapper.dataset.id || '';
    const selMain = document.getElementById('salaEstudio');
    if (selMain) selMain.value = selectEst.value || '';
    const elNum = document.getElementById('salaNumero'); if (elNum) elNum.value = inputNumero.value || '';
    const elNome = document.getElementById('salaNome'); if (elNome) elNome.value = inputNome.value || '';
    document.getElementById('salaAtivo').checked = true;
    elNome && elNome.focus();
  });

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'delSala btnSmall';
  delBtn.textContent = 'Apagar';
  delBtn.addEventListener('click', () => {
    // if this row corresponds to an existing sala (has data-id) dispatch delete, otherwise remove
    if (wrapper.dataset.id) {
      document.dispatchEvent(new CustomEvent('admin:sala:delete', { detail: { id: wrapper.dataset.id } }));
    }
    wrapper.remove();
  });

  actions.appendChild(alterBtn);
  actions.appendChild(delBtn);

  wrapper.appendChild(selectEst);
  wrapper.appendChild(inputNumero);
  wrapper.appendChild(inputNome);
  wrapper.appendChild(actions);

  // populate select with cached estudios if available
  if (window.__estudiosCache && Array.isArray(window.__estudiosCache)) {
    const opts = ['<option value="">-- selecione --</option>'].concat(window.__estudiosCache.map(e => `<option value="${e._id || e.id || ''}">${e.nome || e.name || '--'}</option>`));
    selectEst.innerHTML = opts.join('\n');
  }

  return wrapper;
}

/**
 * Adiciona um item de sala vazio ao container
 */
function addSala() {
  const container = document.getElementById('salasListContainer');
  if (!container) return;
  const item = createSalaItem();
  container.appendChild(item);
  // if estudios options are provided via setEstudiosOptions, populate the new select
  if (window.__estudiosCache && Array.isArray(window.__estudiosCache)) {
    const sel = item.querySelector('.salaEstudioSelect');
    if (sel) sel.innerHTML = ['<option value="">-- selecione --</option>'].concat(window.__estudiosCache.map(e => `<option value="${e._id || e.id || ''}">${e.nome || e.name || '--'}</option>`)).join('\n');
  }
}

/**
 * Setter para injetar dados de salas no UI.
 * @param {Array<Object>} data
 */
export function setSalasData(data = []) { renderSalasUI(data); }

