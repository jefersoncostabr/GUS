import { showMessage } from './admin.js'

let cachedData = []
let isExpanded = false

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
    const table = document.getElementById('tableSalas')
    if (!table) return
    if (!Array.isArray(data) || !data.length) {
        table.innerHTML = 'Nenhuma sala encontrada.'
        return
    }
    const html = [
        `<table class="painelTabela"><thead><tr><th>Estúdio</th><th>Número</th><th>Nome</th><th>Ações</th></tr></thead><tbody>`,
    ]
    data.forEach(s => {
        html.push(`
            <tr data-id="${s._id}">
                <td>${s.estudioNome || s.estudioId || ''}</td>
                <td>${s.numero || ''}</td>
                <td>${s.nome || s.name || ''}</td>
                <td><button class="btnSmall">Editar</button> <button class="delElemento btnSmall">Excluir</button></td>
            </tr>`
        )
    })
    html.push('</tbody></table>')
    table.innerHTML = html.join('\n')

    table.querySelectorAll('.editSala').forEach(btn =>
        btn.addEventListener('click', ev => {
            const tr = ev.target.closest('tr')
            const id = tr.dataset.id
            const item = data.find(x => (x._id || x.id) == id)
            if (!item) return
            document.getElementById('salaId').value = id
            document.getElementById('salaEstudio').value = item.estudioId || ''
            // Atualiza as opções do select de número baseado no estúdio selecionado
            updateSalaNumeroOptions(
                item.estudioId,
                document.getElementById('salaNumero'),
                item.numero
            )
            document.getElementById('salaNome').value = item.nome || item.name || ''
            showMessage('Pronto para editar a sala.', 'info', 3000)
        })
    )

    table.querySelectorAll('.delSala').forEach(btn =>
        btn.addEventListener('click', ev => {
            const tr = ev.target.closest('tr')
            const id = tr.dataset.id
            if (!confirm('Excluir sala?')) return
            // Dispatch event for data layer
            document.dispatchEvent(new CustomEvent('admin:sala:delete', { detail: { id } }))
            showMessage('Solicitada exclusão de sala.', 'info', 3000)
        })
    )
}

/**
 * Salva (cria ou atualiza) uma sala com os dados do formulário.
 * Faz POST em /admin/salas para criar ou PUT em /admin/salas/:id para atualizar.
 * @returns {Promise<void>}
 */
function salvarSala() {
    const elId = document.getElementById('salaId')
    let elEstudio = document.getElementById('salaEstudio')
    let elNumero = document.getElementById('salaNumero')
    let elNome = document.getElementById('salaNome')

    // Fallback: Tenta buscar por classe caso os IDs não sejam encontrados (ex: alteração no HTML)
    if (!elEstudio) elEstudio = document.querySelector('.salaEstudioSelect')
    if (!elNumero) elNumero = document.querySelector('.salaNumeroInput')
    if (!elNome) elNome = document.querySelector('.salaNomeInput')

    if (!elEstudio || !elNumero || !elNome) {
        console.error('Erro ao salvar sala: Elementos não encontrados.', {
            elEstudio,
            elNumero,
            elNome,
        })
        showMessage('Erro: Campos do formulário (Estúdio, Número, Nome) não localizados.', 'error')
        return
    }

    const id = elId ? elId.value : ''
    const estudioId = elEstudio.value
    const numero = parseInt(elNumero.value)
    const nome = elNome.value.trim()
    if (!estudioId || !numero) {
        showMessage('Estúdio e número são obrigatórios.', 'error')
        return
    }

    const payload = { id: id || null, estudio: estudioId, numero, nome }
    document.dispatchEvent(new CustomEvent('admin:sala:save', { detail: payload }))
    showMessage('Solicitado salvar sala.', 'info', 3000)
    clearForm()
}

/**
 * Limpa o formulário de sala.
 */
