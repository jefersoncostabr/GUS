import {criaTabela} from "./tabela.js";
import {getDados} from "./tabela.js";
import {voltarPaginacao, avancarPaginacao} from "./tabela.js";


function limparTabela() {
    // Limpa a tabela anterior
    document.getElementById('containerTabela').innerHTML = '';
}


function criarElementospaginacaoTab() {
    var containerTabBotoes = document.createElement('div');
    containerTabBotoes.className = 'containerTabBotoes';
    containerTabBotoes.style.margin = '10px 0 0 0';
    containerTabBotoes.id = 'containerTabBotoes';

    var btnVoltarTab = document.createElement('button');
    btnVoltarTab.className = 'btnVoltarTab';
    btnVoltarTab.id = 'btnVoltarTab';
    btnVoltarTab.textContent = 'Voltar';
    btnVoltarTab.style.marginRight = '10px';  
    btnVoltarTab.addEventListener('click', voltarPaginacao);


    var btnAvancarTab = document.createElement('button');
    btnAvancarTab.className = 'btnAvancarTab';
    btnAvancarTab.id = 'btnAvancarTab';
    btnAvancarTab.textContent = 'Avançar';
    btnAvancarTab.addEventListener('click', avancarPaginacao);   

    containerTabBotoes.appendChild(btnVoltarTab);
    containerTabBotoes.appendChild(btnAvancarTab);

    var containerTabela = document.getElementById('containerTabela');
    containerTabela.appendChild(containerTabBotoes);
}

export async function verFetch(params) {
    // console.log('verFetch chamado');
    document.getElementById('containerTabela').style.display = 'block';

    const inputValues = {
        solicitante: document.getElementById('solicitante').value,
        sala: document.getElementById('sala').value,
        dia: document.getElementById('dia').value,
        hora: document.getElementById('hora').value,
        motivo: document.getElementById('motivo').value,
    };

    const filteredDadosGeral = await getDados().then((dadosGeral) => {
        // Filtra os dados com base nos valores de input do usuário
        const filteredData = dadosGeral.filter((dado) => {
            let filtrado = true; // Inicializa a variável de filtragem como true

            // Itera sobre as chaves do objeto inputValues
            Object.keys(inputValues).forEach((key) => {
                // Verifica se o valor da chave não está vazio e se a chave não é 'diaSemana'
                if (inputValues[key] !== '') {
                    // Verifica se o valor da chave existe no objeto dado
                    if (dado[key] !== undefined) {
                        // Verifica se a chave é 'dia', 'hora' ou 'sala' e compara como número inteiro
                        if (key === 'dia' || key === 'hora' || key === 'sala') {
                            filtrado = filtrado && dado[key] === parseInt(inputValues[key]);
                        } else {
                            // Compara como string
                            filtrado = filtrado && dado[key] === inputValues[key];
                        }
                    } else {
                        // Se o valor da chave não existe, define a variável de filtragem como false
                        filtrado = false;
                    }
                }
            });
            // Retorna a variável de filtragem
            return filtrado;
        });
        // Retorna os dados filtrados
        return filteredData;
    });
    // console.log(filteredDadosGeral);
    limparTabela();
    criaTabela(filteredDadosGeral);
    criarElementospaginacaoTab();
    // renderTabelaComPaginacao(filteredDadosGeral);
    return filteredDadosGeral; // Retorna o primeiro objeto do array filtrado
}

document.getElementById('getUsosBtn').addEventListener('click', verFetch);