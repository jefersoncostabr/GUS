import { verFetch } from "./ver.js";
import { pegarIdUnico } from "./editarUso.js";
import { limparImputs } from "./limparImputs.js";

function getBaseUrl() {
    return window.location.hostname === "localhost"
        ? "http://localhost:3000"
        : "https://gus-q7nn.onrender.com";
}

async function excluirUso(id) {
    try {
    const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/usos/usos/${id}`, {
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

async function pegarIdEExcluir() {
    const id = await pegarIdUnico()
    excluirUso(id);

}

document.getElementById('excluirUsoBtn').addEventListener('click', function() {
    pegarIdEExcluir();
    verFetch();
    limparImputs();
});