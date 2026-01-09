import { OPCOES_MOTIVO } from './tratamentoDeDados.js';

const selectMotivo = document.getElementById('motivo');

if (selectMotivo) {
    // Limpa as opções existentes (hardcoded)
    selectMotivo.innerHTML = '';

    // Adiciona uma opção vazia inicial (opcional, mas recomendada para UX)
    const optionVazia = document.createElement('option');
    optionVazia.value = '';
    selectMotivo.appendChild(optionVazia);

    OPCOES_MOTIVO.forEach(motivo => {
        const option = document.createElement('option');
        option.value = motivo; // O valor enviado ao banco será o próprio nome (ex: "Particular")
        option.textContent = motivo;
        selectMotivo.appendChild(option);
    });
}