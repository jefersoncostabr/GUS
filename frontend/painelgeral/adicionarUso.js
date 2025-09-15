import { verFetch } from ".ver.js";

function getBaseUrl() {
    return window.location.hostname === "localhost"
        ? "http://localhost:3000"
        : "https://gus-q7nn.onrender.com";
}

    // const baseUrl = getBaseUrl();
    //     const response = await fetch(`${baseUrl}/usos/usos/${id}`, {


async function adicionarUso() {
    const solicitante = document.getElementById('solicitante').value;
    const sala = document.getElementById('sala').value;
    const dia = document.getElementById('dia').value;
    const hora = document.getElementById('hora').value;
    const motivo = document.getElementById('motivo').value;
    
    const novoUso = {
        solicitante: solicitante,
        sala: sala,
        dia: dia,
        // diaDaSemana: diaSemana,
        hora: hora,
        motivo: motivo
    };
    try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/usos/usos`, {       
        // const response = await fetch('http://localhost:3000/usos/usos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
        },
        body: JSON.stringify(novoUso),
    });

    // Verifique se a resposta foi bem-sucedida
    if (!response.ok) {
        throw new Error(`Erro ao adicionar novo uso: ${response.status}`);
    }
        // Obtenha os dados da resposta
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error(`Erro ao adicionar novo uso: ${error.message}`);
    }
}

document.getElementById('adicionarUsoBtn').addEventListener('click', adicionarUso);

// ao clicar em enter no campo motivo ele aciona o adicionar uso
document.getElementById('motivo').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Evita o comportamento padrão do Enter
        adicionarUso(); // Chama a função para adicionar o uso
        verFetch();
        limparImputs();
    }
});