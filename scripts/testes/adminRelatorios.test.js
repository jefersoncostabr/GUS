import { jest } from '@jest/globals';

const showMessage = jest.fn();

jest.unstable_mockModule('../../frontend/js/admin.js', () => ({ showMessage }));

class FakeElement {
    constructor(id = '') {
        this.id = id;
        this.listeners = new Map();
        this.attributes = {};
        this.children = [];
        this.value = '';
        this.hidden = false;
        this.disabled = false;
        this.textContent = '';
        this.style = {};
    }

    addEventListener(type, callback) {
        const listeners = this.listeners.get(type) || [];
        listeners.push(callback);
        this.listeners.set(type, listeners);
    }

    fire(type) {
        return (this.listeners.get(type) || []).map(callback =>
            callback({ target: this })
        );
    }

    click() {
        if (this.disabled || this.hidden) {
            return undefined;
        }

        return this.fire('click')[0];
    }

    setAttribute(name, value) {
        this.attributes[name] = value;
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    set innerHTML(value) {
        this._innerHTML = value;
        this.children = [];
    }

    get innerHTML() {
        return this._innerHTML || '';
    }
}

class FakeDocument {
    constructor() {
        this.elements = new Map();
        this.listeners = new Map();
        this.reportEvents = [];
    }

    addEventListener(type, callback) {
        const listeners = this.listeners.get(type) || [];
        listeners.push(callback);
        this.listeners.set(type, listeners);
    }

    dispatchEvent(event) {
        if (event.type.startsWith('admin:relatorio:')) {
            this.reportEvents.push(event);
        }

        (this.listeners.get(event.type) || []).forEach(callback => callback(event));
        return true;
    }

    getElementById(id) {
        return this.elements.get(id) || null;
    }

    createElement() {
        return new FakeElement();
    }

    fire(type) {
        (this.listeners.get(type) || []).forEach(callback => callback());
    }

    addElement(id) {
        const element = new FakeElement(id);
        this.elements.set(id, element);
        return element;
    }
}

describe('Interface de relatórios administrativos', () => {
    let document;
    let originalDocument;
    let originalCustomEvent;
    let originalNavigatorDescriptor;
    let originalWindow;
    let relatorios;
    let tipoSelect;
    let professorSelect;
    let containerProfessor;
    let acoes;
    let btnGerar;
    let btnTxt;
    let btnJson;
    let btnCopiar;
    let btnSalvar;
    let visualizacao;

    beforeEach(async () => {
        jest.resetModules();
        showMessage.mockReset();

        originalDocument = globalThis.document;
        originalCustomEvent = globalThis.CustomEvent;
        originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
        originalWindow = globalThis.window;

        document = new FakeDocument();
        globalThis.document = document;
        globalThis.window = {};
        globalThis.CustomEvent = class {
            constructor(type, options = {}) {
                this.type = type;
                this.detail = options.detail;
            }
        };
        Object.defineProperty(globalThis, 'navigator', {
            configurable: true,
            value: { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } }
        });

        document.addElement('toggleRelatoriosBtn');
        const content = document.addElement('relatoriosContent');
        content.style.display = 'none';
        tipoSelect = document.addElement('selRelatorioTipo');
        professorSelect = document.addElement('selRelatorioProf');
        containerProfessor = document.addElement('containerRelatorioProf');
        acoes = document.addElement('relatorioAcoes');
        acoes.hidden = true;
        btnGerar = document.addElement('btnGerarRelatorio');
        btnTxt = document.addElement('btnTxtRelatorio');
        btnTxt.disabled = true;
        btnJson = document.addElement('btnJsonRelatorio');
        btnJson.disabled = true;
        btnCopiar = document.addElement('btnCopiarRelatorio');
        btnCopiar.hidden = true;
        btnSalvar = document.addElement('btnSalvarRelatorio');
        btnSalvar.hidden = true;
        visualizacao = document.addElement('relatorioVisualizacao');
        visualizacao.hidden = true;

        relatorios = await import('../../frontend/js/adminRelatorios.js');
        document.fire('DOMContentLoaded');
    });

    afterEach(() => {
        if (originalDocument === undefined) delete globalThis.document;
        else globalThis.document = originalDocument;

        if (originalCustomEvent === undefined) delete globalThis.CustomEvent;
        else globalThis.CustomEvent = originalCustomEvent;

        if (originalWindow === undefined) delete globalThis.window;
        else globalThis.window = originalWindow;

        if (originalNavigatorDescriptor) {
            Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor);
        } else {
            delete globalThis.navigator;
        }

        jest.restoreAllMocks();
    });

