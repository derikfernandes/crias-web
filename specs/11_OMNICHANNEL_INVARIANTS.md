# Omnichannel Invariants — I1–I10

**Status:** congelado (Wave 0)  
**Fonte:** plano de arquitetura omnichannel (`docs/omnichannel-architecture.md`)  
**Obrigatoriedade:** qualquer alteração de progresso, identidade, Chatis ou módulo Trilha deve preservar estes invariantes.

---

## Tabela canônica

| ID | Invariante |
|----|------------|
| **I1** | Um aluno = um progresso por trilha em Firebase (`student_trails/{sN}_trail_{tN}`). Canal (WhatsApp / app) **não** duplica cursor. |
| **I2** | Id canônico do aluno = `sN`. Telefone é chave humana de resolução; nunca substitui `student_id` em FKs. |
| **I3** | WhatsApp/Chatis **não pode quebrar** enquanto o motor compartilhado entra (strangler/fachada; sem big-bang). |
| **I4** | Progressão educacional (próximo conteúdo + advance com wrap) vive no **Shared Trail Engine** no servidor — não no grafo Chatis nem no React. |
| **I5** | Chatis JSON versionável: baseline `[ONLINE]_Crias_2.4.json` → alvo **2.5+** com parser/IR canônico; alunos em progresso migram sem reset. |
| **I6** | Normalização de telefone é **não-destrutiva** (lookup com variantes primeiro; backfill opcional depois). |
| **I7** | `advance` é idempotente e concorrência-seguro (`Idempotency-Key` + `progress_version`). |
| **I8** | Aluno no módulo Trilha só lê/avança o **próprio** progresso (AuthZ por identidade). |
| **I9** | Módulo Trilha = superfície student-facing coerente com o design system admin; **não** é clone de WhatsApp. |
| **I10** | Entrega exige **≥3 ciclos** de teste (técnico → omnichannel → UX/Red Team; +4 se necessário) com evidências. |

---

## Implicações por invariante

### I1 — Um cursor

- SoT de posição: apenas `student_trails`.
- Campos de canal (`last_channel`, logs) são auditoria — **não** criam segundo progresso.
- Proibido: coleção paralela de cursor por canal; vars de sessão Chatis como SoT.

### I2 — Identidade `sN`

- Telefone resolve → `student_id`; FKs e doc ids usam `sN` / `tN`.
- Proibido: usar telefone como id de `student_trails` ou em FKs estáveis.

### I3 — Strangler Chatis

- Não remover `PUT ?action=advance_stage|advance_question|update_position` até 2.5+ validado.
- Paths legados mantêm shape consumido pelo JSON 2.4; campos novos só **additive**.
- `GET /student?phone_number=` continua `{}` (200) em miss — não 404 no path legado.
- Detalhe: `specs/13_CHATIS_STRANGLER_CONTRACT.md`.

### I4 — Motor compartilhado

- Domínio em `server/lib/trail-engine/**` (Wave A).
- Chatis legado e app Trilha chamam as **mesmas** funções de domínio.
- Proibido: reimplementar wrap/composição em React ou no grafo Chatis.
- Contrato: `specs/12_SHARED_TRAIL_ENGINE.md`.

### I5 — Versionamento Chatis

- Upgrade de JSON **não** zera `current_stage_number` / `current_question_number`.
- 2.5 re-hidrata via resolve + status/next-content; não confia em vars de sessão stale.

### I6 — Telefone não-destrutivo

- Política completa: `specs/14_PHONE_NORMALIZATION.md` e `docs/phone-normalization.md`.
- Lookup com variantes **nunca** sobrescreve o doc.

### I7 — Idempotência

- Header `Idempotency-Key` + campo `progress_version` no advance do motor.
- Replay seguro; body incompatível ou version mismatch → 409.

### I8 — AuthZ aluno

- Sessão aluno: `student_id == session.student_id`.
- Chatis: Bearer de serviço.
- App Trilha **não** escreve `student_trails` via Client SDK.

### I9 — UX Trilha ≠ WhatsApp

- Módulo em `frontend/trilha-admin` rotas `/trilha/*`.
- Sem clone de bubbles/thread WA; design system do admin.

### I10 — Ciclos de teste

- Ciclo 1 técnico → 2 omnichannel → 3 UX/Red Team (+4 se preciso).
- Evidências obrigatórias antes de declarar entrega.

---

## Checklist rápido para agentes

Antes de mergear código que toque progresso ou identidade:

1. [ ] Continua a haver **um** doc `student_trails` por `(sN, tN)`?
2. [ ] Chatis 2.4 paths/shapes intactos (ou só additive)?
3. [ ] Wrap / next-content só no servidor (motor)?
4. [ ] Telefone: variantes no lookup; sem rename de `sN`?
5. [ ] Advance com key + version quando via motor?
6. [ ] Aluno não lê/escreve progresso alheio?

Se qualquer item falhar → **não mergear**.
