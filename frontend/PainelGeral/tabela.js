// Pega todos os dados sem filtro
export async function getDados() {
  try {
    const response = await fetch('http://localhost:3000/usos/usos');
    const data = await response.json();
    const dataArray = Object.values(data);
    console.log(`Lista de todos os usos Registrados:\n`, dataArray);
    return dataArray;
  } catch (error) {
    console.error('Erro:', error);
  }
}

// Cria a tabela c dados
export function criaTabela(informacao){
    const containerTabela = document.getElementById('containerTabela');

    // Criar tabela HTML
    const tabela = document.createElement('table');

    // Criar cabeçalho da tabela
    const cabecalho = tabela.createTHead();
    const linhaCabecalho = cabecalho.insertRow();
    ['Solicitante', 'Sala', 'Dia', 'Dia da semana', 'Hora', 'Motivo'].forEach((coluna) => {
        const celula = linhaCabecalho.insertCell();
        celula.textContent = coluna;
        celula.style.fontWeight = 'bold';
    });

    // Criar linhas da tabela
    informacao.forEach((dado) => {
        const linha = tabela.insertRow();
        linha.insertCell().textContent = dado.solicitante;
        linha.insertCell().textContent = dado.sala;
        linha.insertCell().textContent = dado.dia;
        linha.insertCell().textContent = dado.diaDaSemana;
        linha.insertCell().textContent = dado.hora;
        linha.insertCell().textContent = dado.motivo;
    });

    // Adicionar tabela ao documento
    containerTabela.appendChild(tabela);
}

// let dadosGeral = await getDados();
// criaTabela(dadosGeral);