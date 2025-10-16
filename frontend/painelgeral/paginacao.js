import { criaTabela, getDados } from "./tabela.js";

export let currentPage = 1;
export const itensPorPagina = 10;

// lista - array com todos os itens
// elementosPorPagina - número de itens por página definido

export function paginar(lista) {
    const elementosPorPagina = itensPorPagina;
    const paginas = [];// onde ficará a lista nova
    for (let i = 0; i < lista.length; i += elementosPorPagina) {
        // adiciona uma fatia da lista original à nova lista
        paginas.push(lista.slice(i, i + elementosPorPagina));
    }

    return paginas;
}

