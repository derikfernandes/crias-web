# Normalização de telefone (não-destrutiva)

Política estável no repositório. Spec canónica: [`specs/14_PHONE_NORMALIZATION.md`](../specs/14_PHONE_NORMALIZATION.md). Invariante **I6**.

## Resumo

- **Canónico (escrita nova):** dígitos E.164 BR sem `+` (`55` + 10/11 locais → length 12/13). Ex.: `5512974085258`.
- **Lookup:** tentar variantes (`55…` ↔ local) **antes** de falhar; preferir `active`; **nunca** sobrescrever o documento no resolve.
- **Backfill:** opt-in apenas; só atualiza `phone_number`; proibido renomear `sN` ou tocar progresso/logs.
- **Paths:** legado Chatis mantém miss → `{}` 200; fachada `by-phone` usa códigos de domínio do motor.

## Fases

A = variantes + escrita canónica · B = inventário read-only · C = backfill opt-in.
