async function alterarUso(id) {
    try {
    const response = await fetch(`http://localhost:3000/usos/usos/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            solicitante: document.getElementById('solicitante').value,
            sala: document.getElementById('sala').value,
            dia: document.getElementById('dia').value,
            diaDaSemana: document.getElementById('diaSemana').value,
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

// testar esta rota

document.getElementById('alterarReservaBtn').addEventListener('click', function() {
    alterarUso(id)
});