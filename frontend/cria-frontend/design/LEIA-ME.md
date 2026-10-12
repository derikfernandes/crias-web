# cria-frontend · design

Esta pasta guarda o design atualizado do app do aluno. O app em uso é o `frontend/cria-frontend`.

## O que tem aqui

| Pasta ou arquivo | O que é |
| --- | --- |
| `design-system/` | Design system do Crias: tokens (`styles.css`), guia (`readme.md`) e páginas de referência |
| `prototipo/Crias Aluno.dc.html` | Protótipo navegável (precisa de `support.js` e `assets/`) |
| `prototipo/Crias Aluno (offline).html` | Protótipo em arquivo único, abre sem internet |
| `prototipo/Crias Painel.dc.html` | Protótipo do painel (referência visual) |
| `INTERFACE.md` | Regras invioláveis, conflitos com o código atual e a ordem de aplicação |
| `DECISOES.md` | O que foi feito e o que falta decidir |
| `ATUALIZACAO-DESIGN-SYSTEM.md` | O que mudou no design system (histórico da revisão anterior) |

No pacote de origem (`export/repo/`), estes arquivos vivem em `crias-redesign/`. Neste repositório (`crias-web`) a cópia canônica do aluno fica aqui em `frontend/cria-frontend/design/`.

## Como subir no GitHub

1. Atualize esta pasta por cima do que já existe. Não apague nada fora do design.
2. O app aplica o visual em `src/styles/crias-tema.css` + `crias-ajustes.css` (depois de `app.css`), com assets em `public/`.
3. Itens marcados como CONFLITO em `INTERFACE.md` seguem as decisões aprovadas em `DECISOES.md` / store `docs/aluno-redesign-decisoes.md`.

## Regras rápidas

- Vocabulário: trilha > atividade > passo. "Exercício" é o passo que pede resposta. "Parceiro de estudos" é o tutor. Nunca usar "etapa".
- Tema escuro por padrão (igual ao protótipo v4); tema claro pelo botão do menu (fundo branco na área de conteúdo).
- Verde `#00be85` com texto branco na ação principal.
- Maria fora da trilha; login sem código da escola; sem histórico/lista/pulo por atividade.
