
export function limparImputs() {
    document.getElementById('solicitante').value = '';
    document.getElementById('sala').value = '';
    document.getElementById('dia').value = '';
    document.getElementById('hora').value = '';
    document.getElementById('motivo').value = '';
    document.getElementById('id').value = '';
}

document.getElementById('limparImputsBtn').addEventListener('click', function() {
    limparImputs();
});