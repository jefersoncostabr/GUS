import {criaTabela} from "./tabela.js";
import {getDados} from "./tabela.js";

// bkp 1
// criaTabela(dadosGeral);

// document.getElementById('getUsosBtn').addEventListener('click', async () => {
//     let dadosGeral = await getDados();
//     // Limpa a tabela anterior
//     document.getElementById('containerTabela').innerHTML = '';
//     criaTabela(dadosGeral);
// });

// bkp 2
// document.getElementById('getUsosBtn').addEventListener('click', async () => {
//   const inputValues = {
//     solicitante: document.getElementById('solicitante').value,
//     sala: document.getElementById('sala').value,
//     dia: document.getElementById('dia').value,
//     diaSemana: document.getElementById('diaSemana').value,
//     hora: document.getElementById('hora').value,
//     motivo: document.getElementById('motivo').value,
//   };

//   const filteredDadosGeral = await getDados().then((dadosGeral) => {
//     const filteredData = dadosGeral.filter((dado) => {
//       return Object.keys(inputValues).every((key) => {
//         return inputValues[key] === '' || dado[key] === inputValues[key];
//       });
//     });
//     return filteredData;
//   });

//   // Limpa a tabela anterior
//   document.getElementById('containerTabela').innerHTML = '';
//   criaTabela(filteredDadosGeral);
// });

// bkp´3
// document.getElementById('getUsosBtn').addEventListener('click', async () => {
//     const inputValues = {
//         solicitante: document.getElementById('solicitante').value,
//         sala: document.getElementById('sala').value,
//         dia: document.getElementById('dia').value,
//         diaSemana: document.getElementById('diaSemana').value,
//         hora: document.getElementById('hora').value,
//         motivo: document.getElementById('motivo').value,
//     };

//     const filteredDadosGeral = await getDados().then((dadosGeral) => {
//         const filteredData = dadosGeral.filter((dado) => {
//             return Object.keys(inputValues).every((key) => {
//                 if (inputValues[key] === '') return true; // se o campo está vazio, ignora
//                 return dado[key].includes(inputValues[key]); // se o campo está preenchido, verifica se o dado contém o valor
//             });
//         });
//         return filteredData;
//     });

//     // Limpa a tabela anterior
//     document.getElementById('containerTabela').innerHTML = '';
//     criaTabela(filteredDadosGeral);
// });
