# Spec — Uso de agentes no dashboard

## 1. Objetivo

Exibir no dashboard administrativo o volume de uso dos agentes de IA
(fora da trilha estruturada `tN`), com agregação **somente server-side**,
sem baixar `conversation_logs` brutos no browser, e sem misturar esses
`trail_id` nas métricas de conclusão/acerto das trilhas reais.

## 2. Agentes canônicos

| `trail_id` (exato) | Label PT |
|---|---|
| `Trilha - Matemática` | Matemática |
| `Trilha - Geral` | Geral |
| `Trilha - Humanas` | Humanas |
| `Trilha - Natureza` | Natureza |
| `Tutor - Linguagens` | Linguagens |

### Classificação

Um `trail_id` é **agente** quando:

1. está na allowlist canônica acima; **ou**
2. começa com `Trilha -` ou `Tutor -`.

Um `trail_id` é **trilha real** quando existe na collection `trails` da
instituição (padrão `tN`). Somente trilhas reais entram em
`trail_ids` / `students.answers` / `extra_done` do summary.

Agentes **não** entram no índice de trilhas do summary de progressão.
Não inventar agentes (ex.: Maria Diretora) sem `trail_id` confirmado.

## 3. Endpoint

### `GET /api/dashboard_summary?institution_id=...`

Já existente. Extensão **aditiva** (campos novos; campos atuais
permanecem compatíveis).

Query opcional:

- `period_days` — `0` (padrão, todo o período), `7` ou `30`. Filtra logs
  pela data de criação (`created_at` / `created_at_brasilia`).
- `mode` — omitir/`full` (padrão, resposta histórica) ou `kpis` (payload
  leve: `student_count`, `active_student_count`, `agent_usage`; **sem**
  `students` / `trail_ids`). Ver `04_API_CONTRACT.md`.

Resposta adicional (presente em `full` e em `kpis`):

```json
{
  "agent_usage": {
    "period_days": 0,
    "total_messages": 123,
    "agents": [
      {
        "trail_id": "Trilha - Matemática",
        "label": "Matemática",
        "messages": 40,
        "unique_students": 12,
        "pct_of_total": 32.5,
        "last_activity": "2026-09-18T14:22:01.000Z",
        "student_ids": ["s1", "s2"]
      }
    ],
    "series": [
      { "date": "2026-09-18", "trail_id": "Trilha - Matemática", "messages": 5 }
    ]
  }
}
```

Regras:

- Contar mensagens com `sender=student` cujo `trail_id` seja agente
  (interações do aluno com o tutor). Respostas `system` no alias
  `Trilha - *` são o espelho da IA e **não** entram no total — evita
  dobrar cada turno.
- **Agregar por disciplina (label):** aliases `Trilha - X` e `Tutor - X`
  (mesmo sufixo) formam **uma** linha. Volume = **max** dos aliases
  (não a soma), unir alunos, `last_activity = max`, `trail_ids[]` = aliases,
  `trail_id` = primary (preferir allowlist canônica).
- Incluir `student_stats[]` (`student_id`, `messages`, `last_activity`) para
  drill-down útil.
- `pct_of_total` = `messages / total_messages * 100` (1 casa decimal), ou `0`
  se `total_messages = 0`.
- Incluir na lista as disciplinas canônicas mesmo com zero mensagens
  (ordem: Matemática, Geral, Humanas, Natureza, Linguagens; extras ao final
  por mensagens desc). A **UI** não renderiza barras/zerados.
- `series`: buckets diários (America/Sao_Paulo) por **disciplina** (primary
  `trail_id`), só dias com atividade; vazio se não houver mensagens.
- Continuar **ignorando** `trail_id` de agente no bloco `students` de
  progressão (não indexar em `trail_ids`).

## 4. Performance do dashboard (geral)

- Preferir `/api/dashboard_summary` para métricas de logs.
- **Não** fazer fallback que baixa `conversation_logs` no cliente; em falha,
  exibir erro + retry.
- Onde realtime não for crítico (stages, questões, e dados base do
  dashboard), preferir `getDocs` one-shot em vez de `onSnapshot`.
- **Carga em duas fases (Visão geral):**
  1. Abertura: Firestore (alunos/trilhas/student_trails) +
     `GET …/dashboard_summary?mode=kpis` → libera empty state + 4 cards
     (ativos + tutores; progresso/acerto pedem o full).
  2. Ao clicar num indicador: stages/questões +
     `GET …/dashboard_summary` (`mode=full` / omitido) para painéis e
     % de progresso/acerto.
- Loading: gate inicial até `mode=kpis` (`!initialKpisLoaded`); refetch de
  período nos KPIs mantém último snapshot + badge “Atualizando…”.

## 5. UI — bloco “Tutores de IA” (tab Alunos)

Copy em português. Seção **dentro** da tab Alunos, abaixo dos cards de
conclusão/acerto — não acima das tabs.

### KPIs

- Total de mensagens (período)
- Alunos únicos com tutor
- % da turma (únicos / alunos da instituição)
- Msgs / tutor / dia (proxy; default de período na UI: **30 dias**)

### Gráfico

- Barras horizontais: volume por disciplina, **somente** `messages > 0`.
- Sem pizza de participação; sem série diária all-time.

### Drill-down

Ao selecionar uma disciplina: ranking de alunos com msgs + última atividade
+ link para histórico filtrado (`agent_trail_id` + `agent_trail_ids` com
aliases).

Estados: skeleton (loading sem dados), keep-previous + badge (refetch),
vazio honesto, erro no gate do dashboard.

## 6. Fora de escopo desta spec

- Inventar agentes sem `trail_id`.
- Alterar motor Chatis / gravação de logs.
- Pré-agregação persistida em Firestore (pode entrar em hardening futuro).

## 7. Aceite

- Specs `08`, `09`, `TASKS`, `tests.yaml` atualizados.
- Summary devolve `agent_usage` sem quebrar métricas `tN`.
- Dashboard não baixa logs brutos no cliente para métricas.
- Tabela + gráficos com estados vazios/loading/erro.
- Testes unitários do classificador + agregação; lint, typecheck e build verdes.
