import {paginar} from './paginacao.js';
import { verFetch } from './ver.js';
import { itensPorPagina } from './paginacao.js';

document.getElementById('containerTabela').style.display = 'none';

// Pega todos os dados sem filtro
export async function getDados() {
    try {
        // const response = await fetch('http://localhost:3000/usos/usos' || 'https://gus-q7nn.onrender.com/usos/usos');
        const baseUrl = window.location.hostname === "localhost"
            ? "http://localhost:3000"
            : "https://gus-q7nn.onrender.com";
        const response = await fetch(`${baseUrl}/usos/usos`);
        const data = await response.json();
        const dataArray = Object.values(data);
     
        return Array.isArray(dataArray) ? dataArray : [];
    } catch (error) {
        console.error('Erro:', error);
    }
}

// Função para preencher os inputs do formulário
function preencherInputs(dados) {
  const formulario = document.querySelector('.formularioContainer');
  const campos = ['solicitante', 'sala', 'dia', 'hora', 'motivo', '_id'];

  formulario.querySelectorAll('input').forEach((input, index) => {
    input.value = dados[campos[index]];
  });
}

// Função para atribuir click ao elemento
function atribuirClick(celula, dados) {
  celula.addEventListener('click', () => {
    preencherInputs(dados);
  });
}

function renderTabelaComPaginacao(data) {
    // console.log('renderTabelaComPaginacao chamado');
    // console.log(data);
    const containerTabela = document.getElementById('containerTabela');

    // Criar tabela HTML
    const tabela = document.createElement('table');

    // Criar cabeçalho da tabela
    const cabecalho = tabela.createTHead();
    const linhaCabecalho = cabecalho.insertRow();
    ['Solicitante', 'Sala', 'Dia', 'Hora', 'Motivo'].forEach((coluna) => {
        const celula = linhaCabecalho.insertCell();
        celula.textContent = coluna;
        // celula.style.fontWeight = 'bold';
    });

    // Criar linhas da tabela
    data.forEach((dado) => {
        const linha = tabela.insertRow();
        const celulaSolicitante = linha.insertCell();
        celulaSolicitante.textContent = dado.solicitante;
        atribuirClick(celulaSolicitante, dado);

        linha.insertCell().textContent = dado.sala;
        linha.insertCell().textContent = dado.dia;
        linha.insertCell().textContent = dado.hora;
        linha.insertCell().textContent = dado.motivo;
    });

    // Adicionar tabela ao documento
    containerTabela.appendChild(tabela);
}

let paginaAtual = 0;

// Refatorar
export async function voltarPaginacao() {
    // Criado no ver.js criar elementosPaginacaoTab
    if (paginaAtual > 0) { // se tiver na segunda página ele podde voltar
        paginaAtual--;
        verFetch();
    }
}

// Refatorar
export async function avancarPaginacao() {
    // Criado no ver.js criar elementosPaginacaoTab
    const lengthDados = await getDados().then((dados) => dados.length);
    if (paginaAtual < lengthDados / itensPorPagina - 1) {
        paginaAtual ++
        verFetch();
    }
}

// Cria a tabela c dados
export function criaTabela(data) {
    const paginatedData = paginar(data);
  
    //Container para exibir a tabela
    const containerTabela = document.getElementById('containerTabela');
    
    // Limpar o container antes de renderizar a tabela
    containerTabela.innerHTML = '';

    // Chamar a função para criar a tabela com os dados paginados
    renderTabelaComPaginacao(paginatedData[paginaAtual]);
}