
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggleRelatoriosBtn');
    const contentDiv = document.getElementById('relatoriosContent');

    // Lógica de Toggle (Abrir/Fechar painel)
    if (toggleBtn && contentDiv) {
        toggleBtn.addEventListener('click', () => {
            const isHidden = contentDiv.style.display === 'none';
            contentDiv.style.display = isHidden ? 'block' : 'none';
            toggleBtn.textContent = isHidden ? '-' : '+';

            // Se a ação foi fechar o painel (!isHidden), remove os botões dinâmicos gerados
            if (!isHidden) {
                contentDiv.querySelectorAll('.btn-export-dynamic').forEach(btn => btn.remove());
            }
        });
    }

    // Listeners para os botões de relatório (Lógica a ser implementada)
    document.getElementById('btnRelatorioSemana')?.addEventListener('click', (e) => {
        e.target.disabled = true;
        document.dispatchEvent(new CustomEvent('admin:relatorio:semana', { detail: { button: e.target } }));
    });

    document.getElementById('btnRelatorioMes')?.addEventListener('click', (e) => {
        e.target.disabled = true;
        document.dispatchEvent(new CustomEvent('admin:relatorio:mes', { detail: { button: e.target } }));
    });

    document.getElementById('btnRelatorioUsosProf')?.addEventListener('click', () => {
        const container = document.getElementById('containerRelatorioProf');
        if (container) {
            container.style.display = container.style.display === 'none' ? 'block' : 'none';
        }
    });

    document.getElementById('btnIrRelatorioProf')?.addEventListener('click', (e) => {
        const select = document.getElementById('selRelatorioProf');
        const idProfessor = select.value;
        if (idProfessor) {
            e.target.disabled = true;
            document.dispatchEvent(new CustomEvent('admin:relatorio:professor', { detail: { button: e.target, id: idProfessor } }));
        }
    });

    document.getElementById('btnRelatorioAulas')?.addEventListener('click', (e) => {
        e.target.disabled = true;
        document.dispatchEvent(new CustomEvent('admin:relatorio:aulas', { detail: { button: e.target } }));
    });

    document.getElementById('btnRelatorioProfs')?.addEventListener('click', (e) => {
        e.target.disabled = true;
        document.dispatchEvent(new CustomEvent('admin:relatorio:professores', { detail: { button: e.target } }));
    });
});

/**
 * Popula o select de professores no painel de relatórios.
 * @param {Array<Object>} users - Lista de usuários/professores.
 */
export function setRelatorioProfessoresOptions(users = []) {
    const sel = document.getElementById('selRelatorioProf');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Selecione o Professor --</option>';
    users.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u._id || u.id || '';
        opt.textContent = u.solicitante || u.nome || '--';
        sel.appendChild(opt);
    });
}

/**
 * Exibe botões de exportação (TXT e Copiar) após a geração de um relatório.
 * @param {Array|Object} data - Os dados a serem exportados.
 * @param {string} targetBtnId - O ID do botão que gerou o relatório (para posicionar os novos botões).
 */
export function showExportButtons(data, targetBtnId) {
    const targetBtn = document.getElementById(targetBtnId);
    if (!targetBtn || !targetBtn.parentNode) return;

    const container = targetBtn.parentNode;

    // Remove botões de exportação antigos se existirem no mesmo container
    container.querySelectorAll('.btn-export-dynamic').forEach(btn => btn.remove());

    // Cria botão TXT
    const btnTxt = document.createElement('button');
    btnTxt.textContent = 'TXT';
    btnTxt.className = 'btnSmall btn-export-dynamic';
    btnTxt.style.marginLeft = '10px';
    btnTxt.style.color = 'black';
    btnTxt.title = 'Baixar dados em .txt';
    btnTxt.onclick = () => {
        const textData = JSON.stringify(data, null, 2);
        const blob = new Blob([textData], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_${new Date().toISOString().slice(0,10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    // Cria botão Copiar
    const btnCopy = document.createElement('button');
    btnCopy.textContent = 'Copiar';
    btnCopy.className = 'btnSmall btn-export-dynamic';
    btnCopy.style.marginLeft = '5px';
    btnCopy.style.color = 'black';
    btnCopy.title = 'Copiar JSON para área de transferência';
    btnCopy.onclick = () => {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2))
            .then(() => alert('Dados copiados para a área de transferência!'))
            .catch(err => console.error('Erro ao copiar', err));
    };

    // Adiciona os botões ao DOM logo após o botão principal
    container.insertBefore(btnCopy, targetBtn.nextSibling);
    container.insertBefore(btnTxt, targetBtn.nextSibling);
}