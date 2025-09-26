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
        // console.log(`Lista de todos os usos Registrados:\n`, dataArray);
        
        // forma antiga que funcionada no local
        // return dataArray;
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

// Cria a tabela c dados
export function criaTabela(informacao) {
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
    informacao.forEach((dado) => {
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