    it('mantém as ações ocultas até escolher um tipo de relatório', () => {
        expect(containerProfessor.hidden).toBe(true);
        expect(acoes.hidden).toBe(true);
        expect(btnGerar.disabled).toBe(true);
        expect(btnTxt.disabled).toBe(true);
        expect(btnJson.disabled).toBe(true);
        expect(btnCopiar.hidden).toBe(true);
        expect(btnSalvar.hidden).toBe(true);
    });

    it.each([
        ['semana', 'admin:relatorio:semana'],
        ['mes', 'admin:relatorio:mes'],
        ['aulas', 'admin:relatorio:aulas'],
        ['professores', 'admin:relatorio:professores']
    ])('dispara o evento correto ao gerar relatório do tipo %s', (tipo, evento) => {
        tipoSelect.value = tipo;
        tipoSelect.fire('change');

        expect(acoes.hidden).toBe(false);
        expect(btnGerar.disabled).toBe(false);

        btnGerar.click();

        expect(document.reportEvents).toHaveLength(1);
        expect(document.reportEvents[0].type).toBe(evento);
        expect(document.reportEvents[0].detail.button).toBe(btnGerar);
        expect(btnGerar.disabled).toBe(true);
        expect(btnGerar.textContent).toBe('Gerando...');
    });

    it('exige um professor antes de exibir as ações e inclui o ID no evento', () => {
        tipoSelect.value = 'professor';
        tipoSelect.fire('change');

        expect(containerProfessor.hidden).toBe(false);
        expect(acoes.hidden).toBe(true);
        expect(btnGerar.disabled).toBe(true);

        professorSelect.value = 'teacher-42';
        professorSelect.fire('change');

        expect(acoes.hidden).toBe(false);
        expect(btnGerar.disabled).toBe(false);

        btnGerar.click();

        expect(document.reportEvents[0].type).toBe('admin:relatorio:professor');
        expect(document.reportEvents[0].detail).toEqual({
            button: btnGerar,
            id: 'teacher-42'
        });
    });

    it('limpa o relatório gerado ao mudar a seleção', () => {
        tipoSelect.value = 'semana';
        tipoSelect.fire('change');
        relatorios.showExportButtons([{ solicitante: 'Ana' }]);
        btnTxt.click();

        expect(btnCopiar.hidden).toBe(false);
        expect(btnSalvar.hidden).toBe(false);

        tipoSelect.value = 'mes';
        tipoSelect.fire('change');

        expect(btnTxt.disabled).toBe(true);
        expect(btnJson.disabled).toBe(true);
        expect(btnCopiar.hidden).toBe(true);
        expect(btnSalvar.hidden).toBe(true);
        expect(visualizacao.hidden).toBe(true);
        expect(visualizacao.textContent).toBe('');
    });

    it('mostra TXT e oculta ações secundárias até exibir o conteúdo', () => {
        const dados = [{ solicitante: 'Ana', total: 3, __v: 0 }];

        relatorios.showExportButtons(dados);

        expect(btnTxt.disabled).toBe(false);
        expect(btnJson.disabled).toBe(false);
        expect(btnCopiar.hidden).toBe(true);
        expect(btnSalvar.hidden).toBe(true);

        btnTxt.click();

        expect(visualizacao.hidden).toBe(false);
        expect(visualizacao.textContent).toContain('solicitante: Ana');
        expect(visualizacao.textContent).toContain('Total de registros: 1');
        expect(visualizacao.textContent).not.toContain('__v');
        expect(btnTxt.textContent).toBe('Ocultar');
        expect(btnTxt.attributes['aria-expanded']).toBe('true');
        expect(btnCopiar.hidden).toBe(false);
        expect(btnSalvar.hidden).toBe(false);

        btnTxt.click();

        expect(visualizacao.hidden).toBe(true);
        expect(btnTxt.textContent).toBe('TXT');
        expect(btnTxt.attributes['aria-expanded']).toBe('false');
        expect(btnCopiar.hidden).toBe(true);
        expect(btnSalvar.hidden).toBe(true);
    });

