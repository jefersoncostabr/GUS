# Admin frontend — Notas de integração

Os módulos em `frontend/js` relacionados ao painel administrativo agora são UI-only: não executam chamadas de rede nem conhecem rotas da API. A responsabilidade pela comunicação com o servidor deve ser implementada por outra camada (ex.: um serviço de dados ou um módulo API). Abaixo descrevo como integrar essa camada aos módulos UI.

---

## Como integrar
- Inserir dados nas UIs:
  - `adminUsers.js` — chame `setUsersData(array)` com a lista de usuários carregada.
  - `adminEstudios.js` — chame `setEstudiosData(array)` com a lista de estúdios carregada.
  - `adminSalas.js` — chame `setSalasData(array)` com a lista de salas carregada.
  - Para popular selects de estúdios, use `populateEstudiosOptions(selectEl, estudios)` (exportado em `admin.js`).

- Ouvir ações do usuário (o módulo UI apenas dispara eventos; a camada de dados deve escutá-los e executar as requisições):
  - `admin:user:update` — detail: { id, nome, role }
  - `admin:user:delete` — detail: { id }
  - `admin:estudio:save` — detail: { id|null, nome, localizacao, filiais, ativo }
  - `admin:estudio:delete` — detail: { id }
  - `admin:sala:save` — detail: { id|null, estudioId, numero, nome, ativo }
  - `admin:sala:delete` — detail: { id }

**Formato de `filiais` (novo)**
- Cada item em `filiais` é um objeto: `{ local, unidade, endereco, salas }` onde:
  - `unidade` (string) — nome ou identificação da filial/unidade
  - `endereco` (string) — endereço físico da filial
  - `salas` (number) — quantidade de salas nessa filial
  - `local` (string) — campo legado composto por `unidade` ou `endereco` para compatibilidade

---

---

## Observações
- A verificação de sessão/role (`/usuario-logado`) também deve ser feita pela camada de dados; após a checagem, chame `setAdminVisibility(isAdmin)` (exportado em `admin.js`) para mostrar/ocultar a área administrativa.
- Esta separação facilita testes e permite que você troque a implementação de rede sem alterar a UI.

---

## Exemplo: módulo `adminDataLayer.js` (opcional)

Uma implementação de exemplo chamada `frontend/js/adminDataLayer.js` foi adicionada para conveniência. Ela:
- Faz a checagem de sessão (`/usuario-logado`) e chama `setAdminVisibility`.
- Carrega as listas iniciais (`/admin/solicitantes`, `/admin/estudios`, `/admin/salas`) e injeta os dados nas UIs com `set*Data`.
- Escuta os eventos emitidos pelos módulos UI (`admin:user:create/update/delete`, `admin:estudio:save/delete`, `admin:sala:save/delete`) e executa as requisições correspondentes.

Se você optar por usá-lo, inclua o script no `painelAdm.html` (já adicionado):

```html
<script type="module" src="./js/adminDataLayer.js"></script>
```

A implementação exibe mensagens de sucesso/erro usando `showMessage` e recarrega as listas afetadas após operações criadas/atualizadas/excluídas.

