# Arquitetura Omnichannel — Crias Trilha ↔ WhatsApp

**Status:** resumo estável no repositório (Wave 0)  
**Plano completo (store do projeto):** contexto de discovery/ADRs no Agent Store do projeto Crias; este ficheiro é a cópia permanente para o repo.  
**Baseline código:** `main` · telefone de teste `5512974085258`

---

## Invariantes I1–I10

Ver [`specs/11_OMNICHANNEL_INVARIANTS.md`](../specs/11_OMNICHANNEL_INVARIANTS.md). Congelados também em [`AGENTS.md`](../AGENTS.md).

---

## Source of truth (Firebase)

| Collection | Doc ID | Papel |
|------------|--------|-------|
| `students` | `s{N}` | Identidade; `phone_number` (dígitos) |
| `student_trails` | `{student_id}_trail_{trail_id}` | **Único** cursor de progresso |
| `trails` / `trail_stages` / `trail_stage_questions` | `tN` / compostos | Currículo |
| `conversation_logs` | auto | Histórico; `trail_id` curricular **ou** namespace tutor |
| `exercise_attempts` | auto | Tentativas (não avançam sozinhas) |

Campos additive futuros em `student_trails`: `progress_version`, `last_idempotency_key`, `last_advance_at`, `last_channel`, `last_delivered` — ver [`specs/12_SHARED_TRAIL_ENGINE.md`](../specs/12_SHARED_TRAIL_ENGINE.md).

Namespaces tutor (`Trilha - …`, `Tutor - …`) **não** misturam com cursor `tN`.

---

## Shared Trail Engine

Domínio em `server/lib/trail-engine/**` (runtime = Wave A). HTTP é fachada.  
Contrato: [`specs/12_SHARED_TRAIL_ENGINE.md`](../specs/12_SHARED_TRAIL_ENGINE.md).

```text
[Admin] --(progress writes Wave B)--> Trail Engine --Admin SDK--> Firestore
[Módulo /trilha/*] --next-content/advance--> Trail Engine ──┘
[Chatis 2.4] --?action= (strangler)--> Trail Engine ────────┘
[Chatis 2.5+] --next-content/advance--> Trail Engine ───────┘
```

---

## Strangler Chatis 2.4

Fachada `next-content` / `advance` / `status` / `by-phone` é **additive**. Primitivos `?action=` permanecem até 2.5+ validado.  
Contrato: [`specs/13_CHATIS_STRANGLER_CONTRACT.md`](../specs/13_CHATIS_STRANGLER_CONTRACT.md).

---

## Telefone (não-destrutivo)

Lookup com variantes primeiro; canónico `55…` em escrita nova; backfill opt-in.  
[`specs/14_PHONE_NORMALIZATION.md`](../specs/14_PHONE_NORMALIZATION.md) · [`docs/phone-normalization.md`](./phone-normalization.md).

---

## ADRs (resumo)

| ADR | Decisão |
|-----|---------|
| 001 | SoT progresso = `student_trails` |
| 002 | Shared Trail Engine + strangler 2.4 |
| 003 | Fachada HTTP additive; `?action=` até 2.5+ |
| 004 | Telefone: variantes + backfill opt-in |
| 005 | `progress_version` + `Idempotency-Key` |
| 006 | Módulo Trilha em `trilha-admin` `/trilha/*` |
| 007 | Tutores ficam no Chatis na v1 app |
| 008 | Mutações de progresso só via API/motor |
| 009 | Parser 2.4→2.5+ sem reset de progresso |
| 010 | AuthZ aluno por `student_id`; Bearer Chatis |

---

## Waves

| Wave | Foco |
|------|------|
| **0** | Docs + contratos (esta entrega) |
| **A** | Trail Engine + strangler + phone variants + fachada |
| **B** | Módulo Trilha app + AuthZ aluno |
| **C** | Chatis 2.5 + parser IR |
| **D** | Hardening + ciclos 3–4 |

## Abertas (produto)

- **U1** Auth aluno v1 (OTP vs magic link / custom token)
- **U2** Tutores no app v1 (default: omitir)
- **U3** Picker de trilha vs `trails[0]` (default: espelhar Chatis)
