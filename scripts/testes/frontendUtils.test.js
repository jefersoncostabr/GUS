import { jest } from '@jest/globals';
import { normalizarAulaParaUso, normalizarListaAulas } from '../../frontend/js/normalizador.js';
import { normalizarSalaValor, tratarDados } from '../../frontend/js/tratamentoDeDados.js';

describe('Normalização de dados do frontend', () => {
    it('preserva identificadores compostos de sala e trata valores vazios', () => {
        expect(normalizarSalaValor(' studio-a|5 ')).toBe('studio-a|5');
        expect(normalizarSalaValor(5)).toBe('5');
        expect(normalizarSalaValor(null)).toBe('');
        expect(normalizarSalaValor('  ')).toBe('');
    });

    it('normaliza dados de uso, acentos e horários sem perder a sala composta', () => {
        expect(tratarDados({
            solicitante: ' Ána 123 Silva! ',
            sala: 'studio-a:5',
            dia: '2026-02-03',
            hora: '1430',
            motivo: 'reunião'
        })).toEqual({
            solicitante: 'Ána  Silva',
            sala: 'studio-a:5',
            dia: '03/02/26',
            hora: '14:30',
            motivo: 'Reunião'
        });
    });

    it.each([
        ['9', '09:00'],
        ['1444', '14:30'],
        ['1445', '14:00'],
        ['2500', '23:00']
    ])('normaliza horário %s para %s', (input, expected) => {
        expect(tratarDados({ hora: input }).hora).toBe(expected);
    });

    it('limpa motivo não permitido e limita dia manual a 31', () => {
        const data = tratarDados({
            solicitante: 'Ana',
            sala: 2,
            dia: '45',
            hora: '',
            motivo: 'Outro'
        });

        expect(data.dia).toMatch(/^31\/\d{2}\/\d{2}$/);
        expect(data.motivo).toBe('');
    });

    it('mapeia aula regular para a estrutura exibida como uso', () => {
        const aula = {
            _id: 'lesson-id',
            professor: { _id: 'teacher-id', solicitante: 'Ana' },
            estudioNome: 'Studio A',
            estudioId: 'studio-id',
            sala: 3,
            diaSemana: 'segunda',
            horaInicio: '09:00',
            modalidade: 'Ballet'
        };

        expect(normalizarAulaParaUso(aula)).toEqual({
            _id: 'lesson-id',
            solicitante: { solicitante: 'Ana', _id: 'teacher-id' },
            estudioNome: 'Studio A',
            estudioId: 'studio-id',
            sala: 3,
            dia: 'segunda',
            hora: '09:00',
            motivo: 'Ballet',
            isAulaFixa: true
        });
        expect(normalizarListaAulas([aula])).toEqual([normalizarAulaParaUso(aula)]);
    });
});

describe('Paginação da interface', () => {
    let pagination;
    let elements;
    let container;
    let originalDocument;
    let originalWindow;

    beforeEach(async () => {
        jest.resetModules();
        originalDocument = globalThis.document;
        originalWindow = globalThis.window;
        elements = new Map();
        container = {
            children: [],
            appendChild(element) {
                this.children.push(element);
                elements.set(element.id, element);
            }
        };

        globalThis.document = {
            getElementById: (id) => elements.get(id) || (id === 'containerPaginacao' ? container : null),
            createElement: (tag) => ({
                tagName: tag,
                style: {},
                attributes: {},
                children: [],
                addEventListener(type, callback) {
                    this[`on${type}`] = callback;
                },
                appendChild(element) {
                    this.children.push(element);
                    if (element.id) elements.set(element.id, element);
                },
                setAttribute(name, value) {
                    this.attributes[name] = value;
                },
                remove() {
                    elements.delete(this.id);
                }
            })
        };
        globalThis.window = {
            innerWidth: 1024,
            addEventListener: jest.fn()
        };

        pagination = await import('../../frontend/js/paginacao.js');
    });

    afterEach(() => {
        if (originalDocument === undefined) delete globalThis.document;
        else globalThis.document = originalDocument;
        if (originalWindow === undefined) delete globalThis.window;
        else globalThis.window = originalWindow;
    });

    it('limita estado da página e atualiza controles DOM', () => {
        pagination.setTotalPages(3);
        pagination.setPage(2);
        pagination.criarElementospaginacaoTab();

        expect(pagination.currentPage).toBe(2);
        expect(elements.get('paginaInfo').textContent).toBe('Página 2 / 3');
        expect(elements.get('btnVoltarTab').disabled).toBe(false);
        expect(elements.get('btnAvancarTab').disabled).toBe(false);

        pagination.setPage(99);
        expect(pagination.currentPage).toBe(3);
        expect(elements.get('paginaInfo').textContent).toBe('Página 3 / 3');
        expect(elements.get('btnAvancarTab').attributes['aria-disabled']).toBe('true');

        pagination.setTotalPages(0);
        expect(pagination.totalPages).toBe(1);
        expect(pagination.currentPage).toBe(1);
    });

    it('navega páginas e chama callback apenas quando a página muda', async () => {
        const onPageChange = jest.fn();
        pagination.setTotalPages(2);
        pagination.setOnPageChange(onPageChange);

        await pagination.voltarPaginacao();
        expect(onPageChange).not.toHaveBeenCalled();

        await pagination.avancarPaginacao();
        expect(pagination.currentPage).toBe(2);
        expect(onPageChange).toHaveBeenCalledTimes(1);

        await pagination.avancarPaginacao();
        expect(onPageChange).toHaveBeenCalledTimes(1);
    });

    it('mostra texto compacto e rótulos acessíveis em tela estreita', () => {
        globalThis.window.innerWidth = 390;
        pagination.setTotalPages(2);
        pagination.criarElementospaginacaoTab();

        expect(elements.get('paginaInfo').textContent).toBe('1/2');
        expect(elements.get('btnVoltarTab').textContent).toBe('◄');
        expect(elements.get('btnAvancarTab').textContent).toBe('►');
        expect(elements.get('btnVoltarTab').attributes['aria-disabled']).toBe('true');
    });
});
