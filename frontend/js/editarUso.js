import { limparImputs } from "./limparImputs.js";
import { verFetch } from "./ver.js";   
import { tratarDados, OPCOES_MOTIVO } from "./tratamentoDeDados.js";

/**
 * Determina a URL base da API verificando o hostname atual.
 * @returns {string} A URL base para as requisições (localhost ou produção).
 */
// Determina a URL base da API (localhost ou produção)
function getBaseUrl() {
    return window.location.hostname.includes("onrender.com")
        ? "https://gus-q7nn.onrender.com"
        : `http://${window.location.hostname}:3000`;
}

/**
 * Envia uma requisição PUT para atualizar os dados de um registro de uso.
 * Coleta as informações (solicitante, sala, dia, hora, motivo) dos inputs do DOM.
 * @param {string} id - O ID do registro a ser atualizado.
 * @returns {Promise<boolean>} Retorna true se a operação for bem-sucedida, false caso contrário.
 */
// Envia requisição PUT para atualizar um registro de uso existente
async function alterarUso(id) {
    try {
        const dadosBrutos = {
            solicitante: document.getElementById('solicitante').value,
            sala: document.getElementById('sala').value,
            dia: document.getElementById('date').value,
            hora: document.getElementById('hora').value,
            motivo: document.getElementById('motivo').value
        };

        const dadosTratados = tratarDados(dadosBrutos);

    const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/usos/usos/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosTratados)
    });

    if (!response.ok) {
        throw new Error(`Erro ao alterar uso: ${response.status}`);
    }
        const data = await response.json();
        console.log(data);
        return true;
    } catch (error) {
        document.getElementById('painelMensagem').innerText = 'Negado';
        setTimeout(() => {
            document.getElementById('painelMensagem').innerText = '';
        }, 5000);
        console.error(`Erro ao alterar uso: ${error.message}`);
        return false;
    }
}

// Tenta obter o ID do registro a ser editado (do input oculto ou da busca atual)
export async function pegarIdUnico() {
    // Tenta pegar o valor do input com id="id"
    const inputId = document.getElementById('id');
    if (inputId && inputId.value) {
        console.log(inputId.value);
        return inputId.value;
    }
    try {
        const obj = await verFetch();
    if (obj !== undefined) {
        console.log(obj[0]._id);
        return obj[0]._id;

    } else {
        console.log('obj é undefined');
    }
    } catch (error) {
        console.error(error);
    }
}

// Fluxo principal de edição: busca ID, atualiza e limpa formulário
async function pegarIdEAlterar() {
    const id = await pegarIdUnico();
    const sucesso = await alterarUso(id);
    if (sucesso) {
        limparImputs();
        window.location.reload();
    }
}

document.getElementById('alterarReservaBtn').addEventListener('click', function() {
    pegarIdEAlterar();
});

/*
================================================================================
DOCUMENTAÇÃO DO ARQUIVO: editarUso.js
================================================================================

1. FINALIDADE
   Gerencia a funcionalidade de edição (atualização) de registros de uso
   existentes no sistema através do frontend.

2. FUNÇÕES
   - getBaseUrl: Define o endereço do servidor (local ou produção).
   - alterarUso: Realiza a requisição HTTP PUT para a API enviando os novos
     dados do formulário.
   - pegarIdUnico: Identifica qual registro deve ser alterado, verificando
     primeiro o campo oculto de ID e, se vazio, buscando na lista atual.
   - pegarIdEAlterar: Função orquestradora que obtém o ID, chama a atualização
     e limpa os campos após o sucesso.

3. OBSERVAÇÕES
   - Interage com elementos do DOM para capturar valores (solicitante, sala, etc).
   - Exibe feedback visual de erro no elemento 'painelSaida'.
================================================================================
*/