# Decisions — Crias Trilhas

## Decisão 1 — Frontend em React + Vite

O projeto atual já usa React, Vite e TypeScript. Manter essa stack (admin e app aluno).

## Decisão 2 — Firestore como base principal

O projeto atual já usa Firebase/Firestore. Manter Firestore como banco principal.

## Decisão 3 — Painel usa Firestore Client SDK

O painel administrativo atual acessa Firestore diretamente via Firebase SDK.

Isso é aceito para o painel enquanto as regras de segurança estiverem adequadas.

## Decisão 4 — App aluno usa API HTTP

O app web do aluno não acessa Firestore diretamente.

O player consulta endpoints HTTP; o backend acessa Firestore de forma segura.

## Decisão 5 — Stages têm comportamento; questions têm conteúdo

O campo `stage_type` e o `prompt` ficam em `trail_stages`.

O conteúdo entregue fica em `trail_stage_questions`.

## Decisão 6 — Trilha usa IDs sequenciais

Trilhas usam padrão `t1`, `t2`, `t3` com contador em `counters/trails`.

## Decisão 7 — Cliente não decide regra de avanço sozinho

A API deve retornar a próxima ação / conteúdo para o player.

O app aluno apenas renderiza e solicita avanço.

## Decisão 8 — Toda ação nova precisa entrar no Action Routing Map

Antes de implementar uma nova ação, deve ser definido:

- origem;
- modo de acesso;
- collection ou endpoint;
- entrada;
- saída;
- regra de erro.

## Decisão 9 — Uso de agentes no dashboard via summary server-side

Sessões de agentes de IA gravam `conversation_logs` com `trail_id` textual
(ex.: `Trilha - Matemática`, `Tutor - Linguagens`), distinto dos ids `tN` das
trilhas reais. Esses logs representam atividade de sessão, não um canal externo.

Decisões:

1. Classificar agente por allowlist canônica e/ou prefixo `Trilha -` / `Tutor -`
   (ver `10_AGENT_USAGE_DASHBOARD.md`).
2. Agregar uso **somente** em `GET /api/dashboard_summary` (campo aditivo
   `agent_usage`), sem misturar agentes no índice de trilhas de progressão.
3. O painel **não** deve baixar `conversation_logs` brutos no browser para
   montar essas métricas; em falha do endpoint, erro + retry.
4. Não inventar agentes sem `trail_id` confirmado pelo produto.

## Decisão 10 — Login aluno MVP: telefone + código da instituição

Sem Firebase Auth do aluno nesta fase. Identificação via `POST /student/identify`
com `phone_number` + `institution_code` (`institution_id`).
