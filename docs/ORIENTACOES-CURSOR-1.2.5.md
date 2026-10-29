# Orientações para o Cursor: carregamento e entrada de mensagens (1.2.5)

O frontend já está pronto; falta só ligar as APIs e o banco (modelo de trabalho: Claude Code faz a interface, Cursor conecta).

## Regra de tempo
- A animação de carregamento (símbolo do Crias pulsando com três pontos, ou o monitor carregando) dura **exatamente o tempo em que o app aguarda a API**. Não existe espera mínima artificial.
- A mensagem começa a ser exibida **a partir do retorno da API**, no mesmo lugar da espera, com esmaecimento de 0,5s (sobe 6px).
- O respiro de 0,9s entre mensagens em sequência (conteúdo e depois monitor) é só visual: conta depois de a mensagem anterior ter terminado de aparecer, nunca antes de a API responder.
- Os tempos de 0,9s e 1,3s do protótipo simulam a API e **não** vão para o app.

## Onde está no código
- Espera do conteúdo: `TypingRow` (`components/ConversationParts.tsx`), mostrada por `showTypingBubble` em `PlayerPage.tsx`, enquanto `busy` (next-content, advance, exercise_attempts, Maria).
- Espera do monitor: `TypingRow monitor`.
- Entrada: `@keyframes v125In` em `styles/crias-v1-0.css`.

## O que o backend precisa garantir
1. `GET /api/trail_stages?simple=1` com `stage_type` e `title` de cada etapa (régua). Conclusão = última etapa com título "Conclusão"; feedback = etapa de IA logo depois do exercício.
2. Tempo de estudo por atividade (cartão "Atividade concluída"); hoje é estimativa da régua. TODO backend 1.2.5.
3. `performance.by_activity` do painel (exercícios certos do cartão).
4. Ver `docs/REGRA-EXERCICIOS.md` e rodar `npm run audit:exercises`.
