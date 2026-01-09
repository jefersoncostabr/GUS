/**
 * Limpa os valores dos campos de entrada do formulário.
 * Os campos afetados são: solicitante, sala, dia, hora, motivo e id.
 * Útil para preparar o formulário para uma nova entrada ou limpar filtros de pesquisa.
 */
export function limparImputs() {
    const inputs = ['solicitante', 'sala', 'dia', 'hora', 'motivo', 'id'];

    inputs.forEach(inputId => {
        document.getElementById(inputId).value = '';
    });
}

document.getElementById('limparImputsBtn').addEventListener('click', function() {
    limparImputs();
});