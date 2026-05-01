# Plano de Melhoria: Criação de Estúdio e Atribuição de Roles

Este documento descreve o passo a passo para implementar a seleção de estúdio via modal e a atribuição automática de permissões (Admin/User).

## 1. Backend (Lógica de Negócio)

1.  **Criar Rota de Listagem Pública:**
    *   Criar um endpoint (ex: `GET /estudios/lista-simples`) que retorne apenas os nomes e IDs dos estúdios existentes para preencher a lista de pesquisa no frontend.

2.  **Atualizar Controller de Criação (`solicitanteController.js`):**
    *   Remover a dependência do campo `role` vindo do frontend (segurança).
    *   **Lógica de Verificação:** Ao receber o cadastro:
        1.  Verificar se o nome do estúdio já existe no banco `Master`.
        2.  **Cenário A (Estúdio Existe):**
            *   Não criar novo tenant.
            *   Atribuir `role = 'user'`.
            *   Associar o usuário ao `tenantDbName` existente.
        3.  **Cenário B (Estúdio Não Existe):**
            *   Criar novo registro de Estúdio no Master.
            *   Provisionar novo banco de dados (Tenant).
            *   Atribuir `role = 'admin'`.

## 2. Frontend (Interface - HTML/CSS)

3.  **Criar Componente Modal (Overlay):**
    *   Adicionar no `loginCriar.html` uma estrutura `div` (inicialmente oculta) que cobrirá a tela.
    *   Dentro do modal:
        *   Um campo de busca (input text).
        *   Uma lista (`ul` ou `div`) para exibir os resultados filtrados.
        *   Botão "Cancelar".

4.  **Estilização (CSS):**
    *   Criar classes para que o modal fique centralizado e com fundo escurecido (backdrop).

## 3. Frontend (Comportamento - JavaScript)

5.  **Interação do Campo Estúdio:**
    *   Alterar o input de estúdio para `readonly` ou adicionar um evento de `click/focus`.
    *   Ao clicar no campo (ou se tentar enviar vazio), abrir o Modal de Seleção.

6.  **Lógica de Pesquisa no Modal:**
    *   Ao abrir o modal, buscar a lista de estúdios (criada no passo 1).
    *   Conforme o usuário digita, filtrar a lista visualmente.
    *   **Opção "Criar Novo":** Se o que o usuário digitou não existir na lista, exibir uma opção destacada: *"Estúdio não encontrado. Criar novo estúdio: [Nome Digitado]?"*.

7.  **Confirmação e Seleção:**
    *   **Se selecionar existente:** Preencher o input do formulário com o nome e fechar o modal.
    *   **Se selecionar "Criar Novo":** Exibir um `confirm()` ou alerta simples perguntando: *"Você será o Administrador deste novo estúdio. Confirma?"*. Se sim, preencher o input e fechar o modal.

8.  **Envio do Formulário:**
    *   O JavaScript de envio (`loginCriar.js`) não precisará mais enviar `role: 'admin'`. O backend decidirá isso baseado na existência ou não do estúdio.