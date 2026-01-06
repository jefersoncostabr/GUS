import { verFetch } from "./ver.js";
import { limparImputs } from "./limparImputs.js";
import { tratarDados, OPCOES_MOTIVO } from "../tratamentodedados.js";

/**
 * Determina a URL base da API verificando o hostname atual.
 * @returns {string} A URL base para as requisições (localhost ou produção).
 */
function getBaseUrl() {
    return window.location.hostname.includes("onrender.com")
        ? "https://gus-q7nn.onrender.com"
        : `http://${window.location.hostname}:3000`;
}

/**
 * Coleta os dados do formulário e envia uma requisição POST para criar um novo uso.
 * Aplica tratamento de dados e validação de motivo antes do envio.
 */
async function adicionarUso() {
    // Coleta dados brutos
    const dadosBrutos = {
        solicitante: document.getElementById('solicitante').value,
        sala: document.getElementById('sala').value,
        dia: document.getElementById('dia').value,
        hora: document.getElementById('hora').value,
        motivo: document.getElementById('motivo').value
    };
    
    // Aplica tratamento e validação
    const novoUso = tratarDados(dadosBrutos);

    // Validação extra para Motivo Obrigatório
    if (!novoUso.motivo) {
        alert(`Motivo inválido. Escolha: ${OPCOES_MOTIVO.join(', ')}`);
        return;
    }

    try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/usos/usos`, {       
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
        },
        body: JSON.stringify(novoUso),
        
    });
        verFetch()
        limparImputs();

    // Verifique se a resposta foi bem-sucedida
    if (!response.ok) {
        document.getElementById('painelSaida').innerText = 'Negado ou Já existe';
        setTimeout(() => {
            document.getElementById('painelSaida').innerText = '';
            }, 5000);
        throw new Error(`Erro na resposta ao adicionar novo uso: ${response.status}`);
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