import { showMessage } from './admin.js'

let cachedData = []
let isExpanded = false

/**
 * adminUsers.js — UI-only module
 * - Use `setUsersData(array)` para injetar dados
 * - Escute eventos `admin:user:update` e `admin:user:delete` para executar as chamadas de rede
 */

/**
 * Renderiza a lista de usuários no elemento #tableUsuarios.
 * Faz GET /admin/solicitantes e monta a tabela com campos editáveis (Nome, Role)
 * e botões inline (Alterar, Excluir).
 * @returns {Promise<void>}
 */
/**
 * Renderiza a tabela de usuários a partir de dados fornecidos.
 * @param {Array<Object>} data - Array de usuários ({ _id, nome, email, role })
 */
export function renderUsersUI(data = []) {
    const table = document.getElementById('tableUsuarios')
    if (!table) return
    if (!Array.isArray(data) || !data.length) {
        table.innerHTML = 'Nenhum usuário encontrado.'
        return
    }
    const html = [
        `<table class="painelTabela"><thead><tr><th>Nome</th><th>Email</th><th>Role</th><th>Ações</th></tr></thead><tbody>`,
    ]
    data.forEach(u => {
        const nomeEsc = (u.nome || u.solicitante || '').replace(/"/g, '&quot;')
        const emailEsc = (u.email || '').replace(/"/g, '&quot;')
        html.push(`
            <tr data-id="${u._id}">
                <td><input class="userNome" type="text" value="${nomeEsc}"></td>
                <td><input class="userEmail" type="email" value="${emailEsc}"></td>
                <td>
                    <select class="roleSelect">
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                    </select>
                </td>
                <td>
                    <div class="actionButtons">
                        <button class="saveUser">Salvar</button>
                        <button class="cancelUser">Cancelar</button>
                        <button class="delElemento delUser">Excluir</button>
                    </div>
                </td>
            </tr>`
        )
    })
    html.push('</tbody></table>')
    table.innerHTML = html.join('\n')

    table.querySelectorAll('tr[data-id]').forEach(tr => {
        const id = tr.dataset.id
        const u = data.find(x => (x._id || x.id) == id)
        const roleSel = tr.querySelector('.roleSelect')
        if (u && roleSel) roleSel.value = u.role || 'user'

        // store originals for cancel behavior
        tr.dataset.originalNome = u ? u.nome || '' : ''
        tr.dataset.originalEmail = u ? u.email || '' : ''
        tr.dataset.originalRole = u ? u.role || 'user' : 'user'

        const saveBtn = tr.querySelector('.saveUser')
        if (saveBtn)
            saveBtn.addEventListener('click', () => {
                const nomeVal = (tr.querySelector('.userNome') || {}).value || ''
                const emailVal = (tr.querySelector('.userEmail') || {}).value || ''
                const roleVal = (tr.querySelector('.roleSelect') || {}).value || 'user'
                document.dispatchEvent(
                    new CustomEvent('admin:user:update', {
                        detail: { id, solicitante: nomeVal, nome: nomeVal, email: emailVal, role: roleVal },
                    })
                )
                showMessage('Solicitada atualização de usuário.', 'info', 3000)
            })

        const cancelBtn = tr.querySelector('.cancelUser')
        if (cancelBtn)
            cancelBtn.addEventListener('click', () => {
                const nomeEl = tr.querySelector('.userNome')
                const emailEl = tr.querySelector('.userEmail')
                const roleEl = tr.querySelector('.roleSelect')
                if (nomeEl) nomeEl.value = tr.dataset.originalNome || ''
                if (emailEl) emailEl.value = tr.dataset.originalEmail || ''
                if (roleEl) roleEl.value = tr.dataset.originalRole || 'user'
                showMessage('Alterações revertidas.', 'info', 2000)
            })

        const delBtn = tr.querySelector('.delUser')
        if (delBtn)
            delBtn.addEventListener('click', ev => {
                if (!confirm('Excluir usuário?')) return
                document.dispatchEvent(new CustomEvent('admin:user:delete', { detail: { id } }))
                showMessage('Solicitada exclusão de usuário.', 'info', 3000)
            })
    })
}

/**
 * Setter para injetar dados de usuários no UI.
 * @param {Array<Object>} data
 */
export function setUsersData(data = []) {
    cachedData = data
    if (isExpanded) {
        renderUsersUI(data)
        const table = document.getElementById('tableUsuarios')
        if (table) table.style.display = ''
    }
}

function toggleUsersPanel() {
    const content = document.getElementById('usuariosContent')
    const btn = document.getElementById('toggleUsuariosBtn')
    if (!content) return

    isExpanded = !isExpanded
    content.style.display = isExpanded ? 'block' : 'none'

    if (btn) btn.textContent = isExpanded ? '-' : '+'

    if (isExpanded) {
        document.dispatchEvent(new CustomEvent('admin:user:fetch'))
    }
}

// Inicialização: Adiciona listener ao botão de toggle
const toggleBtn = document.getElementById('toggleUsuariosBtn')
if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleUsersPanel)
}

