# Firestore Model — Crias Trilhas

## Regra geral

O painel administrativo usa Firestore Client SDK para leitura e escrita.
O app web do aluno e demais consumidores externos usam API HTTP, que acessa Firestore via backend/admin SDK.

## Collections

### `institutions`

Documento:

```text
institutions/{institution_id}
```

Campos:

- `name`: string
- `type`: string
- `active`: boolean
- `public_link`: string opcional
- `created_at`: timestamp
- `updated_at`: timestamp

### `students`

Documento:

```text
students/{student_id}
```

Campos:

- `institution_id`: string
- `name`: string
- `phone_number`: string normalizada
- `school_level`: string
- `school_grade`: string
- `student_level`: 1 | 2 | 3
- `active`: boolean
- `created_at`: timestamp
- `updated_at`: timestamp

### `trails`

Documento:

```text
trails/{trail_id}
```

Campos:

- `institution_id`: string
- `name`: string
- `description`: string
- `subject`: string
- `default_total_steps_per_stage`: number
- `active`: boolean
- `phase_blueprint`: array opcional
- `created_at`: timestamp
- `updated_at`: timestamp

### `trail_stages`

Documento:

```text
trail_stages/{trail_id}_stage_{stage_number}
```

Campos:

- `trail_id`: string
- `stage_number`: number
- `title`: string
- `stage_type`: `ai` | `fixed` | `exercise`
- `prompt`: string | null
- `is_released`: boolean
- `active`: boolean
- `created_at`: timestamp
- `updated_at`: timestamp

### `trail_stage_questions`

Documento:

```text
trail_stage_questions/{trail_id}_stage_{stage_number}_question_{question_number}
```

Campos:

- `trail_id`: string
- `stage_number`: number
- `question_number`: number
- `title`: string
- `content`: string
- `correct_option`: string | null
- `options`: array | null
- `explanation`: string | null
- `is_released`: boolean
- `active`: boolean
- `created_at`: timestamp
- `updated_at`: timestamp

### `student_trails`

Documento:

```text
student_trails/{student_id}_trail_{trail_id}
```

Campos:

- `student_id`: string
- `institution_id`: string
- `trail_id`: string
- `current_stage_number`: number (>= 1)
- `current_question_number`: number (>= 1)
- `status`: `not_started` | `in_progress` | `completed` | `blocked`
- `started_at`: timestamp | null
- `completed_at`: timestamp | null
- `last_interaction_at`: timestamp | null
- `created_at`: timestamp
- `updated_at`: timestamp

Uso:

- progresso canônico do aluno na trilha;
- consumido pelo player web via `next-content` / `advance`;
- administrável no painel (vínculo, posição, block/complete).

### `counters`

Documento:

```text
counters/trails
```

Campos:

- `next`: number

Uso:

- gerar ids sequenciais `t1`, `t2`, `t3`.

## Regras de modelagem

- Não criar novos campos sem atualizar esta spec.
- Não alterar nomes de collections sem plano de migração.
- Não alterar padrão de ids sem revisar o contrato do player web e da API.
- Campos consumidos pela API do aluno devem ser estáveis.