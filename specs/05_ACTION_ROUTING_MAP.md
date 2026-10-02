# Action Routing Map — Crias Trilhas

## 1. Objetivo

Este arquivo define, para cada caso de uso, qual fonte de dados deve ser consultada ou alterada.

Ele responde à pergunta:

> Quando o agente, painel ou Chatis precisa fazer uma ação, qual API ou collection deve consultar ou gravar?

## 2. Modos de acesso

### Firestore Client Mode

Usado pelo painel administrativo atual.

O frontend acessa Firestore diretamente via Firebase SDK.

### API HTTP Mode

Usado por integrações externas, como Chatis e WhatsApp.

A integração chama endpoints HTTP. O backend acessa Firestore com camada segura.

## 3. Regra geral

```text
Painel Admin -> Firebase SDK -> Firestore
Chatis / WhatsApp -> API HTTP -> Backend -> Firestore
Integrações externas -> API HTTP -> Backend -> Firestore
```

## 4. Bases

### Firestore collections

- `institutions`
- `students`
- `trails`
- `trail_stages`
- `trail_stage_questions`
- `counters`

### API base URL

- Desenvolvimento: variável de ambiente definida no frontend/backend.
- Produção: variável de ambiente definida no deploy.

Nome sugerido:

```text
VITE_API_BASE_URL
```

### Header de autenticação

```text
Authorization: Bearer <token>
```

## 5. Mapa de ações

### Criar instituição

Origem: painel administrativo.

Modo atual: Firestore Client.

Destino Firestore:

```text
institutions/{institution_id}
```

Endpoint equivalente, se API:

```text
POST /institution/
```

Campos:

- `name`
- `type`
- `active`
- `public_link`
- `created_at`
- `updated_at`

### Listar instituições

Origem: painel administrativo.

Modo atual: Firestore Client.

Destino Firestore:

```text
institutions
```

Endpoint equivalente, se API:

```text
GET /institution/
```

### Criar aluno

Origem: painel administrativo.

Modo atual: Firestore Client.

Destino Firestore:

```text
students/{student_id}
```

Endpoint equivalente, se API:

```text
POST /student/
```

Campos:

- `institution_id`
- `name`
- `phone_number`
- `school_level`
- `school_grade`
- `student_level`
- `active`
- `created_at`
- `updated_at`

### Buscar aluno pelo telefone

Origem: Chatis.

Modo: API HTTP.

Endpoint:

```text
GET /student/by-phone/{phone_number}
```

Entrada:

- `phone_number`

Saída:

- `student_id`
- `institution_id`
- `name`
- `active`

Regra:

- Se aluno não existir, retornar `not_found`.
- Se aluno estiver inativo, retornar `inactive_student`.

### Criar trilha

Origem: painel administrativo.

Modo atual: Firestore Client.

Destinos Firestore:

```text
trails/{trail_id}
trail_stages/{trail_id}_stage_{stage_number}
```

Endpoint equivalente, se API:

```text
POST /trails/
```

Regra:

- Criar documento da trilha.
- Criar documentos dos stages.
- Incrementar `counters/trails.next` quando usar id sequencial.

### Criar conteúdo de trilha

Origem: painel administrativo.

Modo atual: Firestore Client.

Destino Firestore:

```text
trail_stage_questions/{trail_id}_stage_{stage_number}_question_{question_number}
```

Endpoint equivalente, se API:

```text
POST /trail_stage_questions/
```

### Buscar próximo conteúdo da trilha

Origem: Chatis.

Modo: API HTTP.

Endpoint:

```text
GET /student_trails/next-content
```

Query:

- `student_id`
- `trail_id` opcional

Saída:

- `student_id`
- `trail_id`
- `stage_number`
- `question_number`
- `stage_type`
- `prompt`
- `content`
- `options`
- `explanation`
- `is_released`
- `next_action`

Regra:

- Se stage/conteúdo não estiver liberado, retornar `blocked`.
- Se não houver próximo conteúdo, retornar `completed`.

### Avançar aluno na trilha

Origem: Chatis.

Modo: API HTTP.

Endpoint:

```text
POST /student_trails/advance
```

Body:

- `student_id`
- `trail_id`

Saída:

- `next_stage_number`
- `next_question_number`
- `completed`

Regra:

- Se `stage_number < total_stages`, avançar stage.
- Se `stage_number == total_stages`, voltar stage para 1 e avançar question.
- Se não houver próxima question, marcar concluído.

### Carregar métricas do dashboard (progressão + uso de agentes)

Origem: painel administrativo.

Modo: API HTTP (agregação server-side).

Endpoint:

```text
GET /api/dashboard_summary?institution_id={id}&period_days={0|7|30}&mode={full|kpis}
```

- `mode` omitido ou `full` — contrato histórico (default não-breaking).
- `mode=kpis` — payload leve para cards iniciais (sem mapa `students`).

Fonte Firestore (somente leitura):

```text
students, trails, conversation_logs
```

Saída:

- `full`: agregados de respostas/progressão por aluno nas trilhas reais +
  `agent_usage`.
- `kpis`: `student_count`, `active_student_count`, `agent_usage` (sem
  progressão).

Regra:

- `trail_id` de agente não entra em `trail_ids` de progressão.
- Painel não deve baixar `conversation_logs` brutos para montar essas métricas.
- Evoluções deste endpoint devem ser **aditivas**; default sem `mode` =
  resposta `full` histórica.

## 6. Regra de manutenção

Toda nova ação deve ser adicionada a este mapa antes da implementação.

Toda alteração de endpoint ou collection deve atualizar este arquivo.