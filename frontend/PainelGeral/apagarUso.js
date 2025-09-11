import {verFetch} from "./ver.js";
import { pegarIdUnico } from "./EditarUso.js";
import { limparImputs } from "./limparImputs.js";

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

async function pegarIdEExcluir() {
    const id = await pegarIdUnico()
    excluirUso(id);

}

document.getElementById('excluirUsoBtn').addEventListener('click', function() {
    pegarIdEExcluir();
    verFetch();
    limparImputs();
});