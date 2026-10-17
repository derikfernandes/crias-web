# Design system — Crias Trilha (admin)

Área liberada para vibe coding. **Altere apenas arquivos sob `src/design/`.**

## Onde trabalhar

| Local | Uso |
| --- | --- |
| `../themes/tokens.css` | Cores, tipografia, sombras |
| `../styles/` | CSS base e classes da app |
| `../components/` | Componentes visuais puros |
| `../layouts/` | Shells visuais (`AdminLayoutView`) |
| `../views/` | Apresentação das páginas |
| `../assets/` / `../icons/` | Imagens e ícones |
| `../../../../public/` | Estáticos públicos |

## Regras

1. Não importe Firebase, Firestore, `lib/`, hooks, contexts, pages, api/, server/.
2. Não use `fetch`, `onSnapshot`, `import.meta.env` ou `process.env`.
3. Dados e ações chegam só por **props** (ou slots `ReactNode` do container).
4. Antes do PR: `npm run lint && npm run typecheck && npm run test && npm run build && npm run check:design-boundaries`.

Veja `ARCHITECTURE_RULES.md` na raiz do repositório.
