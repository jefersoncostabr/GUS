
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
                contentDiv.querySelectorAll('.btn-export-dynamic, .btn-export-wrapper').forEach(btn => btn.remove());
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
 * Converte os dados do relatório para texto legível (sem JSON).
 * @param {Array|Object} data
 * @returns {string}
 */
function formatarTextoLegivel(data) {
    const dataHora = new Date().toLocaleString('pt-BR');
    const linhas = [`=== RELATÓRIO GUS ===`, `Gerado em: ${dataHora}`, ``];

    const itens = Array.isArray(data) ? data : [data];

    itens.forEach((item, idx) => {
        linhas.push(`--- Registro ${idx + 1} ---`);
        if (item && typeof item === 'object') {
            Object.entries(item).forEach(([chave, valor]) => {
                // Ignora chaves internas do MongoDB e __v
                if (chave === '__v') return;
                let valorFormatado;
                if (valor === null || valor === undefined) {
                    valorFormatado = '-';
                } else if (Array.isArray(valor)) {
                    valorFormatado = valor.length === 0 ? '-' : valor.map(v =>
                        typeof v === 'object' ? JSON.stringify(v) : String(v)
                    ).join(', ');
                } else if (typeof valor === 'object') {
                    valorFormatado = JSON.stringify(valor);
                } else {
                    valorFormatado = String(valor);
                }
                linhas.push(`  ${chave}: ${valorFormatado}`);
            });
        } else {
            linhas.push(`  ${String(item)}`);
        }
        linhas.push('');
    });

    linhas.push(`Total de registros: ${itens.length}`);
    return linhas.join('\n');
}

/**
 * Dispara o download de um arquivo no navegador.
 * @param {string} conteudo
 * @param {string} nomeArquivo
 * @param {string} tipo - MIME type
 */
function downloadArquivo(conteudo, nomeArquivo, tipo) {
    const blob = new Blob([conteudo], { type: tipo });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

/**
 * Exibe botões de exportação após a geração de um relatório.
 * Botões gerados:
 *   - Documento TXT  → baixa texto legível como .txt
 *   - JSON           → baixa os dados brutos como .json
 *   - Copiar texto   → copia texto legível para a área de transferência
 *   - Copiar JSON    → copia JSON bruto para a área de transferência
 * @param {Array|Object} data - Os dados a serem exportados.
 * @param {string} targetBtnId - O ID do botão que gerou o relatório.
 */
export function showExportButtons(data, targetBtnId) {
    const targetBtn = document.getElementById(targetBtnId);
    if (!targetBtn || !targetBtn.parentNode) return;

    const container = targetBtn.parentNode;
    const dataNome = new Date().toISOString().slice(0, 10);

    // Remove botões de exportação antigos se existirem no mesmo container
    container.querySelectorAll('.btn-export-dynamic, .btn-export-wrapper').forEach(btn => btn.remove());

    const botoesWrap = document.createElement('div');
    botoesWrap.className = 'btn-export-wrapper';
    botoesWrap.style.display = 'inline-flex';
    botoesWrap.style.flexWrap = 'wrap';
    botoesWrap.style.alignItems = 'center';
    botoesWrap.style.justifyContent = 'center';
    botoesWrap.style.gap = '4px';
    botoesWrap.style.margin = '6px auto 0';
    botoesWrap.style.maxWidth = '100%';
    botoesWrap.style.verticalAlign = 'middle';

    function criarBtn(label, title) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.className = 'btnSmall btn-export-dynamic';
        btn.style.marginLeft = '0';
        btn.style.padding = '2px 6px';
        btn.style.fontSize = '12px';
        btn.style.lineHeight = '1.2';
        btn.style.color = 'black';
        btn.title = title;
        return btn;
    }

    // Documento TXT — texto legível
    const btnTxt = criarBtn('TXT', 'Baixar relatório em texto legível (.txt)');
    btnTxt.onclick = () => {
        downloadArquivo(formatarTextoLegivel(data), `relatorio_${dataNome}.txt`, 'text/plain;charset=utf-8');
    };

    // JSON — dados brutos
    const btnJson = criarBtn('JSON', 'Baixar dados brutos em .json');
    btnJson.onclick = () => {
        downloadArquivo(JSON.stringify(data, null, 2), `relatorio_${dataNome}.json`, 'application/json');
    };

    // Copiar texto — texto legível para clipboard
    const btnCopyTxt = criarBtn('Copiar TXT', 'Copiar relatório em texto legível');
    btnCopyTxt.onclick = () => {
        navigator.clipboard.writeText(formatarTextoLegivel(data))
            .then(() => { btnCopyTxt.textContent = 'Copiado!'; setTimeout(() => { btnCopyTxt.textContent = 'Copiar TXT'; }, 2000); })
            .catch(err => console.error('Erro ao copiar texto', err));
    };

    // Copiar JSON — JSON bruto para clipboard
    const btnCopyJson = criarBtn('Copiar JSON', 'Copiar JSON bruto para a área de transferência');
    btnCopyJson.onclick = () => {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2))
            .then(() => { btnCopyJson.textContent = 'Copiado!'; setTimeout(() => { btnCopyJson.textContent = 'Copiar JSON'; }, 2000); })
            .catch(err => console.error('Erro ao copiar JSON', err));
    };

    // Agrupa para ocupar menos espaço e permitir quebra em até 2 linhas.
    botoesWrap.appendChild(btnTxt);
    botoesWrap.appendChild(btnJson);
    botoesWrap.appendChild(btnCopyTxt);
    botoesWrap.appendChild(btnCopyJson);
    container.insertBefore(botoesWrap, targetBtn.nextSibling);
}