import {criaTabela} from "./tabela.js";
import {getDados} from "./tabela.js";

async function excluirUso(id) {
    try {
    const response = await fetch(`http://localhost:3000/usos/usos/${id}`, {
        method: 'DELETE',
        headers: {
        'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Erro ao excluir uso: ${response.status}`);
    }

    const data = await response.json();
    console.log(data);
    } catch (error) {
        console.error(`Erro ao excluir uso: ${error.message}`);
    }
}


async function buscarId(dados, campos) {
    console.log(buscarId);
    // console.log('Campos:', campos);
    // console.log('Dados:', dados);
    const resultado = dados.find((dado) => {
        console.log('Dado:', dado);
        return Object.keys(campos).every((chave) => {
            console.log('Chave:', chave);
            console.log('Valor do campo:', campos[chave]);
            console.log('Valor do dado:', dado[chave]);
            return dado[chave] === campos[chave];
        });
    });
    console.log(resultado);
    return resultado;
}

function pegarCampos() {
    const camposVar = {
        solicitante: document.getElementById('solicitante').value,
        sala: document.getElementById('sala').value,
        dia: document.getElementById('dia').value,
        diaSemana: document.getElementById('diaSemana').value,
        hora: document.getElementById('hora').value,
        motivo: document.getElementById('motivo').value,
    };
    return camposVar;
}

async function getId() {
    console.log("clicou em getId");
    const campos = pegarCampos();
    try {
        const dados = await getDados();
        const resultado = await buscarId(dados, campos);
        if (resultado) { // Verifica se o resultado não é undefined
            console.log(`ID localizado: ${resultado.id}`);
            return resultado.id;
        } else {
            console.log("Nenhum resultado encontrado");
            return null;
        }
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        return null;
    }
}

document.getElementById('excluirUsoBtn').addEventListener('click', getId);