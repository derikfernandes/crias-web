# Shared Trail Engine — Contrato de domínio

**Status:** contrato-alvo (Wave 0 docs; runtime = Wave A)  
**Path alvo:** `server/lib/trail-engine/**`  
**Invariantes:** I1, I4, I7, I8 — ver `specs/11_OMNICHANNEL_INVARIANTS.md`  
**Não implementar nesta wave:** zero código de produto em `trail-engine/` aqui.

---

## 1. Propósito

Pacote de domínio no servidor, **independente de path HTTP**. Ambos os canais (Chatis legado + app Trilha) chamam as mesmas funções. A API HTTP é fachada; o painel admin migra mutações de posição para o motor (Wave B).

---

## 2. Layout alvo (não criar nesta wave)

```text
server/lib/trail-engine/
  index.ts                 # API pública do motor
  types.ts
  resolveStudent.ts
  enrollment.ts
  getStatus.ts
  getNextContent.ts
  advance.ts
  recordMessage.ts
  submitExercise.ts
  phoneNormalize.ts
  contentFingerprint.ts
  errors.ts
  __tests__/
```

`server/lib/studentTrailService.ts` torna-se **adaptador** que delega mutações de posição ao motor, mantendo assinaturas `advance_stage` / `advance_question` para o strangler (I3).

**Conflito:** Wave A peer implementa o runtime. Wave 0 **não** cria nem edita ficheiros sob `server/lib/trail-engine/**`.

---

## 3. Operações de domínio

| Op | Entrada | Saída | Garante |
|----|---------|-------|---------|
| `resolveStudentByPhone` | telefone | `student_id`, `institution_id`, `active` \| `not_found` \| `inactive_student` | Identidade `sN` (I2) |
| `ensureEnrollment` | `student_id`, `trail_id` | doc progresso | Create idempotente |
| `getStatus` | ids | stage, question, status, `progress_version`, `last_*` | Snapshot versionado |
| `getNextContent` | ids + `channel?` | `stage_type`, conteúdo, `is_released`, `next_action` | **Única** regra de composição (I4) |
| `advance` | ids + `Idempotency-Key` + `expected_version?` + `channel` + `reason` | nova posição + versão | Wrap no servidor; tx Firestore (I7) |
| `recordDelivery` / `recordStudentMessage` | ids + texto + channel + key | log id | Append com dedupe |
| `submitExerciseAnswer` | answer + key | attempt + opcional advance | Avaliar sem divergir cursor |
| `markInteraction` | channel | ok | Heartbeat sem +1 |

### `next_action` (getNextContent)

Valores: `deliver_content` \| `await_answer` \| `blocked` \| `completed` \| `await_release`.

---

## 4. Semântica de `advance` (wrap)

Dentro de uma questão, `TOTAL_STAGE` = `default_total_steps_per_stage` da trilha (ou contagem canónica acordada):

1. Se `current_stage_number < TOTAL_STAGE` → `stage++` (equiv. `advance_stage`).
2. Se `current_stage_number == TOTAL_STAGE` → `stage=1`, `question++` (equiv. wrap + `advance_question`).
3. Se `question > max_questions` → `status=completed`.

Primitivos legados `advance_stage` / `advance_question` / `update_position` permanecem como adapters (strangler) e devem produzir o **mesmo efeito observado** pelo Chatis 2.4.

---

## 5. Campos additive em `student_trails` (Wave A)

```text
progress_version: number                 # default 0; +1 em cada mutação de posição/status
last_idempotency_key: string | null
last_advance_at: timestamp | null
last_channel: "whatsapp" | "app" | "admin" | null
last_delivered: {
  stage_number: number
  question_number: number
  content_fingerprint: string
} | null
```

Satélite opcional: `idempotency_keys/{studentId}_{trailId}_{key}`.

---

## 6. Idempotência e concorrência

### Chave

```text
Idempotency-Key: {channel}:{student_id}:{trail_id}:{intent}:{stage}:{question}:{event_id}
```

Exemplos: `whatsapp:s10:t1:advance:2:1:{wa_msg_id}` · `app:s10:t1:advance:2:1:{uuid}`.

### Regras

1. Mesma key + mesmo efeito → **replay** (200), sem segundo `+1`.
2. Mesma key + body incompatível → **409**.
3. `expected_version` mismatch → **409** + snapshot; cliente re-fetch `getNextContent`.
4. Mutações de posição/status sob **Firestore transaction**; `progress_version++`.
5. Double-advance WA ↔ app: um ganha; o outro 409/replay e sincroniza via `getNextContent`.

---

## 7. Fachada HTTP (Wave A+)

| Path (spec) | Delega a |
|-------------|----------|
| `GET /student/by-phone/:phone` | `resolveStudentByPhone` (alias; manter path legado Chatis) |
| `GET /student_trails/status` | `getStatus` |
| `GET /student_trails/next-content` | `getNextContent` |
| `POST /student_trails/advance` | `advance` |

Handlers: estender `api/student_trails.ts` (+ opcional `api/trail_engine.ts`); rewrites em `vercel.json`.  
Contratos estáticos: `scripts/contract-api-routes.test.mjs`.

Relação com Chatis 2.4: `specs/13_CHATIS_STRANGLER_CONTRACT.md`.

---

## 8. O que **não** é SoT

- Variáveis de sessão Chatis (`CURRENT_*`, `CONTENT`, …) — efêmeras.
- Specs markdown sozinhas — contrato-alvo até o runtime existir.
- Namespaces de tutor em `conversation_logs` (`Trilha - X`, `Tutor - X`) — **não** misturar com cursor curricular `tN`.

---

## 9. Acceptance (Wave A — referência)

- Chatis 2.4 em staging inalterado no telefone de teste `5512974085258`.
- Testes unitários: wrap, idempotency replay, phone variants, getNextContent released/types.
- `npm test` + contract routes OK.
- Zero fork de cursor entre canais (I1).
