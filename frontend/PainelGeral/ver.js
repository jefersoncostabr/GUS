import {criaTabela} from "./tabela.js";
import {getDados} from "./tabela.js";

// criaTabela(dadosGeral);

document.getElementById('getUsosBtn').addEventListener('click', async () => {
    let dadosGeral = await getDados();
    // Limpa a tabela anterior
    document.getElementById('containerTabela').innerHTML = '';
    criaTabela(dadosGeral);
});