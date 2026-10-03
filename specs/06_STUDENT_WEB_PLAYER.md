# Player Web do Aluno — Crias Trilhas

## 1. Objetivo

Permitir que o aluno autentique-se e consuma o próximo conteúdo da trilha em um app web (`/aluno`), sem Firestore Client no player.

A lógica de progressão, liberação e geração de IA fica na API. O app aluno renderiza o histórico, o payload e solicita avanço / Maria / tentativas de exercício.

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
- `password_not_set` / `invalid_credentials` — senha ausente ou incorreta

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

Para `stage_type=ai`, a API chama `ensureTrailAiContent` (Gemini Vertex) e devolve o texto gerado em `content` (idempotente via `conversation_logs`).

Status possíveis:

- `ok` — conteúdo liberado e ativo
- `blocked` — stage/questão sem `is_released` ou inativos
- `completed` — trilha concluída ou sem próximo conteúdo
- `not_found` — aluno/trilha/vínculo ausente
- `inactive_student` / `inactive_trail`

## 6. Histórico do chat

```text
GET /student_trails/history?student_id={id}&trail_id={id}
```

Lista `conversation_logs` do aluno+trilha (ordenação em memória). O player carrega o histórico ao abrir a trilha e grava novas bolhas (entrega, Continuar, exercício, Maria).

Também: `POST /conversation_logs` para persistir mensagens avulsas do cliente.

## 7. Renderização por `stage_type`

### `fixed`

Exibir `content` (e `stage_title` se houver). Botão **Continuar** → `POST advance`.

### `ai`

Gerar conteúdo com o prompt gerador (`specs/prompts/prompt_gerador_trilha_maria_unica_tutora.md`) + variáveis:

| Variável | Fonte |
|---|---|
| `NAME` | primeiro nome de `students.name` |
| `SCHOOL_GRADE` | `students.school_grade` |
| `STUDENT_LEVEL` | `students.student_level` |
| `CONTEXT` | `conversation_logs` recentes |
| `PROMPT` / `CONTENT` | stage/question |

Modelo: Vertex `projects/crias-mvp/locations/global/publishers/google/models/gemini-3.7-flash:generateContent` com `maxOutputTokens: 8000`.

CTA: **Continuar** → advance.

Endpoints auxiliares:

```text
POST /student_trails/ensure-ai
```

### `exercise`

Exibir enunciado (`content`) e **um botão clicável por item** de `options[]` (quantidade = `options.length`).

Ao clicar:

1. `POST /exercise_attempts` (registra attempt + `is_correct`)
2. Mostra feedback (`explanation` / resultado)
3. Exibe botão **Continuar** → advance

## 8. Free-text → Maria (sem avançar)

Se o aluno envia texto no composer e **não** é Continuar (botão) nem a palavra `"continuar"` (case-insensitive):

```text
POST /student_trails/maria
```

Body:

```json
{
  "student_id": "s1",
  "trail_id": "t1",
  "message": "O que é fração?"
}
```

Usa o prompt tutora (`specs/prompts/prompt_maria_tutora_crias.md`) + Gemini, grava pergunta e resposta em `conversation_logs`, **não** chama advance.

## 9. Avanço

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

Disparado pelo botão Continuar ou pelo texto `"continuar"`.

## 10. Lista de trilhas do aluno

```text
GET /student_trails?student_id={id}
```

Retorna vínculos `student_trails` do aluno (status, posição, `trail_id`).

## 11. Estados de UI

| Estado | Quando | UI |
|--------|--------|-----|
| Login | Sem sessão | Telefone + código instituição + senha |
| Lista vazia | Sem `student_trails` | Mensagem “nenhuma trilha vinculada” |
| Bloqueado | `status=blocked` ou next-content `blocked` | Conteúdo ainda não liberado |
| Concluído | `status=completed` ou next-content `completed` | Trilha concluída |
| Player | `ok` | Histórico + render por `stage_type` + Continuar / opções / Maria |

## 12. Regra de ouro

O app aluno não decide progressão nem contorna `is_released`. A API retorna o próximo estado. Texto livre fala com Maria; só Continuar avança a trilha.
