import { verFetch } from "./ver.js";
import { limparImputs } from "./limparImputs.js";
import { tratarDados, OPCOES_MOTIVO } from "./tratamentoDeDados.js";
import { API_BASE_URL } from "./config.js";

function exibirMensagemPainel(mensagem, tempoMs = 10000) {
    const painelMensagem = document.getElementById('painelSaida') || document.getElementById('painelMensagem');
    if (!painelMensagem) return;

    painelMensagem.innerText = mensagem;

    if (tempoMs > 0) {
        setTimeout(() => {
            painelMensagem.innerText = '';
        }, tempoMs);
    }
}

function normalizarHoraEntrada(valorHora) {
    const horaTexto = String(valorHora || '').trim();

    // Aceita formatos como "19", "7" e "19:" como hora cheia.
    if (/^\d{1,2}:?$/.test(horaTexto)) {
        const horaNumerica = horaTexto.replace(':', '');
        return `${horaNumerica}:00`;
    }

    return horaTexto;
}

function normalizarDiaParaEnvio(valorDia) {
    const diaTexto = String(valorDia || '').trim();

    if (/^\d{2}\/\d{2}\/\d{2}$/.test(diaTexto)) {
        return diaTexto;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(diaTexto)) {
        const [ano, mes, dia] = diaTexto.split('-');
        return `${dia}/${mes}/${ano.slice(-2)}`;
    }

    const partes = diaTexto.split('/').map((parte) => parte.trim());
    if (partes.length === 3 && partes[0] && partes[1] && partes[2]) {
        const [dia, mes, ano] = partes;
        return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano.slice(-2).padStart(2, '0')}`;
    }

    return diaTexto;
}

/**
 * Coleta os dados do formulário e envia uma requisição POST para criar um novo uso.
 * Aplica tratamento de dados e validação de motivo antes do envio.
 */
async function adicionarUso() {
    const horaNormalizada = normalizarHoraEntrada(document.getElementById('hora').value);

    // Reflete a normalização no input para o usuário visualizar o formato final.
    document.getElementById('hora').value = horaNormalizada;

    // Coleta dados brutos
    const dadosBrutos = {
        solicitante: document.getElementById('solicitante').value,
        sala: document.getElementById('sala').value,
        dia: document.getElementById('date').value,
        hora: horaNormalizada,
        motivo: document.getElementById('motivo').value
    };
    
    // Aplica tratamento e validação
    const novoUso = tratarDados(dadosBrutos);
    novoUso.dia = normalizarDiaParaEnvio(novoUso.dia || dadosBrutos.dia);

    console.log('Dados brutos para criação:', dadosBrutos);
    console.log('Dados tratados para envio:', novoUso);

    // Validação extra para Motivo Obrigatório
    if (!novoUso.motivo) {
        alert(`Motivo inválido. Escolha: ${OPCOES_MOTIVO.join(', ')}`);
        return;
    }

    if (!novoUso.sala || !novoUso.dia || !novoUso.hora) {
        exibirMensagemPainel('Preencha sala, dia e hora. Exemplo de hora: 19 ou 19:00.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/usos/usos`, {       
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
        },
        body: JSON.stringify(novoUso),
        
    });

    // Verifique se a resposta foi bem-sucedida
    if (!response.ok) {
        let mensagemApi = '';

        try {
            const erroResposta = await response.json();
            mensagemApi = erroResposta?.message || erroResposta?.error || '';
        } catch (_) {
            mensagemApi = '';
        }

        if (response.status === 403) {
            exibirMensagemPainel('Acesso pendente de aprovação');
            throw new Error('Acesso negado: usuário pendente');
        }

        if (response.status === 409) {
            exibirMensagemPainel('Conflito: Sala Ocupada');
        } else if (response.status === 400) {
            exibirMensagemPainel(mensagemApi || 'Dados inválidos. Verifique os campos obrigatórios.');
        } else {
            exibirMensagemPainel(mensagemApi || `Não foi possível adicionar o uso (HTTP ${response.status}).`);
        }

        throw new Error(`Erro na resposta ao adicionar novo uso: ${response.status} - ${mensagemApi || 'sem detalhe da API'}`);
    }
        // Obtenha os dados da resposta
        const data = await response.json();
        if (data && data._id) {
            sessionStorage.setItem('ultimoUsoCriadoId', data._id);
        }
        console.log('Resposta completa da API ao criar uso:', data);
        exibirMensagemPainel('Uso adicionado com sucesso.', 6000);
        limparImputs();
        verFetch();
    } catch (error) {
        if (error.name === 'TypeError') {
            exibirMensagemPainel('Falha de conexão com o servidor. Tente novamente.');
        }
        console.error(`Erro ao adicionar novo uso: ${error.message}`);
    }
}

document.getElementById('adicionarUsoBtn').addEventListener('click', adicionarUso);

// ao clicar em enter no campo motivo ele aciona o adicionar uso
document.getElementById('motivo').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        adicionarUso();        
    }
});



/*
================================================================================
DOCUMENTAÇÃO DO ARQUIVO: adicionarUso.js
================================================================================

1. FINALIDADE
   Gerencia a funcionalidade de criação (cadastro) de novos registros de uso
   no sistema através do frontend.

2. FUNÇÕES
   - getBaseUrl: Define o endereço do servidor (local ou produção).
   - adicionarUso: Captura os valores dos inputs, monta o objeto JSON e realiza
     a requisição HTTP POST para a API.

3. OBSERVAÇÕES
   - Atualiza a listagem (verFetch) e limpa o formulário (limparImputs) logo
     após o envio da requisição.
   - Exibe feedback visual de erro ou duplicidade no elemento 'painelSaida'.
   - Inclui listener para submeter o formulário ao pressionar 'Enter' no campo motivo.
================================================================================
*/