# AGENTS.md — Crias Trilhas

Instruções obrigatórias para agentes (humanos ou AI) que alterem este repositório.

## Fonte de verdade (SoT)

| Conceito | SoT | Não é SoT |
|----------|-----|-----------|
| Progresso do aluno na trilha | Firestore `student_trails/{sN}_trail_{tN}` | Sessão Chatis, canal, React state |
| Identidade do aluno | `student_id` = `sN` | Telefone (só resolução humana) |
| Regra de próximo conteúdo / wrap advance | Shared Trail Engine (`server/lib/trail-engine/**`, Wave A+) | Grafo Chatis, views React |
| Tutores / Superagentes | Chatis (WhatsApp) na v1 app | Motor de progressão curricular |

**Um aluno = um cursor por trilha (I1).** WhatsApp e app Trilha **nunca** duplicam progresso.

## Invariantes omnichannel (I1–I10)

Contrato completo: [`specs/11_OMNICHANNEL_INVARIANTS.md`](specs/11_OMNICHANNEL_INVARIANTS.md).

Resumo: I1 um cursor · I2 id `sN` · I3 Chatis não quebra · I4 motor no servidor · I5 JSON versionável sem reset · I6 telefone não-destrutivo · I7 advance idempotente · I8 AuthZ próprio progresso · I9 UI Trilha ≠ clone WA · I10 ≥3 ciclos de teste.

## Proibições (não quebrar)

1. **Não** implementar lógica de wrap / `next_action` / composição de conteúdo no frontend ou só no JSON Chatis quando o motor existir — usar o motor (I4).
2. **Não** remover nem alterar semanticamente paths Chatis 2.4 (`PUT ?action=…`, `GET /student?phone_number=` → `{}` em miss) até cutover 2.5+ (I3). Ver [`specs/13_CHATIS_STRANGLER_CONTRACT.md`](specs/13_CHATIS_STRANGLER_CONTRACT.md).
3. **Não** escrever segundo cursor por canal; canal vai em logs / `last_channel` apenas.
4. **Não** usar telefone como FK; normalização é lookup com variantes primeiro — **nunca** sobrescrever doc no lookup (I6). Ver [`specs/14_PHONE_NORMALIZATION.md`](specs/14_PHONE_NORMALIZATION.md).
5. **Não** resetar `current_*` de alunos in-progress por upgrade de JSON Chatis (I5).
6. **Não** deixar o app Trilha mutar `student_trails` via Client SDK — só API/motor (I8).
7. **Não** criar runtime em `server/lib/trail-engine/**` fora da Wave A dedicada; Wave 0 é docs/contratos. Evitar conflitos com o peer Wave A.

## Contratos a ler antes de codar progressão

1. [`specs/11_OMNICHANNEL_INVARIANTS.md`](specs/11_OMNICHANNEL_INVARIANTS.md)
2. [`specs/12_SHARED_TRAIL_ENGINE.md`](specs/12_SHARED_TRAIL_ENGINE.md)
3. [`specs/13_CHATIS_STRANGLER_CONTRACT.md`](specs/13_CHATIS_STRANGLER_CONTRACT.md)
4. [`specs/14_PHONE_NORMALIZATION.md`](specs/14_PHONE_NORMALIZATION.md)
5. [`docs/omnichannel-architecture.md`](docs/omnichannel-architecture.md)
6. Specs SSVC existentes: `04_API_CONTRACT`, `05_ACTION_ROUTING_MAP`, `06_CHATIS_INTEGRATION`

## Arquitetura UI (design boundaries)

Ver [`ARCHITECTURE_RULES.md`](ARCHITECTURE_RULES.md): `design/**` só apresentação; containers em `pages/` / `lib/`.

## Metodologia

SSVC: atualizar spec → `tests.yaml` → `TASKS.md` → implementar fatia mínima → verificar. Índice: [`SSVC_README.md`](SSVC_README.md).

## Telefone de teste omnichannel

`5512974085258` — não usar em testes destrutivos em massa sem inventário.
