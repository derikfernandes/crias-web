# Firestore Model — Crias Trilhas

## Regra geral

O painel administrativo usa Firestore Client SDK para leitura e escrita.
Integrações externas, como Chatis, devem usar API HTTP, que por sua vez acessa Firestore via backend/admin SDK.

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
- `phone_number`: string de dígitos; escrita nova canónica `55…` (ver `specs/14_PHONE_NORMALIZATION.md`); lookup com variantes (I6)
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

Campos (atuais):

- `student_id`: string (`sN`)
- `trail_id`: string (`tN` curricular — não misturar com namespaces tutor)
- `current_stage_number`: number
- `current_question_number`: number
- `status`: `not_started` | `in_progress` | `completed` | `blocked`
- `started_at`: timestamp | null
- `completed_at`: timestamp | null
- `last_interaction_at`: timestamp | null
- `created_at`: timestamp
- `updated_at`: timestamp

Campos additive (Wave A — Shared Trail Engine; defaults seguros):

- `progress_version`: number (default `0`)
- `last_idempotency_key`: string | null
- `last_advance_at`: timestamp | null
- `last_channel`: `whatsapp` | `app` | `admin` | null
- `last_delivered`: `{ stage_number, question_number, content_fingerprint }` | null

SoT de progresso omnichannel (I1). Canal não duplica cursor.

### `conversation_logs`

Documento: id auto.

Campos típicos:

- `student_id`, `trail_id` (curricular `tN` **ou** namespace tutor `Trilha - …` / `Tutor - …`)
- `stage_number`, `question_number`
- `sender`: `system` | `student`
- `message_text`
- `institution_id` opcional
- `message_type`, `metadata` opcionais (ex. `channel`)
- `created_at`, `created_at_brasilia`

### `exercise_attempts`

Documento: id auto.

Tentativas de exercício; **não** avançam `student_trails` sozinhas (advance fica no motor / fluxo explícito).

### `counters`

Documentos:

```text
counters/trails
counters/students
counters/institutions
```

Campos:

- `next`: number

Uso:

- gerar ids sequenciais `tN`, `sN`, `iN`.

### Satélite opcional (Wave A+)

```text
idempotency_keys/{studentId}_{trailId}_{key}
```

- `response_snapshot`, `created_at`, `expires_at`

## Regras de modelagem

- Não criar novos campos sem atualizar esta spec.
- Não alterar nomes de collections sem plano de migração.
- Não alterar padrão de ids sem revisar integração Chatis.
- Campos consumidos por API externa devem ser estáveis.
- Omnichannel: ver `specs/11_OMNICHANNEL_INVARIANTS.md` e `specs/12_SHARED_TRAIL_ENGINE.md`.