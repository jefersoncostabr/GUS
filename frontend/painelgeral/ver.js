import {criaTabela} from "./tabela.js";
import {getDados} from "./tabela.js";

function limparTabela() {
    // Limpa a tabela anterior
    document.getElementById('containerTabela').innerHTML = '';
}

// function aparecerTabela() {
//     document.getElementById('containerTabela').style.display = 'block';
//     document.getElementById('esconderTabelaBtn').style.display = 'block';
// }
// function desaparecerTabela() {
//     document.getElementById('containerTabela').style.display = 'none';
// }

// document.getElementById('esconderTabelaBtn').addEventListener('click', desaparecerTabela);

export async function verFetch(params) {
    const inputValues = {
        solicitante: document.getElementById('solicitante').value,
        sala: document.getElementById('sala').value,
        dia: document.getElementById('dia').value,
        hora: document.getElementById('hora').value,
        motivo: document.getElementById('motivo').value,
    };

    // aparecerTabela();    

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
    return filteredDadosGeral; // Retorna o primeiro objeto do array filtrado
}

document.getElementById('getUsosBtn').addEventListener('click', verFetch);