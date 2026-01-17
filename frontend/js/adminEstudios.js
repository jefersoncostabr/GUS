import { showMessage } from './admin.js'

/**
 * Renderiza a tabela de estúdios a partir de dados fornecidos.
 * @param {Array<Object>} data - Array de estúdios
 */
export function renderEstudiosUI(data = []) {
  const table = document.getElementById('tableEstudios')
  if (!table) return
  if (!Array.isArray(data) || !data.length) { table.innerHTML = 'Nenhum estúdio encontrado.'; return }

  const html = [`<table class="painelTabela">
    <thead><tr><th>Nome</th><th>Filiais (Salas)</th><th>Ativo</th><th>Ações</th></tr></thead>
    <tbody>`]
  data.forEach(e => {
    // render filiais list (unidade — endereco) with salas
    let filiaisHtml = ''
    if (Array.isArray(e.filiais) && e.filiais.length) {
      filiaisHtml = e.filiais.map(f => `${f.local || f.unidade || ''}${(f.endereco ? ' — ' + f.endereco : '')} (${(f.salas||0)})`).join('<br>')
    } else if (e.localizacao) {
      filiaisHtml = e.localizacao
    }
    html.push(`<tr data-id="${e._id}"><td>${e.nome || ''}</td><td>${filiaisHtml}</td><td>${e.ativo ? 'Sim' : 'Não'}</td><td><button class="editEstudio">Editar</button> <button class="delEstudio">Excluir</button></td></tr>`)
  })
  html.push('</tbody></table>')
  table.innerHTML = html.join('\n')

  table.querySelectorAll('.editEstudio').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      const tr = ev.target.closest('tr')
      const id = tr.dataset.id
      const item = data.find(x => (x._id||x.id) == id)
      if (!item) return
      document.getElementById('estudioId').value = id
      document.getElementById('estudioNome').value = item.nome || ''
      // Populate filiais (localizações) into inputs
      const container = document.getElementById('estudioFiliaisContainer')
      if (container) {
        container.innerHTML = ''
        let locs = []
        if (Array.isArray(item.filiais) && item.filiais.length) {
          locs = item.filiais.map(f => ({ nome: f.local || f.unidade || '', endereco: f.endereco || '', salas: f.salas || 0 }))
        } else {
          // legacy: parse localizacao string into nome only
          locs = (item.localizacao || '').split(';').map(s => ({ nome: s.trim(), endereco: '', salas: 0 })).filter(x => x.nome)
        }
        if (locs.length) {
          locs.forEach(p => container.appendChild(createFilialItem(p.nome || '', p.endereco || '', p.salas || '')))
        } else {
          container.appendChild(createFilialItem('', '', ''))
        }
      }
      const salasField = document.getElementById('estudioSalas')
      if (salasField) salasField.value = item.salas || ''
      const ativoField = document.getElementById('estudioAtivo')
      if (ativoField) ativoField.checked = !!item.ativo
      showMessage('Pronto para editar o estúdio.', 'info', 3000)
    })
  })

  table.querySelectorAll('.delEstudio').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      const tr = ev.target.closest('tr')
      const id = tr.dataset.id
      if (!confirm('Excluir estúdio?')) return
      // dispatch event to be handled by data layer
      document.dispatchEvent(new CustomEvent('admin:estudio:delete', { detail: { id } }))
      showMessage('Solicitada exclusão de estúdio.', 'info', 3000)
    })
  })
}

/**
 * Setter para injetar dados de estúdios no UI.
 * @param {Array<Object>} data
 */
export function setEstudiosData(data = []) { renderEstudiosUI(data) }

/**
 * Salva (cria ou atualiza) um estúdio com as informações do formulário.
 * - Se o campo #estudioId estiver preenchido faz PUT em /admin/estudios/:id
 * - Caso contrário faz POST em /admin/estudios
 * @returns {Promise<void>}
 */
function salvarEstudio() {
  const idEl = document.getElementById('estudioId')
  const id = idEl ? idEl.value : ''
  const nome = (document.getElementById('estudioNome') || {}).value.trim()
  const filialWrappers = Array.from(document.querySelectorAll('.filialItem'))
  const filiais = filialWrappers.map(w => {
    const unidade = (w.querySelector('.estudioFilialName') || {}).value || ''
    const endereco = (w.querySelector('.estudioLocalAddress') || {}).value || ''
    const salas = parseInt((w.querySelector('.estudioLocalSalas') || {}).value) || 0
    const local = (unidade || endereco || '').trim()
    return { local, unidade: unidade.trim(), endereco: endereco.trim(), salas }
  }).filter(f => f.local)
  const local = filiais.map(f => f.local).join('; ')
  const ativo = !!((document.getElementById('estudioAtivo') || {}).checked)

  if (!nome) { showMessage('Nome é obrigatório.', 'error'); return }
  if (!filiais.length) { showMessage('Adicione ao menos uma filial.', 'error'); return }

  // Dispatch event with payload; actual network call should be done by the data layer.
  const payload = { id: id || null, nome, localizacao: local, filiais, ativo }
  document.dispatchEvent(new CustomEvent('admin:estudio:save', { detail: payload }))
  showMessage('Solicitado salvar estúdio.', 'info', 3000)
  clearForm()
}

