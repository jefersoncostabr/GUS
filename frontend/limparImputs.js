async function preencherSolicitante () {
    // console.log('preencherSolicitante chamado');
    const inputSolicitante = document.getElementById('solicitante');
    const solicitanteSessao = await fetch('/solicitantes/usersess').then(res => res.json()).then(data => data.solicitante);
    // console.log('Dados da sessão:', solicitanteSessao);
    if (inputSolicitante.value === solicitanteSessao) {
        console.log('Input já preenchido com o solicitante da sessão.');
        return; // Já está preenchido corretamente        
    } else {        
        try {
            console.log('Tentando obter dados da sessão');
            const response = await fetch('/solicitantes/usersess');
            if (!response.ok) {
                throw new Error('Erro na requisição');
            }
            const data = await response.json();
            console.log('Dados da sessão:', data);
            // Faça algo com os dados retornados da sessão
            // console.log('Chegou aqui');
            // console.log('data.solicitante:', data.solicitante);
            document.getElementById('solicitante').value = data.solicitante;
        } catch (error) {
            console.error('Erro ao obter dados da sessão:', error);
        }
    }
}

export function limparImputs() { // Limpa os imputs par pesquisa ou preencher novo
    const inputs = ['solicitante', 'sala', 'dia', 'hora', 'motivo', 'id'];

    inputs.forEach(inputId => {
        document.getElementById(inputId).value = '';
    });
}

document.getElementById('limparImputsBtn').addEventListener('click', function() {
    limparImputs();
});

function adicionaPreenchimentoSolicitante() {
    const inputs = ['solicitante', 'sala', 'dia', 'hora', 'motivo'];

    inputs.forEach(inputId => {
        document.getElementById(inputId).addEventListener('focus', preencherSolicitante);
    });
}

adicionaPreenchimentoSolicitante();