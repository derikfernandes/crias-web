# Prompt para o Claude Code: aplicar o pacote 1.2.5 do Crias Aluno

Cole o texto abaixo no Claude Code, na raiz do repositório thiagocrias/crias-web (branch main), depois de copiar o conteúdo de `export/repo/` por cima da raiz.

---

Você vai aplicar o pacote **1.2.5** do redesign no app `frontend/crias-aluno` (o protótipo da Gestão, exibida como Crias Educação, segue na versão 1.2 e vai junto só como referência).

**Fonte de verdade**
- `frontend/crias-aluno/design/INTERFACE.md`, seção **"Pacote 1.2.5"**. As revisões valem em ordem: 1.2.5.12 vale sobre 1.2.5.11, que vale sobre 1.2.5.10, e assim por diante.
- Protótipo: `frontend/crias-aluno/design/prototipo/Crias Aluno.dc.html` (ou `Crias Aluno offline.html`). Abra no navegador e compare tela a tela, na web, no celular (tweak "celular") e no tablet (tweak "tablet").
- `CLAUDE.md` na raiz: vocabulário, cores e regras gerais.

**O que muda no 1.2.5 (resumo)**
1. Início: retomada da trilha, monitor em destaque e barra de pergunta embaixo, na posição da conversa (tweak "barraInicio").
2. Atividade: régua de etapas com o nome da atividade; abaixo, "Etapa X de Y" em negrito à esquerda ("Exercício Z de W" no exercício) e "Atividade X de Y" à direita. Topo só com o nome da trilha.
3. Geração única de mensagem em todo o app: a mensagem nasce no lugar final como espera (conteúdo: símbolo + três pontos; monitor: personagem + linhas), o ícone não se move e o texto entra com esmaecimento (0,5s, sobe 6px). Respiro de 0,9s entre mensagens em sequência.
4. Conteúdo sem título; exercício sem símbolo, com etiqueta amarela "Responda"; feedback é bloco de conteúdo ("Acertou" ou "Quase").
5. Resposta do exercício sobe ao topo e a espera entra logo abaixo, sem mover a tela.
6. Monitor automático só na 1ª etapa e no fechamento. Fim da atividade/trilha: último bloco, caixa "Atividade concluída"/"Trilha concluída" com check desenhado, depois o monitor. Trilha concluída troca Continuar por "Início".
7. Monitoria sempre com histórico acima. Painel sem "Sua semana".

**Escopo**
1. Só camada visual: estilos, JSX de apresentação, textos, estados e animações de entrada. Não mude contratos de API, modelos ou regras de negócio.
2. Os tempos de espera do protótipo simulam a geração: no app, a espera dura até a resposta real chegar; mantenha o respiro mínimo entre mensagens.
3. Onde faltar dado ou endpoint, use mock isolado e marque `// TODO backend 1.2.5: <item>`. Itens CONFLITO em INTERFACE.md pedem aval. Veja também "Checar com o backend" no fim do Pacote 1.2.5.

**Entrega**
- Commits pequenos por área, mensagem em português.
- Ao final, gere `frontend/crias-aluno/design/RELATORIO-1.2.5.md` com o que foi aplicado, os TODOs de backend e as diferenças em relação ao protótipo.
- Não apague versões anteriores nem arquivos de `design/`.