    it('exibe JSON formatado e troca diretamente entre os formatos', () => {
        const dados = [{ solicitante: 'Ana', detalhes: { total: 3 } }];
        relatorios.showExportButtons(dados);

        btnJson.click();

        expect(visualizacao.textContent).toBe(JSON.stringify(dados, null, 2));
        expect(btnJson.textContent).toBe('Ocultar');
        expect(btnCopiar.hidden).toBe(false);
        expect(btnSalvar.hidden).toBe(false);

        btnTxt.click();

        expect(visualizacao.textContent).toContain('solicitante: Ana');
        expect(btnTxt.textContent).toBe('Ocultar');
        expect(btnJson.textContent).toBe('JSON');
    });

    it('copia o formato que está sendo exibido', async () => {
        const dados = [{ solicitante: 'Ana' }];
        relatorios.showExportButtons(dados);
        btnJson.click();

        await btnCopiar.click();

        const copiedText = globalThis.navigator.clipboard.writeText.mock.calls[0][0];
        expect(copiedText).toBe(JSON.stringify(dados, null, 2));
        expect(showMessage).toHaveBeenCalledWith('Relatório copiado.', 'success');
    });

    it('informa falha ao copiar sem esconder o erro no console', async () => {
        const error = new Error('clipboard indisponível');
        globalThis.navigator.clipboard.writeText.mockRejectedValue(error);
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        relatorios.showExportButtons([{ solicitante: 'Ana' }]);
        btnTxt.click();

        await btnCopiar.click();

        expect(consoleError).toHaveBeenCalledWith('Erro ao copiar relatório:', error);
        expect(showMessage).toHaveBeenCalledWith(
            'Não foi possível copiar o relatório.',
            'error'
        );
    });

    it('salva o formato visível usando o seletor de destino do navegador', async () => {
        const dados = [{ solicitante: 'Ana' }];
        const gravador = {
            write: jest.fn().mockResolvedValue(undefined),
            close: jest.fn().mockResolvedValue(undefined)
        };
        const arquivo = {
            createWritable: jest.fn().mockResolvedValue(gravador)
        };
        globalThis.window.showSaveFilePicker = jest.fn().mockResolvedValue(arquivo);
        relatorios.showExportButtons(dados);
        btnJson.click();

        await btnSalvar.click();

        expect(globalThis.window.showSaveFilePicker).toHaveBeenCalledWith(
            expect.objectContaining({
                suggestedName: expect.stringMatching(/^relatorio_.*\.json$/),
                types: [{
                    description: 'Arquivo JSON',
                    accept: { 'application/json': ['.json'] }
                }]
            })
        );
        expect(gravador.write).toHaveBeenCalledWith(JSON.stringify(dados, null, 2));
        expect(gravador.close).toHaveBeenCalled();
        expect(showMessage).toHaveBeenCalledWith('Relatório salvo.', 'success');
    });

    it('informa quando o navegador não oferece seletor de destino', async () => {
        relatorios.showExportButtons([{ solicitante: 'Ana' }]);
        btnTxt.click();

        await btnSalvar.click();

        expect(showMessage).toHaveBeenCalledWith(
            expect.stringContaining('não permite escolher o destino'),
            'error'
        );
    });

    it('preenche o seletor de professores usando os campos disponíveis', () => {
        relatorios.setRelatorioProfessoresOptions([
            { _id: 'teacher-1', solicitante: 'Ana' },
            { id: 'teacher-2', nome: 'Bia' }
        ]);

        expect(professorSelect.children.map(option => [option.value, option.textContent]))
            .toEqual([
                ['teacher-1', 'Ana'],
                ['teacher-2', 'Bia']
            ]);
        expect(professorSelect.innerHTML).toContain('Selecione o professor');
    });
});
