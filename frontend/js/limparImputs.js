/**
 * Limpa os valores dos campos de entrada do formulário.
 * Os campos afetados são: solicitante, sala, dia, hora, motivo e id.
 * Útil para preparar o formulário para uma nova entrada ou limpar filtros de pesquisa.
 */
export function limparImputs() {
    // IDs dos campos a serem limpos. 'dia' foi substituído por 'date'.
    const inputs = ['solicitante', 'sala', 'date', 'hora', 'motivo', 'id'];

    inputs.forEach(inputId => {
        const element = document.getElementById(inputId);
        // Verifica se o elemento existe antes de tentar limpar seu valor
        if (element) element.value = '';
    });
}

document.getElementById('limparImputsBtn').addEventListener('click', function() {
    limparImputs();
});