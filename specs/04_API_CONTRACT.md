# API Contract — Crias Trilhas

## 1. Princípio

O painel administrativo atual pode usar Firestore Client SDK.
Integrações externas devem usar API HTTP.

A API deve ser a camada segura para Chatis, WhatsApp e integrações que não devem acessar Firestore diretamente.

## 2. Base URL

Ambientes:

```text
Desenvolvimento: definido por VITE_API_BASE_URL ou variável equivalente do backend.
Produção: definido por VITE_API_BASE_URL em produção.
```

Enquanto não houver backend dedicado, a documentação pode usar a origem pública do app apenas como referência, mas isso não significa que os endpoints estejam implementados.

## 3. Autenticação

Todas as rotas administrativas e conversacionais devem exigir autenticação.

Header sugerido:

```text
Authorization: Bearer <token>
```

## 4. Institution

### `GET /institution/`

Lista instituições.

### `GET /institution/simple`

Lista instituições em formato simplificado.

### `GET /institution/{id}`

Busca instituição por id.

### `POST /institution/`

Cria instituição.

### `PUT /institution/{id}`

Atualiza instituição.

### `DELETE /institution/{id}`

Remove instituição.

## 5. Student

### `GET /student/`

Lista alunos com filtros.

Query params:

- `institution_id`
- `school_level`
- `school_grade`
- `student_level`
- `active`

### `GET /student/simple`

Lista alunos em formato simplificado.

### `GET /student/{id}`

Busca aluno por id.

### `GET /student/by-phone/{phone_number}`

Busca aluno por telefone normalizado.

> Preferir esta rota em vez de `GET /student/{phone_number}` para evitar conflito com busca por id.

### `POST /student/`

Cria aluno.

### `PUT /student/{id}`

Atualiza aluno.

### `DELETE /student/{id}`

Remove aluno.

## 6. Trails

### `GET /trails/`

Lista trilhas com filtros.

Query params:

- `institution_id`
- `active`

### `GET /trails/simple`

Lista trilhas em formato simplificado.

### `GET /trails/{id}`

Busca trilha por id.

### `POST /trails/`

Cria trilha.

### `PUT /trails/{id}`

Atualiza trilha.

### `DELETE /trails/{id}`

Remove trilha.

## 7. Trail Stages

### `GET /trail_stages/`

Lista stages com filtros.

Query params:

- `trail_id`
- `active`
- `is_released`

### `GET /trail_stages/{id}`

Busca stage por id.

### `POST /trail_stages/`

Cria stage.

### `PUT /trail_stages/{id}`

Atualiza stage.

### `DELETE /trail_stages/{id}`

Remove stage.

## 8. Trail Stage Questions

### `GET /trail_stage_questions/`

Lista conteúdos/questões com filtros.

Query params:

- `trail_id`
- `stage_number`
- `question_number`
- `active`
- `is_released`

### `GET /trail_stage_questions/{id}`

Busca conteúdo por id.

### `POST /trail_stage_questions/`

Cria conteúdo.

### `PUT /trail_stage_questions/{id}`

Atualiza conteúdo.

### `DELETE /trail_stage_questions/{id}`

Remove conteúdo.

## 9. Student Trails / Conversational API

Rotas necessárias para Chatis.

### `GET /student_trails/next-content`

Retorna o próximo conteúdo que o aluno deve receber.

Query params:

- `student_id`
- `trail_id` opcional quando houver uma trilha ativa única

Resposta esperada:

```json
{
  "status": "ok",
  "student_id": "s1",
  "trail_id": "t1",
  "stage_number": 1,
  "question_number": 1,
  "stage_type": "fixed",
  "prompt": null,
  "content": "Texto a ser entregue",
  "options": null,
  "explanation": null,
  "is_released": true,
  "next_action": "deliver_content"
}
```

### `POST /student_trails/advance`

Avança o aluno para o próximo stage/question.

Body:

```json
{
  "student_id": "s1",
  "trail_id": "t1"
}
```

Resposta esperada:

```json
{
  "status": "ok",
  "next_stage_number": 2,
  "next_question_number": 1,
  "completed": false
}
```

### `GET /student_trails/status`

Consulta status atual do aluno na trilha.

Query params:

- `student_id`
- `trail_id`

## 10. Respostas de erro padronizadas

```json
{
  "status": "error",
  "code": "not_found",
  "message": "Aluno não encontrado."
}
```

Códigos esperados:

- `not_found`
- `inactive_student`
- `inactive_trail`
- `blocked`
- `completed`
- `invalid_payload`
- `unauthorized`
- `internal_error`

## 11. Dashboard summary (painel)

### `GET /api/dashboard_summary`

Agregação server-side de `conversation_logs` para o dashboard admin.

Query:

- `institution_id` (obrigatório)
- `period_days` (opcional: `0` | `7` | `30`; padrão `0` = todo o período)
- `mode` (opcional, **aditivo**):
  - omitir ou `full` — resposta histórica (default; compatível com o `main`)
  - `kpis` — payload leve para os cards iniciais da Visão geral

#### Resposta `mode=full` (default)

Campos principais (inalterados quando `mode` é omitido):

- `institution_id`, `student_count`, `trail_ids`, `students` — progressão nas
  trilhas reais (`tN` presentes em `trails`).
- `agent_usage` — uso dos agentes canônicos / prefixo `Trilha -` | `Tutor -`
  (ver `10_AGENT_USAGE_DASHBOARD.md`). Não mistura agentes em `trail_ids`.

Não inclui o campo `mode` no JSON (mantém o shape histórico).

#### Resposta `mode=kpis` (aditiva)

```json
{
  "mode": "kpis",
  "institution_id": "…",
  "student_count": 612,
  "active_student_count": 558,
  "agent_usage": { }
}
```

- Não devolve `trail_ids` nem o mapa `students` (progressão).
- Agrega só interações com tutores + contagens de alunos.
- O painel usa este modo na abertura; ao abrir um indicador, chama `mode=full`
  (e carrega stages/questões) sob demanda.

Somente leitura. Não altera coleções.

**Regra de compatibilidade:** qualquer evolução deste endpoint deve ser aditiva.
O default sem `mode` permanece byte-compatível com clientes do `main`.
