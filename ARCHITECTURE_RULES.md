# Regras de Arquitetura — Crias Trilha

Este documento define **quem pode alterar o quê** e como trabalhar sem quebrar
os contratos de API, banco de dados e integrações externas.

> Regra de ouro: o produto está em produção. **Nenhum contrato pode mudar sem
> revisão do responsável técnico.**

---

## 1. Área liberada para design (única pasta)

Seu sócio pode alterar **somente**:

```text
frontend/crias-painel/src/design/**
```

Opcionalmente, arquivos estáticos em:

```text
frontend/crias-painel/public/**
```

(ex.: `public/icons.svg`)

### O que existe em `src/design/`

```text
design/
├── components/     # ui, forms, tables, cards, feedback, navigation
├── layouts/        # shells visuais (ex.: AdminLayoutView)
├── views/          # apresentação das páginas (*PageView)
├── styles/         # CSS global e da aplicação
├── themes/         # tokens (cores, tipografia, sombra)
├── design-system/  # documentação de UI
├── assets/
├── icons/
├── types/          # tipos de props / view-models (só apresentação)
└── utils/          # utilitários puramente visuais (ex.: formatação de chat)
```

Dentro de `design/` é permitido: JSX de apresentação, CSS, temas, ícones,
imagens, animações, responsividade, acessibilidade visual, skeletons, empty
states e mensagens visuais de erro — sempre recebendo dados via **props**.

### O que é proibido em `design/`

Não importe e não use:

- Firebase / Firestore / `onSnapshot` / `getDoc(s)` / mutações
- `fetch` / axios / APIs
- `src/lib/**`, `src/hooks/**`, `src/contexts/**`, `src/pages/**`
- `api/`, `server/`
- `import.meta.env` / `process.env`
- autenticação, permissões, regras de negócio, queries

O ESLint e o comando `npm run check:design-boundaries` bloqueiam essas violações.

## 2. Pastas protegidas (somente responsável técnico)

```text
api/
server/
scripts/
frontend/crias-painel/src/pages/
frontend/crias-painel/src/lib/
frontend/crias-painel/src/hooks/
frontend/crias-painel/src/contexts/
frontend/crias-painel/src/types/
frontend/crias-painel/src/layouts/
frontend/crias-painel/src/components/   # forms mistos (lógica + UI) — ainda protegidos
frontend/crias-painel/src/config/
firebase*
firestore*
vercel.json
.env*
package.json
package-lock.json
vite.config.*
tsconfig*
eslint*
ARCHITECTURE_RULES.md
CODEOWNERS
```

Arquivos protegidos **somente** podem ser modificados pelo responsável técnico.

## 3. Padrão container / view

- **Container** (`src/pages/*Page.tsx`, `src/layouts/AdminLayout.tsx`): dados,
  hooks, auth, permissões, Firestore, APIs, navegação por regra, slots.
- **View** (`src/design/views/*PageView.tsx`): só apresentação; recebe props e
  callbacks; não sabe de onde os dados vieram.

`RouteGuards.tsx` permanece protegido e **não** vai para `design/`.

## 4. Como criar/alterar UI

1. Edite ou crie arquivos apenas em `src/design/`.
2. Receba dados e ações por props (ou slots `ReactNode` vindos do container).
3. Estilos: `design/styles/` e `design/themes/tokens.css`.
4. Se precisar de um dado novo, peça ao responsável técnico para expor via props
   no container — **não** importe `lib/` na view.

## 5. Comandos de validação

Na raiz do repositório:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run check:design-boundaries
```

Todos devem passar antes de abrir PR.

## 6. Antes do Pull Request

1. Branch própria (ex.: `design/ajuste-dashboard`).
2. Rodar os cinco comandos acima.
3. Não misturar alterações de `design/` com alterações em áreas protegidas.
4. Se o diff incluir pasta protegida, remova ou peça review do responsável técnico.
5. Não alterar rotas, campos, mensagens de erro de negócio ou contratos de API.
6. Descrever telas afetadas + screenshots.

## 7. Mapa de dependências

```text
design/**     → react, react-router-dom, design/*, import type de types/
pages/**      → hooks, lib, design/views, components (forms)
layouts/**    → hooks, lib, design/layouts
components/** → lib/public (forms mistos), design (reexports)
api/ server/  → firebase-admin (nunca frontend)
```

Proibido:

```text
design/**  ⇸ lib, hooks, contexts, pages, firebase, fetch, env
frontend   ⇸ firebase-admin, api/, server/ (import direto)
```