function clearForm() {
    const elId = document.getElementById('salaId')
    if (elId) elId.value = ''
    const elEst = document.getElementById('salaEstudio')
    if (elEst) elEst.value = ''
    const elNum = document.getElementById('salaNumero')
    if (elNum) elNum.value = ''
    const elNome = document.getElementById('salaNome')
    if (elNome) elNome.value = ''
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
const salvarSalaBtn = document.getElementById('salvarSalaBtn')
if (salvarSalaBtn) salvarSalaBtn.addEventListener('click', salvarSala)
const cancelarSalaBtn = document.getElementById('cancelarSalaBtn')
if (cancelarSalaBtn) cancelarSalaBtn.addEventListener('click', clearForm)

// Lógica para transformar o input #salaNumero em Select e vincular ao Estúdio
const mainEstudioSel = document.getElementById('salaEstudio')
let mainNumInput = document.getElementById('salaNumero')

// Se for input, substitui por select para garantir a funcionalidade pedida
if (mainNumInput && mainNumInput.tagName === 'INPUT') {
    const newSel = document.createElement('select')
    newSel.id = 'salaNumero'
    newSel.className = mainNumInput.className
    newSel.style.width = mainNumInput.style.width || '100px'
    mainNumInput.replaceWith(newSel)
    mainNumInput = newSel // atualiza referência
}

if (mainEstudioSel) {
    mainEstudioSel.addEventListener('change', () => {
        updateSalaNumeroOptions(mainEstudioSel.value, document.getElementById('salaNumero'))
    })
}

// Se já houver estúdios em cache (recarregamento de página), popula o select inicial se necessário
if (window.__estudiosCache && mainEstudioSel && mainEstudioSel.value) {
    updateSalaNumeroOptions(mainEstudioSel.value, document.getElementById('salaNumero'))
} else if (window.__estudiosCache && mainEstudioSel) {
    // Se nada selecionado, limpa
    updateSalaNumeroOptions('', document.getElementById('salaNumero'))
}

// Add Sala button (create empty row to be filled)
const addSalaBtn = document.getElementById('addSalaBtn')
if (addSalaBtn) addSalaBtn.addEventListener('click', addSala)

/**
 * Cria dinamicamente um item de sala para preenchimento múltiplo (+Sala)
 * @returns {HTMLDivElement}
 */
function createSalaItem() {
    const wrapper = document.createElement('div')
    wrapper.className = 'filialItem'
    wrapper.style.marginBottom = '6px'

    const selectEst = document.createElement('select')
    selectEst.className = 'salaEstudioSelect'
    selectEst.style.minWidth = '200px'

    const selectNumero = document.createElement('select')
    selectNumero.className = 'salaNumeroInput'
    selectNumero.style.width = '110px'
    selectNumero.innerHTML = '<option value="">Núm</option>'

    const inputNome = document.createElement('input')
    inputNome.type = 'text'
    inputNome.className = 'salaNomeInput'
    inputNome.placeholder = 'Nome da sala'
    inputNome.style.width = '200px'

    // action buttons: Alterar / Apagar
    const actions = document.createElement('div')
    actions.className = 'actionButtons'

    const alterBtn = document.createElement('button')
    alterBtn.type = 'button'
    alterBtn.className = 'alterSala btnSmall'
    alterBtn.textContent = 'Alterar'
    alterBtn.addEventListener('click', () => {
        // copy values into main form for editing
        document.getElementById('salaId').value = wrapper.dataset.id || ''
        const selMain = document.getElementById('salaEstudio')
        if (selMain) selMain.value = selectEst.value || ''
        // Atualiza opções do main e seleciona valor
        updateSalaNumeroOptions(
            selectEst.value,
            document.getElementById('salaNumero'),
            selectNumero.value
        )
        const elNome = document.getElementById('salaNome')
        if (elNome) elNome.value = inputNome.value || ''
        elNome && elNome.focus()
    })

    const delBtn = document.createElement('button')
    delBtn.type = 'button'
    delBtn.className = 'delSala btnSmall'
    delBtn.textContent = 'Apagar'
    delBtn.addEventListener('click', () => {
        // if this row corresponds to an existing sala (has data-id) dispatch delete, otherwise remove
        if (wrapper.dataset.id) {
            document.dispatchEvent(
                new CustomEvent('admin:sala:delete', { detail: { id: wrapper.dataset.id } })
            )
        }
        wrapper.remove()
    })

    actions.appendChild(alterBtn)
    actions.appendChild(delBtn)

    wrapper.appendChild(selectEst)
    wrapper.appendChild(selectNumero)
    wrapper.appendChild(inputNome)
    wrapper.appendChild(actions)

    // populate select with cached estudios if available
    if (window.__estudiosCache && Array.isArray(window.__estudiosCache)) {
        const opts = ['<option value="">-- selecione --</option>'].concat(
            window.__estudiosCache.map(
                e => `<option value="${e._id || e.id || ''}">${e.nome || e.name || '--'}</option>`
            )
        )
        selectEst.innerHTML = opts.join('\n')
    }

    // Listener para atualizar números quando mudar estúdio nesta linha
    selectEst.addEventListener('change', () => {
        updateSalaNumeroOptions(selectEst.value, selectNumero)
    })

    return wrapper
}

/**
 * Adiciona um item de sala vazio ao container
 */
function addSala() {
    const container = document.getElementById('salasListContainer')
    if (!container) return
    const item = createSalaItem()
    container.appendChild(item)
    // if estudios options are provided via setEstudiosOptions, populate the new select
    if (window.__estudiosCache && Array.isArray(window.__estudiosCache)) {
        const sel = item.querySelector('.salaEstudioSelect')
        if (sel)
            sel.innerHTML = ['<option value="">-- selecione --</option>']
                .concat(
                    window.__estudiosCache.map(
                        e =>
                            `<option value="${e._id || e.id || ''}">${e.nome || e.name || '--'}</option>`
                    )
                )
                .join('\n')
    }
}

/**
 * Helper: Popula o select de números baseado na quantidade de salas do estúdio.
 * @param {string} estudioId - ID do estúdio selecionado.
 * @param {HTMLSelectElement} selectEl - Elemento select a ser populado.
 * @param {string|number} [currentVal] - Valor opcional para deixar pré-selecionado.
 */
function updateSalaNumeroOptions(estudioId, selectEl, currentVal = null) {
    if (!selectEl) return
    selectEl.innerHTML = '<option value="">--</option>'
    if (!estudioId || !window.__estudiosCache) return

    const estudio = window.__estudiosCache.find(e => (e._id || e.id) == estudioId)
    if (estudio) {
        const qtd = estudio.salas || 1
        for (let i = 1; i <= qtd; i++) {
            const opt = document.createElement('option')
            opt.value = i
            opt.textContent = `Sala ${i}`
            if (currentVal && currentVal == i) opt.selected = true
            selectEl.appendChild(opt)
        }
    }
}

/**
 * Setter para injetar dados de salas no UI.
 * @param {Array<Object>} data
 */
export function setSalasData(data = []) {
    cachedData = data
    if (isExpanded) {
        renderSalasUI(data)
        const table = document.getElementById('tableSalas')
        if (table) table.style.display = ''
    }
}

function toggleSalasPanel() {
    const content = document.getElementById('salasContent')
    const btn = document.getElementById('toggleSalasBtn')
    if (!content) return

    isExpanded = !isExpanded
    content.style.display = isExpanded ? 'block' : 'none'

    if (btn) btn.textContent = isExpanded ? '-' : '+'

    if (isExpanded) {
        document.dispatchEvent(new CustomEvent('admin:sala:fetch'))
    }
}

// Inicialização: Adiciona listener ao botão de toggle
const toggleBtn = document.getElementById('toggleSalasBtn')
if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleSalasPanel)
}
