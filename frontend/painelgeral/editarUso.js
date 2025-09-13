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
        console.error(`Erro ao alterar uso: ${error.message}`);
    }
}

export async function pegarIdUnico() {
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
}

document.getElementById('alterarReservaBtn').addEventListener('click', function() {
    pegarIdEAlterar();
    verFetch();
    limparImputs();
});

// Naõ consigo alterar o nome