// +Usuário button behavior: append an empty row for creating a new user
const addUserBtn = document.getElementById('addUsuarioBtn')
if (addUserBtn)
    addUserBtn.addEventListener('click', () => {
        // create an inline row under the table
        const table = document.getElementById('tableUsuarios')
        if (!table) return
        const container = document.createElement('div')
        container.style.marginTop = '8px'
        container.className = 'filialItem'

        const inputNome = document.createElement('input')
        inputNome.type = 'text'
        inputNome.className = 'userNome'
        inputNome.placeholder = 'Nome'
        inputNome.style.width = '240px'

        const inputEmail = document.createElement('input')
        inputEmail.type = 'email'
        inputEmail.className = 'userEmail'
        inputEmail.placeholder = 'Email'
        inputEmail.style.width = '200px'

        const inputSenha = document.createElement('input')
        inputSenha.type = 'password'
        inputSenha.className = 'userSenha'
        inputSenha.placeholder = 'Senha'
        inputSenha.style.width = '120px'

        const selectEstudio = document.createElement('select')
        selectEstudio.className = 'estudioSelect'
        selectEstudio.style.width = '140px'
        selectEstudio.innerHTML = '<option value="">-- Estúdio --</option>'
        if (window.__estudiosCache && Array.isArray(window.__estudiosCache)) {
            window.__estudiosCache.forEach(e => {
                const opt = document.createElement('option')
                opt.value = e._id || e.id
                opt.textContent = e.nome || e.name
                selectEstudio.appendChild(opt)
            })
        }

        const selectRole = document.createElement('select')
        selectRole.className = 'roleSelect'
        selectRole.innerHTML =
            '<option value="user">user</option><option value="admin">admin</option>'

        const saveBtn = document.createElement('button')
        saveBtn.className = 'saveUser'
        saveBtn.textContent = 'Salvar'
        saveBtn.addEventListener('click', () => {
            const nomeVal = inputNome.value || ''
            const emailVal = inputEmail.value || ''
            const senhaVal = inputSenha.value || ''
            const estudioVal = selectEstudio.value || ''
            const roleVal = selectRole.value || 'user'
            if (!estudioVal) {
                showMessage('Estúdio é obrigatório.', 'error')
                return
            }
            document.dispatchEvent(
                new CustomEvent('admin:user:create', {
                    detail: { solicitante: nomeVal, nome: nomeVal, email: emailVal, senha: senhaVal, role: roleVal, estudio: estudioVal },
                })
            )
            showMessage('Solicitada criação de usuário.', 'info', 3000)
            container.remove()
        })

        const cancelBtn = document.createElement('button')
        cancelBtn.className = 'cancelUser'
        cancelBtn.textContent = 'Cancelar'
        cancelBtn.addEventListener('click', () => container.remove())

        container.appendChild(inputNome)
        container.appendChild(inputEmail)
        container.appendChild(inputSenha)
        container.appendChild(selectEstudio)
        container.appendChild(selectRole)
        const actions = document.createElement('div')
        actions.className = 'actionButtons'
        actions.appendChild(saveBtn)
        actions.appendChild(cancelBtn)
        container.appendChild(actions)
        table.insertAdjacentElement('afterend', container)
    })

/**
 * NOTE: network actions removed from this module.
 * Consumers should listen to the following events and perform API calls:
 * - 'admin:user:update' detail: { id, nome, role }
 * - 'admin:user:delete' detail: { id }
 */

/**
 * Deprecated: update/delete network functions were removed to keep this module UI-only.
 */

/**
 * Nota: a inicialização relacionada à sessão/rotas foi removida.
 * Este módulo é responsável apenas por renderizar a UI. Para usar:
 * - Chame `setUsersData(array)` com os dados carregados pela camada de dados.
 * - Escute eventos `admin:user:update` e `admin:user:delete` para executar chamadas de API.
 */
