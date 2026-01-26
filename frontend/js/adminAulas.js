import { showMessage } from './admin.js'

let cachedData = []
let cachedSalas = []
let isExpanded = false
const toggleIds = [
    'tableAulas',
    'salvarAulaBtn',
    'cancelarAulaBtn',
    'excluirAulaBtn',
    'aulasListContainer',
    'aulaId',
    'aulaEstudio',
    'aulaSala',
    'aulaDia',
    'aulaHora',
    'aulaModalidade',
    'aulaProfessor',
    'aulaAtivo',
]

/**
 * Renderiza a tabela de aulas regulares.
 * @param {Array<Object>} data
 */
export function renderAulasUI(data = []) {
    const table = document.getElementById('tableAulas')
    if (!table) return
    if (!Array.isArray(data) || !data.length) {
        table.innerHTML = 'Nenhuma aula encontrada.'
        return
    }

    const html = [
        `<table class="painelTabela"><thead><tr><th>Estúdio</th><th>Dia</th><th>Hora</th><th>Modalidade</th><th>Prof</th><th>Ações</th></tr></thead><tbody>`,
    ]

    data.forEach(a => {
        html.push(`<tr data-id="${a._id}">
      <td>${a.estudioNome || a.estudio || ''}</td>
      <td>${a.diaSemana || ''}</td>
      <td>${a.horaInicio || ''}</td>
      <td>${a.modalidade || ''}</td>
      <td>${a.professorNome || a.professor || ''}</td>
      <td><button class="delAula">Excluir</button></td>
    </tr>`)
    })
    html.push('</tbody></table>')
    table.innerHTML = html.join('\n')

    table.querySelectorAll('.delAula').forEach(btn =>
        btn.addEventListener('click', ev => {
            const tr = ev.target.closest('tr')
            const id = tr.dataset.id
            if (!confirm('Excluir aula?')) return
            document.dispatchEvent(new CustomEvent('admin:aula:delete', { detail: { id } }))
        })
    )
}

/**
 * Setter para injetar dados de aulas no UI.
 * @param {Array<Object>} data
 */
export function setAulasData(data = []) {
    cachedData = data
    if (isExpanded) {
        renderAulasUI(data)
        const table = document.getElementById('tableAulas')
        if (table) table.style.display = ''
    }
}

/**
 * Popula o select de estúdios no formulário de aulas.
 * @param {Array<Object>} estudios
 */
export function setAulasEstudiosOptions(estudios = []) {
    const sel = document.getElementById('aulaEstudio')
    if (!sel) return
    sel.innerHTML = '<option value="">-- selecione --</option>'
    estudios.forEach(e => {
        const opt = document.createElement('option')
        opt.value = e._id || e.id || ''
        opt.textContent = e.nome || e.name || '--'
        sel.appendChild(opt)
    })
}

/**
 * Armazena o cache de salas para filtragem dinâmica.
 * @param {Array<Object>} data
 */
export function setAulasSalasCache(data = []) {
    cachedSalas = data
}

/**
 * Popula o select de professores no formulário de aulas.
 * @param {Array<Object>} users
 */
export function setAulasProfessoresOptions(users = []) {
    const sel = document.getElementById('aulaProfessor')
    if (!sel) return
    sel.innerHTML = '<option value="">-- selecione --</option>'
    users.forEach(u => {
        const opt = document.createElement('option')
        opt.value = u._id || u.id || ''
        opt.textContent = u.solicitante || u.nome || '--'
        sel.appendChild(opt)
    })
}

/**
 * Atualiza as opções do select de salas com base no estúdio selecionado.
 * @param {string} estudioId
 */
export function updateAulasSalasOptions(estudioId) {
    const sel = document.getElementById('aulaSala')
    if (!sel) return
    sel.innerHTML = '<option value="">-- selecione --</option>'
    if (!estudioId) return

    const salas = cachedSalas.filter(s => (s.estudioId || s.estudio) == estudioId)
    salas.forEach(s => {
        const opt = document.createElement('option')
        opt.value = s._id || s.id || ''
        opt.textContent = s.nome || `Sala ${s.numero}` || '--'
        sel.appendChild(opt)
    })
}

function toggleAulasPanel() {
    const btn = document.getElementById('toggleAulasBtn')
    isExpanded = !isExpanded

    toggleIds.forEach(id => {
        const el = document.getElementById(id)
        if (el) el.style.display = isExpanded ? '' : 'none'
        const label = document.querySelector(`label[for="${id}"]`)
        if (label) label.style.display = isExpanded ? '' : 'none'
    })

    if (btn) btn.textContent = isExpanded ? '-' : '+'

    if (isExpanded) {
        document.dispatchEvent(new CustomEvent('admin:aula:fetch'))
    }
}

// Inicialização: Injeta o botão e esconde a tabela/botões
const table = document.getElementById('tableAulas')
if (table) {
    // Inicia escondido
    toggleIds.forEach(id => {
        const el = document.getElementById(id)
        if (el) el.style.display = 'none'
        const label = document.querySelector(`label[for="${id}"]`)
        if (label) label.style.display = 'none'
    })

    // Tenta encontrar o cabeçalho anterior (H1-H6) para adicionar o botão
    let header = table.previousElementSibling
    for (let i = 0; i < 3; i++) {
        if (header && /^H[1-6]$/.test(header.tagName)) break
        if (header) header = header.previousElementSibling
    }
    const target = header || table.previousElementSibling

    if (target) {
        const btn = document.createElement('button')
        btn.id = 'toggleAulasBtn'
        btn.textContent = '+'
        btn.style.marginLeft = '10px'
        btn.style.cursor = 'pointer'
        btn.addEventListener('click', toggleAulasPanel)
        target.appendChild(btn)
    }

    // Garante que Sala e Professor sejam selects (substitui input se necessário)
    ['aulaSala', 'aulaProfessor'].forEach(id => {
        const el = document.getElementById(id)
        if (el && el.tagName === 'INPUT') {
            const sel = document.createElement('select')
            sel.id = id
            sel.className = el.className
            el.replaceWith(sel)
        }
    })

    // Listener para atualizar salas quando o estúdio muda
    const selEstudio = document.getElementById('aulaEstudio')
    if (selEstudio) {
        selEstudio.addEventListener('change', () => updateAulasSalasOptions(selEstudio.value))
    }
}
