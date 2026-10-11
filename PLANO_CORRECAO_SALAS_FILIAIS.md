# Plano de correção: salas por filial / estúdio

Observação: este arquivo deve ser apagado após a implementação da correção, quando a solução estiver validada e o problema estiver resolvido.

## Diagnóstico

A estrutura do banco já separa salas por estúdio, com o campo `estudioId` e índice único composto em `estudioId + numero`. Ou seja, a regra de negócio está correta no modelo.

O problema real está na camada de interface: o frontend está usando o número da sala como identidade do select, sem distinguir o estúdio de origem. Isso faz com que "Sala 1" apareça igual em todas as filiais.

## Causa raiz

Pontos encontrados:

- Em `frontend/js/carregarDadosUsuario.js`, o select de salas usa `option.value = sala.numero`.
- Em `frontend/js/adminSalas.js`, o número da sala também é usado como valor principal no formulário.
- O backend e o modelo reconhecem as salas por `estudioId`, mas a UI está tratando o valor visual como se fosse a identidade única.

## Objetivo

Garantir que cada sala seja identificada de forma inequívoca por estúdio, sem confundir salas iguais em filiais diferentes.

## Plano de correção

1. Revisar os pontos de carregamento e filtro de salas na tela principal/painel geral.
2. Ajustar os selects para armazenar a referência correta da sala (preferencialmente `sala._id` ou um identificador composto por estúdio + sala).
3. Manter a apresentação amigável para o usuário, mostrando apenas o texto visível como "Sala 1", "Sala 2", etc., mas com valor real distinto.
4. Garantir que o filtro por estúdio continue sendo aplicado antes da listagem das salas.
5. Ajustar a criação/edição de salas para que o campo de seleção sempre reflita o contexto do estúdio atual.
6. Validar cenários:
   - mesma sala número em filiais diferentes;
   - criação de nova sala em filial A e B;
   - edição de sala existente sem troca de filial;
   - exclusão e listagem sem conflito.

## Arquivos prováveis a revisar

- `frontend/js/carregarDadosUsuario.js`
- `frontend/js/adminSalas.js`
- `frontend/js/adminAulas.js`
- `frontend/js/tabela.js`
- `src/controllers/adminController.js`
- `src/models/salaModel.js`
- `middleware/tenantMiddleware.js`

## Critério de conclusão

A correção será considerada concluída quando:

- a mesma sala número em filiais diferentes puder coexistir sem ambiguidade;
- a UI sempre exibe apenas as salas do estúdio selecionado;
- a criação e edição não confundem salas de filiais diferentes;
- a validação manual demonstrar o comportamento correto em pelo menos um cenário real.

## Observação final

Depois da implementação e validação, remover este arquivo do repositório para evitar documentação redundante e manter o projeto limpo.
