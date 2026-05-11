import { verFetch } from "./ver.js";
import { pegarIdUnico } from "./editarUso.js";
import { limparImputs } from "./limparImputs.js";

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
 * Envia uma requisição DELETE para remover um registro de uso.
 * @param {string} id - O ID do registro a ser excluído.
 */
async function excluirUso(id) {
    try {
    const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/usos/usos/${id}`, {
        method: 'DELETE',
        headers: {
        'Content-Type': 'application/json'
        }
    });
    verFetch();
    limparImputs();

    if (!response.ok) {
        const painelMsg = document.getElementById('painelSaida') || document.getElementById('painelMensagem');
        const msg = response.status === 403
            ? 'Acesso pendente de aprovação'
            : 'Negado';
        if (painelMsg) {
            painelMsg.innerText = msg;
            setTimeout(() => { painelMsg.innerText = ''; }, 7000);
        }
        throw new Error(`Erro ao excluir uso: ${response.status}`);
    }

    const data = await response.json();
    console.log(data);
    } catch (error) {
        
        console.error(`Erro ao excluir uso: ${error.message}`);
    }
}

/**
 * Fluxo principal de exclusão: busca o ID selecionado e chama a função de exclusão.
 */
async function pegarIdEExcluir() {
    const id = await pegarIdUnico()
    excluirUso(id);
}

document.getElementById('excluirUsoBtn').addEventListener('click', function() {
    pegarIdEExcluir();    
});

/*
================================================================================
DOCUMENTAÇÃO DO ARQUIVO: apagarUso.js
================================================================================

1. FINALIDADE
   Gerencia a funcionalidade de exclusão de registros de uso no sistema
   através do frontend.

2. FUNÇÕES
   - getBaseUrl: Define o endereço do servidor (local ou produção).
   - excluirUso: Realiza a requisição HTTP DELETE para a API.
   - pegarIdEExcluir: Orquestra a obtenção do ID (via editarUso.js) e a
     execução da exclusão.

3. OBSERVAÇÕES
   - Utiliza 'pegarIdUnico' importado de 'editarUso.js' para identificar o alvo.
   - Atualiza a listagem (verFetch) e limpa os inputs após o sucesso.
   - Exibe feedback visual de erro no elemento 'painelSaida'.
================================================================================
*/