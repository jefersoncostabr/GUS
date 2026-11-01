import { showMessage } from './admin.js';

let relatorioAtual = null;
let formatoAtual = null;
let conteudoAtual = '';

const eventosPorTipo = {
    semana: 'admin:relatorio:semana',
    mes: 'admin:relatorio:mes',
    professor: 'admin:relatorio:professor',
    aulas: 'admin:relatorio:aulas',
    professores: 'admin:relatorio:professores'
};

document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggleRelatoriosBtn');
    const contentDiv = document.getElementById('relatoriosContent');
    const tipoSelect = document.getElementById('selRelatorioTipo');
    const containerProf = document.getElementById('containerRelatorioProf');
    const professorSelect = document.getElementById('selRelatorioProf');
    const acoes = document.getElementById('relatorioAcoes');
    const btnGerar = document.getElementById('btnGerarRelatorio');
    const btnTxt = document.getElementById('btnTxtRelatorio');
    const btnJson = document.getElementById('btnJsonRelatorio');
    const btnCopiar = document.getElementById('btnCopiarRelatorio');
    const btnSalvar = document.getElementById('btnSalvarRelatorio');
    const visualizacao = document.getElementById('relatorioVisualizacao');

    if (toggleBtn && contentDiv) {
        toggleBtn.addEventListener('click', () => {
            const estaFechado = contentDiv.style.display === 'none';
            contentDiv.style.display = estaFechado ? 'block' : 'none';
            toggleBtn.setAttribute('aria-expanded', String(estaFechado));
            toggleBtn.setAttribute(
                'aria-label',
                `${estaFechado ? 'Recolher' : 'Expandir'} Relatórios`
            );
        });
    }

    function limparResultado() {
        relatorioAtual = null;
        formatoAtual = null;
        conteudoAtual = '';
        btnTxt.disabled = true;
        btnJson.disabled = true;
        btnTxt.textContent = 'TXT';
        btnJson.textContent = 'JSON';
        btnTxt.setAttribute('aria-expanded', 'false');
        btnJson.setAttribute('aria-expanded', 'false');
        btnCopiar.hidden = true;
        btnSalvar.hidden = true;
        visualizacao.textContent = '';
        visualizacao.hidden = true;
    }

    function atualizarFormulario() {
        const tipo = tipoSelect.value;
        const precisaProfessor = tipo === 'professor';

        containerProf.hidden = !precisaProfessor;

        if (!precisaProfessor) {
            professorSelect.value = '';
        }

        const selecaoValida =
            Boolean(tipo) &&
            (!precisaProfessor || Boolean(professorSelect.value));

        acoes.hidden = !selecaoValida;
        btnGerar.disabled = !selecaoValida;
    }

    tipoSelect.addEventListener('change', () => {
        limparResultado();
        atualizarFormulario();
    });

    professorSelect.addEventListener('change', () => {
        limparResultado();
        atualizarFormulario();
    });

    btnGerar.addEventListener('click', () => {
        const tipo = tipoSelect.value;
        const evento = eventosPorTipo[tipo];

        if (!evento) {
            showMessage('Selecione um tipo de relatório.', 'error');
            return;
        }

        const idProfessor = professorSelect.value;

        if (tipo === 'professor' && !idProfessor) {
            showMessage('Selecione um professor.', 'error');
            return;
        }

        limparResultado();
        btnGerar.disabled = true;
        btnGerar.textContent = 'Gerando...';

        const detail = { button: btnGerar };

        if (tipo === 'professor') {
            detail.id = idProfessor;
        }

        document.dispatchEvent(new CustomEvent(evento, { detail }));
    });

    function alternarVisualizacao(formato) {
        if (relatorioAtual === null) {
            return;
        }

        const mesmoFormatoAberto =
            !visualizacao.hidden && formatoAtual === formato;

        if (mesmoFormatoAberto) {
            formatoAtual = null;
            conteudoAtual = '';
            visualizacao.hidden = true;
            btnCopiar.hidden = true;
            btnSalvar.hidden = true;
        } else {
            formatoAtual = formato;
            conteudoAtual = formato === 'json'
                ? JSON.stringify(relatorioAtual, null, 2)
                : formatarTextoLegivel(relatorioAtual);
            visualizacao.textContent = conteudoAtual;
            visualizacao.hidden = false;
            btnCopiar.hidden = false;
            btnSalvar.hidden = false;
        }

        btnTxt.textContent = formatoAtual === 'txt' ? 'Ocultar' : 'TXT';
        btnJson.textContent = formatoAtual === 'json' ? 'Ocultar' : 'JSON';
        btnTxt.setAttribute('aria-expanded', String(formatoAtual === 'txt'));
        btnJson.setAttribute('aria-expanded', String(formatoAtual === 'json'));
    }

    btnTxt.addEventListener('click', () => {
        alternarVisualizacao('txt');
    });

    btnJson.addEventListener('click', () => {
        alternarVisualizacao('json');
    });

    btnCopiar.addEventListener('click', async () => {
        if (visualizacao.hidden || !conteudoAtual) {
            return;
        }

        try {
            await navigator.clipboard.writeText(conteudoAtual);
            showMessage('Relatório copiado.', 'success');
        } catch (error) {
            console.error('Erro ao copiar relatório:', error);
            showMessage('Não foi possível copiar o relatório.', 'error');
        }
    });

    btnSalvar.addEventListener('click', async () => {
        if (visualizacao.hidden || !conteudoAtual) {
            return;
        }

        if (typeof window.showSaveFilePicker !== 'function') {
            showMessage(
                'Seu navegador não permite escolher o destino do arquivo. Use Chrome ou Edge atualizado.',
                'error'
            );
            return;
        }

        const extensao = formatoAtual === 'json' ? 'json' : 'txt';
        const mimeType = formatoAtual === 'json'
            ? 'application/json'
            : 'text/plain';

        try {
            const arquivo = await window.showSaveFilePicker({
                suggestedName: `relatorio_${new Date().toISOString().slice(0, 10)}.${extensao}`,
                types: [{
                    description: formatoAtual === 'json'
                        ? 'Arquivo JSON'
                        : 'Arquivo de texto',
                    accept: {
                        [mimeType]: [`.${extensao}`]
                    }
                }]
            });

            const gravador = await arquivo.createWritable();
            await gravador.write(conteudoAtual);
            await gravador.close();
            showMessage('Relatório salvo.', 'success');
        } catch (error) {
            if (error.name === 'AbortError') {
                return;
            }

            console.error('Erro ao salvar relatório:', error);
            showMessage('Não foi possível salvar o relatório.', 'error');
        }
    });

    atualizarFormulario();
});

