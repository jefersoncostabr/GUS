# Documentação de Rotas Multi‑Tenant

Este documento categoriza as rotas da aplicação de acordo com o tipo de acesso
(requer banco Master ou banco Tenant) e se são públicas ou protegidas pela
`tenantMiddleware`.

## 🟢 Rotas Públicas / Banco Master
Essas rotas não exigem sessão ou tenant e funcionam no banco "gus_master".

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST   | `/login` | Autentica usuário e inicia sessão (Master)
| POST   | `/logout` | Encerra sessão (Master)
| GET    | `/usuario-logado` | Retorna dados do usuário logado (Master)
| GET    | `/rotas-disponiveis` | Mapa de rotas (serve lista de endpoints - público)

*Observação:* os handlers dessas rotas utilizam `authController` e manipulam o
banco Master; nenhuma injeção de tenant é necessária.

## 🔒 Rotas Protegidas / Tenant
Acesso somente para usuários autenticados. O `tenantMiddleware` deve ser
executado *antes* dos controllers, pois ele injeta os modelos para o banco de
dados específico do tenant.

Quando a requisição chega, o fluxo é:
`authMiddleware` → `sessionMiddleware` → `tenantMiddleware` → controller.

### Usos (Agendamentos)
| Método | Endpoint |
|--------|----------|
| GET    | `/usos` |
| GET    | `/usos/usos` |
| GET    | `/usos/usos/:id` |
| POST   | `/usos/usos` |
| PUT    | `/usos/usos/:id` |
| DELETE | `/usos/usos/:id` |
| GET    | `/usos/buscaid` |

### Solicitantes (Usuários/Tenantes)
| Método | Endpoint |
|--------|----------|
| GET    | `/solicitantes` |
| GET    | `/solicitantes/solicitantes` |
| GET    | `/solicitantes/solicitantes/:id` |
| GET    | `/solicitantes/buscaidsolicitante` |
| POST   | `/solicitantes/solicitantes` |
| PUT    | `/solicitantes/solicitantes/:id` |
| DELETE | `/solicitantes/solicitantes/:id` |

### Admin (somente usuários com role 'admin' do tenant)
#### Estúdios
| Método | Endpoint |
|--------|----------|
| GET    | `/admin/estudios` |
| POST   | `/admin/estudios` |
| PUT    | `/admin/estudios/:id` |
| DELETE | `/admin/estudios/:id` |

#### Motivos
| Método | Endpoint |
|--------|----------|
| GET    | `/admin/motivos` |
| POST   | `/admin/motivos` |
| PUT    | `/admin/motivos/:id` |
| DELETE | `/admin/motivos/:id` |

#### Salas
| Método | Endpoint |
|--------|----------|
| GET    | `/admin/salas` |
| POST   | `/admin/salas` |
| PUT    | `/admin/salas/:id` |
| DELETE | `/admin/salas/:id` |

#### Aulas Regulares
| Método | Endpoint |
|--------|----------|
| GET    | `/admin/aulas` |
| POST   | `/admin/aulas` |
| PUT    | `/admin/aulas/:id` |
| DELETE | `/admin/aulas/:id` |

#### Manutenção (limpar dados)
| Método | Endpoint | Observação |
|--------|----------|------------|
| DELETE | `/admin/limpar/solicitantes` | Apaga só o banco tenant atual |
| DELETE | `/admin/limpar/usos` | idem |
| DELETE | `/admin/limpar/estudios` | idem |
| DELETE | `/admin/limpar/motivos` | idem |
| DELETE | `/admin/limpar/salas` | idem |
| DELETE | `/admin/limpar/aulas` | idem |
| DELETE | `/admin/limpar/tudo` | **CUIDADO** - limpa o banco tenant atual por completo |

## 📝 Observações Gerais
- Rotas que começam com `/admin` geralmente exigem `verificaRole` para
  confirmar perfil `admin`.
- O middleware `tenantMiddleware` já possui early return para rotas públicas,
  portanto não precisa ser aplicado manualmente nesses casos.
- Ao adicionar novas rotas no futuro, atualize este documento e/ou a rota
  dinâmica `/rotas-disponiveis` para mantê-las sincronizadas.

---

Este documento fornece a base para a futura automação de geração de
mapas de rotas e ajuda na tarefa 10 do roadmap de migração.