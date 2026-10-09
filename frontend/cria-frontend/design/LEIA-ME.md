# cria-frontend · design

Esta pasta guarda o design atualizado do app do aluno. O app em uso é o `frontend/cria-frontend`. A pasta `crias-redesign/` fica no repositório como histórico e **não deve ser apagada nem alterada**.

## O que tem aqui

| Pasta ou arquivo | O que é |
| --- | --- |
| `design-system/` | Design system do Crias: tokens (`styles.css`), guia (`readme.md`) e páginas de referência |
| `prototipo/Crias Aluno.dc.html` | Protótipo navegável. Para abrir, rode `npx serve .` nesta pasta |
| `INTERFACE.md` | Regras invioláveis, conflitos com o código atual e a ordem de aplicação |
| `DECISOES.md` | O que foi feito e o que falta decidir |
| `ATUALIZACAO-DESIGN-SYSTEM.md` | O que mudou no design system |

## Como subir no GitHub

1. Use a branch `design/interface`, nunca a `main`.
2. Copie esta pasta para `frontend/cria-frontend/design/`. Não apague nada que já existe no repositório, inclusive `crias-redesign/`.
3. Faça um commit só, com a mensagem `design: design system e protótipo do aluno`.
4. Esta pasta não entra no build do Vite e não altera o app.

## Próximo passo no código

- Aplicar o visual em `src/styles/app.css` e no JSX de apresentação de `src/pages` e `src/layouts`, página por página, conforme `INTERFACE.md`.
- Os tokens de `design-system/styles.css` são a referência para as variáveis de `:root` do `app.css`.
- Itens marcados como CONFLITO esperam aval.

## Regras rápidas

- Vocabulário: trilha > atividade > passo. "Exercício" é o passo que pede resposta. "Parceiro de estudos" é o tutor. Nunca usar "etapa".
- Fundo branco. Bege só em destaques.
- Verde `#00be85` com texto branco na ação principal.
- Horizonte como fundo das telas do aluno.
