const dados = [
  { solicitante: 'João Silva', sala: 'Sala 1', dia: 'Segunda-feira', diaDaSemana: 'Segunda', hora: '08:00', motivo: 'Reunião' },
  { solicitante: 'Maria Oliveira', sala: 'Sala 2', dia: 'Terça-feira', diaDaSemana: 'Terça', hora: '10:00', motivo: 'Treinamento' },
  { solicitante: 'Pedro Sousa', sala: 'Sala 3', dia: 'Quarta-feira', diaDaSemana: 'Quarta', hora: '14:00', motivo: 'Reunião' },
  // ...
];

const containerTabela = document.getElementById('containerTabela');

// Criar tabela HTML
const tabela = document.createElement('table');
// tabela.style.border = '1px solid black';
tabela.style.width = '100%';

// Criar cabeçalho da tabela
const cabecalho = tabela.createTHead();
const linhaCabecalho = cabecalho.insertRow();
['Solicitante', 'Sala', 'Dia', 'Dia da semana', 'Hora', 'Motivo'].forEach((coluna) => {
    const celula = linhaCabecalho.insertCell();
    celula.textContent = coluna;
    celula.style.fontWeight = 'bold';
});

// Criar linhas da tabela
dados.forEach((dado) => {
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