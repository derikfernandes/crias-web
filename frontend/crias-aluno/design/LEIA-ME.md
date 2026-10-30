# crias-aluno · design (1.1.1.b)

Esta pasta guarda o design do Crias Aluno e do Crias Educação (app `crias-gestao`). Os apps em uso são `frontend/crias-aluno` e `frontend/crias-gestao`.

## Versões

| Versão | O que é |
| --- | --- |
| v0 | Frontend original |
| v1.0 | Primeira versão do redesign, já aplicada (`src/styles/crias-v1-0.css`) |
| v1.1 | Base oficial |
| **1.1.1.b** | Versão atual destes protótipos (regras em INTERFACE.md, "Pacote 1.1.1.b: regras consolidadas") |

## O que tem aqui

| Pasta ou arquivo | O que é |
| --- | --- |
| `prototipo/Crias Aluno.dc.html` | Protótipo do aluno (precisa de `support.js` e `assets/`) |
| `prototipo/Crias Gestao.dc.html` | Protótipo do Crias Educação |
| `prototipo/Crias Aluno offline.html`, `Crias Gestao offline.html` | Os mesmos protótipos em arquivo único, abrem sem internet |
| `design-system/` | Tokens (`styles.css`), guia (`readme.md`) e logotipos |
| `INTERFACE.md` | Regras de interface, numeradas por versão (1.1.x e 1.0.x) |
| `DECISOES.md` | O que foi feito e o que falta decidir |

O botão redondo de atualizar no canto superior direito dos protótipos só existe na versão de teste. Não vai para o app.

## Regras rápidas

- Vocabulário: trilha > atividade > etapa. "Exercício" é a etapa que pede resposta. O tutor é o **monitor** (área Monitoria). Nunca usar "passo".
- Tema claro por padrão; escuro (fundo preto) pelo botão do menu.
- Verde `#00be85` com texto branco na ação principal.
- Português do Brasil, sem travessão.

## Versão 1.3 (29/10/2026)

Protótipos `Crias Aluno.dc.html` e `Crias Gestao.dc.html` na versão 1.3 (Aluno 1.3 e Educação 1.3). As regras estão em `INTERFACE.md`, seção "Pacote 1.3" (no fim do arquivo), que vale sobre todas as outras. Plano e notas técnicas em `PLANO-1.3.md`. Ordem de trabalho para o Claude Code em `PROMPT-CLAUDE-CODE.md` (raiz do pacote).
