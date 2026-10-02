# Firestore Schema — Crias Trilhas

## Collections

### institutions

```text
institutions/{institution_id}
```

Campos:

- name: string
- type: string
- active: boolean
- public_link: string opcional
- created_at: timestamp
- updated_at: timestamp

### students

```text
students/{student_id}
```

Campos:

- institution_id: string
- name: string
- phone_number: string (digitos; canonico 55… em escrita nova)
- school_level: string
- school_grade: string
- student_level: 1 | 2 | 3
- active: boolean
- created_at: timestamp
- updated_at: timestamp

### trails

```text
trails/{trail_id}
```

Campos:

- institution_id: string
- name: string
- description: string
- subject: string
- default_total_steps_per_stage: number
- active: boolean
- phase_blueprint: array opcional
- created_at: timestamp
- updated_at: timestamp

### trail_stages

```text
trail_stages/{trail_id}_stage_{stage_number}
```

Campos:

- trail_id: string
- stage_number: number
- title: string
- stage_type: ai | fixed | exercise
- prompt: string | null
- is_released: boolean
- active: boolean
- created_at: timestamp
- updated_at: timestamp

### trail_stage_questions

```text
trail_stage_questions/{trail_id}_stage_{stage_number}_question_{question_number}
```

Campos:

- trail_id: string
- stage_number: number
- question_number: number
- title: string
- content: string
- correct_option: string | null
- options: array | null
- explanation: string | null
- is_released: boolean
- active: boolean
- created_at: timestamp
- updated_at: timestamp

### student_trails

```text
student_trails/{student_id}_trail_{trail_id}
```

Campos:

- student_id, trail_id
- current_stage_number, current_question_number
- status: not_started | in_progress | completed | blocked
- started_at, completed_at, last_interaction_at
- created_at, updated_at
- (Wave A additive) progress_version, last_idempotency_key, last_advance_at, last_channel, last_delivered

SoT unico de progresso (omnichannel I1).

### conversation_logs

Append-only. `trail_id` pode ser curricular (`tN`) ou namespace de tutor (`Trilha - …` / `Tutor - …`).

### exercise_attempts

Tentativas; nao avancam progresso sozinhas.

### counters

```text
counters/trails
counters/students
counters/institutions
```

Campos:

- next: number

## Regras

- `trail_id` deve ser estavel.
- `stage_number` deve ser sequencial dentro da trilha.
- `question_number` representa a progressao horizontal.
- `stage_type = ai` exige prompt.
- `stage_type = fixed` e `exercise` usam prompt nulo.
- Conteudo nao liberado nao deve ser entregue ao aluno.
- Telefone: politica nao-destrutiva em `docs/phone-normalization.md`.
- Omnichannel: `docs/omnichannel-architecture.md`.