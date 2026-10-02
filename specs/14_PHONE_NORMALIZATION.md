# Phone Normalization Policy (non-destructive)

**Status:** política congelada (Wave 0)  
**Invariante:** I6  
**Telefone de teste:** `5512974085258`  
**Docs espelho:** `docs/phone-normalization.md`

---

## 1. Canônico (escrita nova)

E.164 BR **sem** `+`: só dígitos com país `55`.

| Tipo | Length | Exemplo |
|------|--------|---------|
| Celular | 13 | `5512974085258` |
| Fixo | 12 | `551234567890` |

---

## 2. Algoritmo compartilhado

Path alvo (Wave A): `server/lib/trail-engine/phoneNormalize.ts`  
Espelho UI (se necessário): `frontend/trilha-admin/src/lib/phoneNormalize.ts` com teste de paridade.

1. Strip `\D` (tudo que não for dígito).
2. Se começa com `55` e length ∈ {12, 13} → canônico.
3. Se length ∈ {10, 11} → prefixar `55`.
4. Escrita nova: rejeitar inválido (**400**); soft-uniqueness → **409**.
5. **Lookup** (ordem; **nunca** sobrescrever doc):
   - Query `Q` (dígitos normalizados da entrada).
   - Se miss e `Q` é `55…`, tentar `Q.slice(2)`.
   - Se miss e local tem 10–11 dígitos, tentar `"55" + Q`.
   - Preferir `active == true` se houver múltiplos candidatos.
   - **Nunca** `update`/`set` o documento só por causa do lookup.

---

## 3. Fases

| Fase | Ação |
|------|------|
| **A** | Lookup com variantes + escrita canônica em creates/updates novos |
| **B** | Script read-only inventário (`scripts/audit-phone-formats.mjs`) |
| **C** | Backfill **opt-in**: só `update phone_number` de 10–11 → `55…`; skip ambíguos |

---

## 4. Proibido

- Renomear `sN` (doc id de aluno).
- Apagar duplicatas automaticamente.
- Tocar `student_trails`, `conversation_logs` ou exercícios no backfill de telefone.
- Tratar telefone como FK / id de progresso (viola I2).
- Normalização destrutiva no lookup (sobrescrever formato armazenado ao resolver).

---

## 5. Relação com paths HTTP

| Path | Comportamento |
|------|----------------|
| Legado `GET /student?phone_number=` | Continua miss → `{}` 200 (I3); internamente deve usar variantes (Wave A) |
| Fachada `GET /student/by-phone/{phone}` | Resolve com variantes; códigos de domínio `not_found` / `inactive_student` conforme contrato motor |

---

## 6. Acceptance

- Aluno cadastrado só com DDD+número (11 dígitos) é encontrado quando a query vem com `55…` e vice-versa.
- Escrita nova persiste canónico `55…`.
- Backfill não corre sem flag/opt-in explícito.
- Telefone de teste resolve para o `sN` esperado sem mutar o doc no lookup.