export function setRelatorioProfessoresOptions(users = []) {
    const select = document.getElementById('selRelatorioProf');

    if (!select) {
        return;
    }

    select.innerHTML = '<option value="">-- Selecione o professor --</option>';

    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user._id || user.id || '';
        option.textContent = user.solicitante || user.nome || '--';
        select.appendChild(option);
    });
}

function formatarTextoLegivel(data) {
    const dataHora = new Date().toLocaleString('pt-BR');
    const linhas = [
        '=== RELATÓRIO GUS ===',
        `Gerado em: ${dataHora}`,
        ''
    ];

    const itens = Array.isArray(data) ? data : [data];

    itens.forEach((item, indice) => {
        linhas.push(`--- Registro ${indice + 1} ---`);

        if (item && typeof item === 'object') {
            Object.entries(item).forEach(([chave, valor]) => {
                if (chave === '__v') {
                    return;
                }

                let valorFormatado;

                if (valor === null || valor === undefined) {
                    valorFormatado = '-';
                } else if (Array.isArray(valor)) {
                    valorFormatado = valor.length === 0
                        ? '-'
                        : valor.map(valorItem =>
                            typeof valorItem === 'object'
                                ? JSON.stringify(valorItem)
                                : String(valorItem)
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

export function showExportButtons(data) {
    relatorioAtual = data;

    const btnTxt = document.getElementById('btnTxtRelatorio');
    const btnJson = document.getElementById('btnJsonRelatorio');
    const btnCopiar = document.getElementById('btnCopiarRelatorio');
    const btnSalvar = document.getElementById('btnSalvarRelatorio');
    const visualizacao = document.getElementById('relatorioVisualizacao');

    if (!btnTxt || !btnJson || !btnCopiar || !btnSalvar || !visualizacao) {
        return;
    }

    formatoAtual = null;
    conteudoAtual = '';
    btnTxt.disabled = false;
    btnJson.disabled = false;
    btnTxt.textContent = 'TXT';
    btnJson.textContent = 'JSON';
    btnTxt.setAttribute('aria-expanded', 'false');
    btnJson.setAttribute('aria-expanded', 'false');
    btnCopiar.hidden = true;
    btnSalvar.hidden = true;
    visualizacao.textContent = '';
    visualizacao.hidden = true;
}