import { limparImputs } from "./limparImputs.js";
import { verFetch } from "./ver.js";   

function getBaseUrl() {
    return window.location.hostname === "localhost"
        ? "http://localhost:3000"
        : "https://gus-q7nn.onrender.com";
}

async function alterarUso(id) {
    try {
    const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/usos/usos/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            solicitante: document.getElementById('solicitante').value,
            sala: document.getElementById('sala').value,
            dia: document.getElementById('dia').value,
            hora: document.getElementById('hora').value,
            motivo: document.getElementById('motivo').value
        })
    });

    if (!response.ok) {
        throw new Error(`Erro ao alterar uso: ${response.status}`);
    }
        const data = await response.json();
        console.log(data);
    } catch (error) {
        document.getElementById('painelSaida').innerText = 'Negado';
        setTimeout(() => {
            document.getElementById('painelSaida').innerText = '';
        }, 3000);
        console.error(`Erro ao alterar uso: ${error.message}`);
    }
}

export async function pegarIdUnico() {
    // Tenta pegar o valor do input com id="id"
    const inputId = document.getElementById('id');
    if (inputId && inputId.value) {
        console.log(inputId.value);
        return inputId.value;
    }
    try {
        const obj = await verFetch();
    if (obj !== undefined) {
        console.log(obj[0]._id);
        return obj[0]._id;

    } else {
        console.log('obj é undefined');
    }
    } catch (error) {
        console.error(error);
    }
}

async function pegarIdEAlterar() {
    const id = await pegarIdUnico();
    await alterarUso(id);
    limparImputs();
}

document.getElementById('alterarReservaBtn').addEventListener('click', function() {
    pegarIdEAlterar();
    verFetch();
});

// Naõ consigo alterar o nome