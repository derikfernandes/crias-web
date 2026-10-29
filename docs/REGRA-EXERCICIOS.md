# Regra de exercícios: enunciado, alternativas e gabarito (28/10/2026)

Fonte única: `server/lib/exerciseParse.ts`. Espelhos idênticos (um teste de paridade falha se divergirem):
`frontend/crias-aluno/src/lib/exerciseParse.ts` e `frontend/crias-gestao/src/lib/trilha/exerciseParse.ts`.

## A regra
1. **A partir da linha "A)" já é alternativa.** Vale também `A.`, `A:`, `A -`, `(A)`, `a)` e `**A)**`. Numeradas (`1)`, `2.`) quando não há letras.
2. **O que está acima é enunciado.** "I." e "II." (ou qualquer lista do enunciado) nunca viram alternativa nem somem do texto.
3. **Cada alternativa em uma linha** na interface. Linha que continua a alternativa é juntada a ela.
4. **Gabarito** pode vir:
   - abaixo das alternativas: `Gabarito: B`, `Resposta correta: B`, `A resposta é B` (sai do texto, só fica registrado);
   - na etapa seguinte (feedback): `A resposta é A`, `A resposta correta é a letra B`, `A letra B é a correta`...
   Só vale afirmação explícita sobre a resposta correta. "A alternativa A está errada" não é gabarito.

## Qual gabarito vale (`resolveCorrectKey`)
1. `correct_option` gravado (a Gestão edita e anula por ele);
2. gabarito escrito no conteúdo do exercício;
3. "A resposta é X" na etapa seguinte;
4. texto do feedback gerado.
O **mesmo** gabarito pontua a tentativa e vai para o prompt do feedback, então acerto/erro e feedback não podem mais discordar.
A tentativa grava `gabarito_source` e, quando as fontes discordam, `gabarito_conflict`.

## Causa do erro encontrado (t68, Linguagens 8º ano)
O enunciado tinha "I. ..." e "II. ...". O separador antigo lia "I." como alternativa "I", achava a sequência fora de ordem (I, A, B, C) e desistia: sem alternativas, o aluno via "Não foi possível carregar as opções deste exercício.", e a linha "I." era apagada do enunciado. O gabarito inferido por "letra X" também pegava qualquer menção a letra no texto.

## Auditoria no banco (só leitura)
```bash
npm run audit:exercises            # todas as trilhas
npm run audit:exercises -- t68     # uma trilha
```
Lista SEM_ALTERNATIVAS, SEM_GABARITO, CONFLITO e GABARITO_FORA.
