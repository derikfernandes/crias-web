# Modelo de criação de trilhas (Crias) e “Criar trilha com IA”

## Como a criação funciona hoje

O fluxo admin (`/trilhas/novo`) é um wizard de 3 passos em `TrailForm`:

1. **Base da trilha** — `name`, `subject`, `description`, `active`, instituição.
2. **Estrutura (fases)** — lista ordenada de fases (`StructurePhase`): título, `stage_type` (`ai` | `fixed` | `exercise`) e, se `ai`, o **comando global** (`prompt`).
3. **Conteúdos** — etapas (`ContentEtapa`), cada uma com **uma** questão que percorre **todas** as fases; por bloco: conteúdo-base (IA), texto fixo, ou enunciado de exercício + gabarito `1|2|3` (A/B/C).

Persistência (Firestore, via client):

| Coleção | Papel |
|---|---|
| `trails/{tN}` | Metadados + `phase_blueprint` + `default_total_steps_per_stage` (= nº de fases) |
| `trail_stages/{tN}_stage_{k}` | Fase k: `title`, `stage_type`, `prompt` (só IA) |
| `trail_stage_questions/{tN}_stage_{k}_question_{q}` | Bloco da etapa q na fase k: `content`, `correct_option`, etc. |
| `counters/trails` | Próximo id sequencial `tN` |

Funções: `saveTrailWithStructure` (trilha + stages) e `saveTrailContentDraft` (questions). IDs novos só; nunca sobrescreve outra trilha por acidente se `targetTrailId` for `null`.

## Hierarquia conceitual

```
TRILHA → ESTRUTURA FIXA DE FASES → ETAPAS (question_number) → BLOCOS (por stage_number)
```

A estrutura de fases é **única** e se repete em todas as etapas. O que muda é o `content` de cada bloco.

Tipos técnicos: `ai` (comando global + conteúdo-base), `fixed` (mensagem final), `exercise` (enunciado com A/B/C no texto; gabarito `correct_option` = `"1"|"2"|"3"`).

Feedback de exercício na prática é uma fase `ai` imediatamente após `exercise` (ex.: t47 “Programa Aurora”: 6 IAs → exercício → IA Resposta ×3). Encerramento desejável (prompt IA): última fase `fixed`.

## Embeds / mídia

Não há tipo separado. Links Drive/YouTube entram como texto no `content` (fase `fixed` ou conteúdo-base).

## Referência: t47 “Programa Aurora”

- 12 fases: Nova aula → Contextualizando → Introdução → Explicação → Aprofundando → Finalizando → Exercício 1 → Resposta → Exercício 2 → Resposta → Exercício 3 → Resposta Final.
- ~90 aulas (`question_number`), conteúdo-base nas IAs; exercícios com A/B/C no `content` e `correct_option` numérico.

## Feature “Criar trilha com IA”

Entrada alternativa no mesmo `/trilhas/novo`: upload de documentos + prompt (padrão do owner) → API `POST /api/ai_trail_generate` (Gemini/Vertex já usados por Maria/trail-AI) → JSON estruturado → validação → preview → só após confirmação chama os mesmos `saveTrailWithStructure` + `saveTrailContentDraft` (trilha **nova**).

Ver `server/lib/ai-trail-generation/`.
