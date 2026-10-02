# Player Web do Aluno — Crias Trilhas

## 1. Objetivo

Permitir que o aluno autentique-se e consuma o próximo conteúdo da trilha em um app web, sem Firestore Client no player.

A lógica de progressão e liberação fica na API. O app aluno apenas renderiza o payload e solicita avanço.

## 2. Autenticação (MVP)

Login por:

- `phone_number` (normalizado, só dígitos)
- `institution_code` — código da instituição (o `institution_id` já existente)
- `password` — senha definida pelo admin (hash `password_hash` em Firestore via scrypt; ver `server/lib/studentPassword.ts`)

Endpoint:

```text
POST /student/identify
```

Body:

```json
{
  "phone_number": "5512999990000",
  "institution_code": "inst_1",
  "password": "senha-do-aluno"
}
```

Respostas:

- `ok` — aluno ativo encontrado na instituição
- `not_found` — telefone/instituição sem match
- `inactive_student` — aluno inativo
- `inactive_institution` — instituição inativa

Não usa Firebase Auth do aluno: credencial é telefone + instituição + senha armazenada com hash no documento `students`.

## 3. Conceitos (domínio inalterado)

### Stage

Fase vertical da trilha (`trail_stages`), tipos: `ai` | `fixed` | `exercise`.

### Question

Eixo horizontal (`trail_stage_questions`). Questão N percorre stages 1…M; depois questão N+1 recomeça no stage 1.

### StudentTrail

Progresso em `student_trails`: `current_stage_number`, `current_question_number`, `status`.

## 4. Regra de avanço

Se stage atual &lt; total de stages:

```text
next_stage_number = current_stage_number + 1
next_question_number = current_question_number
```

Se stage atual = total de stages:

```text
next_stage_number = 1
next_question_number = current_question_number + 1
```

Se não houver próxima questão:

```text
completed = true
```

## 5. Próximo conteúdo

```text
GET /student_trails/next-content?student_id={id}&trail_id={id}
```

Resposta `ok`:

```json
{
  "status": "ok",
  "student_id": "s1",
  "trail_id": "t1",
  "stage_number": 1,
  "question_number": 1,
  "stage_type": "fixed",
  "stage_title": "Contexto",
  "prompt": null,
  "content": "Texto a ser entregue",
  "options": null,
  "explanation": null,
  "is_released": true,
  "next_action": "deliver_content"
}
```

Status possíveis:

- `ok` — conteúdo liberado e ativo
- `blocked` — stage/questão sem `is_released` ou inativos
- `completed` — trilha concluída ou sem próximo conteúdo
- `not_found` — aluno/trilha/vínculo ausente
- `inactive_student` / `inactive_trail`

## 6. Renderização por `stage_type`

### `fixed`

Exibir `content` (e `stage_title` se houver). CTA: Continuar → `POST advance`.

### `ai`

Exibir conteúdo gerado a partir de `prompt` + `content` (MVP: mostrar `content` e/ou `prompt` como texto da etapa). CTA: Continuar → advance.

### `exercise`

Exibir enunciado (`content`) e `options` quando existirem. Aluno responde; em seguida chama advance (validação de gabarito pode usar `exercise_attempts` quando disponível).

## 7. Avanço

```text
POST /student_trails/advance
```

Body:

```json
{
  "student_id": "s1",
  "trail_id": "t1"
}
```

Resposta:

```json
{
  "status": "ok",
  "next_stage_number": 2,
  "next_question_number": 1,
  "completed": false
}
```

A API aplica a grade, checa liberação do destino e atualiza `student_trails`.

## 8. Lista de trilhas do aluno

```text
GET /student_trails?student_id={id}
```

Retorna vínculos `student_trails` do aluno (status, posição, `trail_id`).

## 9. Estados de UI

| Estado | Quando | UI |
|--------|--------|-----|
| Login | Sem sessão | Telefone + código instituição |
| Lista vazia | Sem `student_trails` | Mensagem “nenhuma trilha vinculada” |
| Bloqueado | `status=blocked` ou next-content `blocked` | Conteúdo ainda não liberado |
| Concluído | `status=completed` ou next-content `completed` | Trilha concluída |
| Player | `ok` | Render por `stage_type` |

## 10. Regra de ouro

O app aluno não decide progressão nem contorna `is_released`. A API retorna o próximo estado.