/**
 * Limpa o formulário de estúdio e prepara inputs vazios.
 */
function clearForm() {
  const idEl = document.getElementById('estudioId')
  if (idEl) idEl.value = ''
  const nomeEl = document.getElementById('estudioNome')
  if (nomeEl) nomeEl.value = ''
  const container = document.getElementById('estudioFiliaisContainer')
  if (container) container.innerHTML = ''
  document.getElementById('estudioAtivo') && (document.getElementById('estudioAtivo').checked = true)
}

/**
 * Cria dinamicamente um wrapper para representar uma filial com campos de Unidade, Endereço e Salas.
 * @param {string} [unidade=''] - Valor inicial do campo unidade/filial.
 * @param {string} [endereco=''] - Valor inicial do campo endereço.
 * @param {number|string} [salas=''] - Valor inicial do campo salas.
 * @returns {HTMLDivElement} elemento wrapper contendo inputs e botão de remoção.
 */
function createFilialItem(unidade = '', endereco = '', salas = '') {
  const wrapper = document.createElement('div')
  wrapper.className = 'filialItem'
  wrapper.style.marginBottom = '6px'

  const inputUnidade = document.createElement('input')
  inputUnidade.type = 'text'
  inputUnidade.className = 'estudioFilialName'
  inputUnidade.placeholder = 'Unidade / Filial'
  inputUnidade.value = unidade
  inputUnidade.style.width = '200px'
  inputUnidade.style.marginRight = '8px'

  const inputEndereco = document.createElement('input')
  inputEndereco.type = 'text'
  inputEndereco.className = 'estudioLocalAddress'
  inputEndereco.placeholder = 'Endereço'
  inputEndereco.value = endereco
  inputEndereco.style.width = '240px'
  inputEndereco.style.marginRight = '8px'

  const inputSalas = document.createElement('input')
  inputSalas.type = 'number'
  inputSalas.className = 'estudioLocalSalas'
  inputSalas.placeholder = 'Salas'
  inputSalas.min = 0
  inputSalas.value = salas
  inputSalas.style.width = '110px'

  // action buttons: Apagar
  const actions = document.createElement('div')
  actions.className = 'actionButtons'

  const delBtn = document.createElement('button')
  delBtn.type = 'button'
  delBtn.className = 'delEstudio btnSmall'
  delBtn.textContent = 'Apagar'
  delBtn.addEventListener('click', () => wrapper.remove())

  actions.appendChild(delBtn)

  wrapper.appendChild(inputUnidade)
  wrapper.appendChild(inputEndereco)
  wrapper.appendChild(inputSalas)
  wrapper.appendChild(actions)
  return wrapper
}

/**
 * Adiciona um novo item de filial ao container de filiais do formulário.
 * @returns {void}
 */
function addFilial() {
  const container = document.getElementById('estudioFiliaisContainer')
  if (!container) return
  const item = createFilialItem()
  container.appendChild(item)
  // focus the unidade input for quick entry (mimics +Sala behavior)
  const nome = item.querySelector('.estudioFilialName')
  if (nome) nome.focus()
}

/**
 * Nota: este módulo é responsável apenas pela UI dos estúdios.
 * - Utilize `setEstudiosData(array)` para injetar dados carregados pela camada de dados.
 * - Escute os eventos `admin:estudio:save` e `admin:estudio:delete` para realizar chamadas à API.
 * - Os botões do formulário já disparam `admin:estudio:save` com o payload apropriado.
 */

// Bind básico de botões do formulário (visuais)
const salvarBtn = document.getElementById('salvarEstudioBtn')
if (salvarBtn) salvarBtn.addEventListener('click', salvarEstudio)
const cancelarBtn = document.getElementById('cancelarEstudioBtn')
if (cancelarBtn) cancelarBtn.addEventListener('click', clearForm)
const addBtn = document.getElementById('addFilialBtn')
if (addBtn) addBtn.addEventListener('click', addFilial)

// Make sure first row exists by default - removed so +Filial controls rows

/**
 * Setter para injetar / atualizar opções de estudo (preenche selects de salas também).
 * @param {Array<Object>} estudios
 */
export function setEstudiosOptions(estudios = []) {
  // populate any selects inside createSalaItem and main #salaEstudio if present
  const sel = document.getElementById('salaEstudio')
  if (sel && estudios.length) {
    sel.innerHTML = '<option value="">-- selecione --</option>'
    estudios.forEach(e => { const opt = document.createElement('option'); opt.value = e._id || e.id || ''; opt.textContent = e.nome || e.name || '--'; sel.appendChild(opt); })
  }
  // also populate any existing .salaEstudioSelect added dynamically
  document.querySelectorAll('.salaEstudioSelect').forEach(s => {
    s.innerHTML = '<option value="">-- selecione --</option>'
    estudios.forEach(e => { const opt = document.createElement('option'); opt.value = e._id || e.id || ''; opt.textContent = e.nome || e.name || '--'; s.appendChild(opt); })
  })
}

