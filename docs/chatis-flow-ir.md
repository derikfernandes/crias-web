# Chatis Flow IR (`CriasTrailFlow`)

Wave C — foundation de versionamento. **Discovery-only**: o runtime WhatsApp (Chatis 2.4 strangler) não é alterado por este pacote.

## Pacote

`server/lib/chatis-flow/`

| Módulo | Papel |
|--------|--------|
| `parseChatisExport.ts` | `[ONLINE]_Crias_*.json` → IR |
| `validate.ts` | detecção de versão + schema |
| `migrate.ts` | IR 2.4 → 2.5 (HTTP fachada) |
| `diff.ts` | relatório de mudanças |
| `migrationPolicy.ts` | alunos in-progress sem wipe |

## Versão

Extraída de `builder.name` (ex. `[ONLINE] Crias 2.4` → `2.4`).

## Validators Chatis

Porta `false` no export = **onMatch** no IR (`validatorSemantics: chatis_false_port_is_on_match`).

## Migração de aluno

Upgrade de JSON **não** zera `student_trails`. Ver `STUDENT_MIGRATION_POLICY_DOC` e testes em `__tests__/parser.test.ts`.

## CLI

```bash
npm run validate:chatis-flow
node scripts/validate-chatis-flow.mjs path/to/export.json
```
