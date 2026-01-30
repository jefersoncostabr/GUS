import { showMessage } from './admin.js'

let cachedData = []
let cachedSalas = []
let isExpanded = false

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
        `<table class="painelTabela"><thead><tr><th>Estúdio</th><th>Sala</th><th>Dia</th><th>Hora</th><th>Modalidade</th><th>Prof</th><th>Ações</th></tr></thead><tbody>`,
    ]

    data.forEach(a => {
        let salaShow = a.salaNome || '';
        if (!salaShow && a.sala) {
            const sId = (typeof a.sala === 'object') ? (a.sala._id || a.sala.id) : a.sala;
            const s = cachedSalas.find(x => (x._id || x.id) == sId);
            if (s) salaShow = s.nome || `Sala ${s.numero}`;
            else salaShow = sId;
        }
        html.push(
            `<tr data-id="${a._id}">
                <td>${a.estudioNome || a.estudio || ''}</td>
                <td>${salaShow}</td>
                <td>${a.diaSemana || ''}</td>
                <td>${a.horaInicio || ''}</td>
                <td>${a.modalidade || ''}</td>
                <td>${a.professorNome || a.professor || ''}</td>    
            <td><button class="delElemento delAula btnSmall">Excluir</button></td>
            </tr>`)
    })
    html.push('</tbody></table>')
    table.innerHTML = html.join('\n')

    table.querySelectorAll('tbody tr').forEach(tr => {
        tr.style.cursor = 'pointer'
        tr.addEventListener('click', ev => {
            if (ev.target.classList.contains('delAula')) {
                const id = tr.dataset.id
                if (!confirm('Excluir aula?')) return
                document.dispatchEvent(new CustomEvent('admin:aula:delete', { detail: { id } }))
                return
            }

            const id = tr.dataset.id
            const item = data.find(x => (x._id || x.id) == id)
            if (!item) return

            const getVal = (v) => (v && typeof v === 'object') ? (v._id || v.id) : (v || '')

            document.getElementById('aulaId').value = id
            
            const estudioId = getVal(item.estudio || item.estudioId)
            document.getElementById('aulaEstudio').value = estudioId
            
            updateAulasSalasOptions(estudioId)
            
            const salaId = getVal(item.sala || item.salaId)
            document.getElementById('aulaSala').value = salaId
            
            document.getElementById('aulaDia').value = item.diaSemana || ''
            document.getElementById('aulaHora').value = item.horaInicio || ''
            document.getElementById('aulaModalidade').value = item.modalidade || ''
            
            const profId = getVal(item.professor || item.professorId)
            document.getElementById('aulaProfessor').value = profId

            const ativoEl = document.getElementById('aulaAtivo')
            if (ativoEl) ativoEl.checked = item.ativo !== false

            showMessage('Pronto para editar a aula.', 'info', 3000)
        })
    })
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
    // Se já houver aulas carregadas, re-renderiza para resolver nomes de salas que dependem do cache
    if (isExpanded && cachedData.length) renderAulasUI(cachedData);
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

    const salas = cachedSalas.filter(s => {
        const eVal = s.estudio || s.estudioId
        const eId = (eVal && typeof eVal === 'object') ? (eVal._id || eVal.id) : eVal
        return eId == estudioId
    })
    salas.forEach(s => {
        const opt = document.createElement('option')
        opt.value = s._id || s.id || ''
        opt.textContent = s.nome || `Sala ${s.numero}` || '--'
        sel.appendChild(opt)
    })
}

/**
 * Salva (cria ou atualiza) uma aula regular.
 */
function salvarAula() {
    const id = document.getElementById('aulaId').value
    const estudioId = document.getElementById('aulaEstudio').value
    const salaId = document.getElementById('aulaSala').value
    const diaSemana = document.getElementById('aulaDia').value
    const horaInicio = document.getElementById('aulaHora').value
    const modalidade = document.getElementById('aulaModalidade').value
    const professorId = document.getElementById('aulaProfessor').value
    const ativoEl = document.getElementById('aulaAtivo')
    const ativo = ativoEl ? ativoEl.checked : true

    const camposFaltantes = [];
    if (!estudioId) camposFaltantes.push('aulaEstudio');
    if (!salaId) camposFaltantes.push('aulaSala');
    if (!diaSemana) camposFaltantes.push('aulaDia');
    if (!horaInicio) camposFaltantes.push('aulaHora');
    if (!professorId) camposFaltantes.push('aulaProfessor');

    if (camposFaltantes.length > 0) {
        console.error('Campos obrigatórios para salvar aula estão faltando:', camposFaltantes);
        showMessage('Preencha todos os campos obrigatórios (Estúdio, Sala, Dia, Hora, Professor).', 'error')
        return
    }

    const payload = {
        id,
        estudio: estudioId,
        sala: salaId,
        diaSemana,
        horaInicio,
        modalidade,
        professor: professorId,
        ativo
    }

    document.dispatchEvent(new CustomEvent('admin:aula:save', { detail: payload }))
    showMessage('Solicitado salvar aula.', 'info', 3000)
    clearForm()
}

function clearForm() {
    const ids = ['aulaId', 'aulaEstudio', 'aulaSala', 'aulaDia', 'aulaHora', 'aulaModalidade', 'aulaProfessor']
    ids.forEach(id => {
        const el = document.getElementById(id)
        if (el) el.value = ''
    })
    const ativoEl = document.getElementById('aulaAtivo')
    if (ativoEl) ativoEl.checked = true
    
    updateAulasSalasOptions('')
}

function toggleAulasPanel() {
  const content = document.getElementById('aulasContent');
  const btn = document.getElementById('toggleAulasBtn');
  if (!content) return;

  isExpanded = !isExpanded;
  content.style.display = isExpanded ? 'block' : 'none';

  if (btn) btn.textContent = isExpanded ? '-' : '+';

  if (isExpanded) {
    document.dispatchEvent(new CustomEvent('admin:aula:fetch'));
  }
}

// Inicialização
const aulasTable = document.getElementById('tableAulas');
if (aulasTable) {
    // Garante que Sala e Professor sejam selects (substitui input se necessário)
    ['aulaSala', 'aulaProfessor'].forEach(id => {
        const el = document.getElementById(id)
        if (el && el.tagName === 'INPUT') {
            const sel = document.createElement('select')
            sel.id = id
            sel.className = el.className
            sel.style.display = el.style.display
            el.replaceWith(sel)
        }
    })

    // Aumenta o tamanho do campo de hora
    const elHora = document.getElementById('aulaHora')
    if (elHora) {
        elHora.style.width = '80px'
    }

    // Listener para atualizar salas quando o estúdio muda
    const selEstudio = document.getElementById('aulaEstudio')
    if (selEstudio) {
        selEstudio.addEventListener('change', () => updateAulasSalasOptions(selEstudio.value))
    }

    const btnSalvar = document.getElementById('salvarAulaBtn')
    if (btnSalvar) btnSalvar.addEventListener('click', salvarAula)
    
    const btnCancelar = document.getElementById('cancelarAulaBtn')
    if (btnCancelar) btnCancelar.addEventListener('click', clearForm)

    const btnLimpar = document.getElementById('limparCamposBtn')
    if (btnLimpar) btnLimpar.addEventListener('click', clearForm)

    const toggleBtn = document.getElementById('toggleAulasBtn');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleAulasPanel);
}
