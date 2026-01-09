/**
 * Lista de motivos permitidos no sistema.
 */
export const OPCOES_MOTIVO = ['Particular', 'Ensaio', 'Reunião', 'Aula Regular', 'Sublocação'];

/**
 * Trata e formata os dados de uso (Solicitante, Sala, Dia, Hora, Motivo)
 * conforme regras de negócio estritas.
 * 
 * @param {Object} dados - Objeto contendo { solicitante, sala, dia, hora, motivo }
 * @returns {Object} Objeto com os dados tratados e formatados.
 * @throws {Error} Lança erro se o motivo for inválido.
 */
export function tratarDados(dados) {
    // 1. Solicitante: Apenas letras (e espaços/acentos para nomes reais)
    let solicitante = dados.solicitante || '';
    // Remove tudo que não for letra ou espaço
    solicitante = solicitante.replace(/[^a-zA-Z\u00C0-\u00FF\s]/g, '').trim();

    // 2. Sala: Somente números
    let sala = dados.sala || '';
    sala = sala.replace(/\D/g, '');

    // 3. Dia: 2 dígitos + barra automática + mês corrente
    let diaRaw = String(dados.dia || '').replace(/\D/g, ''); // Remove não dígitos
    let diaFinal = '';
    
    if (diaRaw.length > 0) {
        // Pega os dois primeiros dígitos
        let diaNum = parseInt(diaRaw.substring(0, 2));
        
        // Validação básica de dia (1 a 31)
        if (diaNum > 31) diaNum = 31;
        if (diaNum < 1) diaNum = 1;

        const diaFormatado = String(diaNum).padStart(2, '0');
        
        // Pega mês corrente
        const hoje = new Date();
        const mesCorrente = String(hoje.getMonth() + 1).padStart(2, '0');
        
        diaFinal = `${diaFormatado}/${mesCorrente}`;
    }

    // 4. Hora: 2 ou 4 dígitos, completa com :00, limita 0-23, minutos 00 ou 30
    let horaRaw = String(dados.hora || '').replace(/\D/g, '');
    let horaFinal = '';

    if (horaRaw.length > 0) {
        let h = 0;
        let m = 0;

        if (horaRaw.length <= 2) {
            // Digitou apenas hora (ex: "9" ou "14") -> vira "09:00" ou "14:00"
            h = parseInt(horaRaw);
            m = 0;
        } else {
            // Digitou hora e minuto (ex: "1430")
            // Pega até 4 digitos para evitar erros
            const clean = horaRaw.substring(0, 4);
            if (clean.length === 3) {
                h = parseInt(clean.substring(0, 1));
                m = parseInt(clean.substring(1));
            } else {
                h = parseInt(clean.substring(0, 2));
                m = parseInt(clean.substring(2));
            }
        }

        // Limita hora (0-23)
        if (h > 23) h = 23;
        if (h < 0) h = 0;

        // Regra dos minutos: Só 00 ou 30
        // Se for < 15 vira 00, se >= 15 e < 45 vira 30, se >= 45 vira 00 da próxima hora?
        // Simplificação: Arredonda para o mais próximo permitido (0 ou 30)
        if (m < 15) m = 0;
        else if (m >= 15 && m < 45) m = 30;
        else {
            m = 0;
            // Não vamos incrementar a hora automaticamente para não confundir, mantém a hora digitada
        }

        horaFinal = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    // 5. Motivo: Deve pertencer à lista pré-definida
    let motivo = dados.motivo || '';
    // Verifica se o motivo digitado/escolhido está na lista (case insensitive para robustez)
    const motivoValido = OPCOES_MOTIVO.find(m => m.toLowerCase() === motivo.toLowerCase());
    
    if (motivo && !motivoValido) {
        // Se foi digitado algo que não está na lista, invalidamos ou pegamos o padrão?
        // Como o requisito diz "não será digitado", assumimos que se vier errado, limpamos.
        motivo = ''; 
    } else if (motivoValido) {
        motivo = motivoValido; // Normaliza a string (ex: "reunião" vira "Reunião")
    }

    return {
        solicitante,
        sala,
        dia: diaFinal,
        hora: horaFinal,
        motivo
    };
}