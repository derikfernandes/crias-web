# Architecture — Crias Trilhas

## 1. Visao geral

O projeto Crias Trilhas e um painel administrativo para criacao e gestao de trilhas educacionais.

Arquitetura atual:

```text
Painel Admin -> Firebase Client SDK -> Firestore
Chatis -> API HTTP planejada -> Backend -> Firestore
```

## 2. Stack

- React
- TypeScript
- Vite
- React Router
- Firebase / Firestore
- XLSX
- Zod

## 3. Monorepo

Estrutura principal:

```text
crias-trilhas/
  package.json
  frontend/trilha-admin/
```

O workspace principal e `frontend/trilha-admin`.

## 4. Rotas principais

- `/`: inicio e lista de instituicoes.
- `/instituicoes/novo`: nova instituicao.
- `/instituicoes/:id`: detalhe da instituicao.
- `/alunos/novo`: novo aluno.
- `/alunos/:id`: detalhe do aluno.
- `/trilhas/novo`: nova trilha.
- `/trilhas/:id`: detalhe da trilha.
- `/trilhas/:trailId/stages/:stageNumber/questoes`: questoes de um stage.
- `/gerenciamento`: gerenciamento.
- `/doc`: documentacao de API.

## 5. Camadas

### UI

Paginas e componentes React.

### Libs Firestore

Arquivos em `src/lib` que concentram nomes de collections, conversao de snapshots e funcoes auxiliares.

### Types

Arquivos em `src/types` que definem os modelos TypeScript.

### Specs

Pasta `specs/`, que passa a ser a fonte de verdade metodologica.

### Skills

Pasta `skills/`, que define como agentes devem trabalhar no projeto.

## 6. Decisao arquitetural principal

O painel administrativo usa Firestore Client SDK.

Integracoes externas, como Chatis, devem usar API HTTP.

Omnichannel (Trilha ↔ WhatsApp): um cursor em `student_trails`; Shared Trail Engine no servidor; Chatis 2.4 via strangler. Ver `docs/omnichannel-architecture.md` e `AGENTS.md`.

## 7. Riscos conhecidos

- Endpoints documentados da fachada (`next-content` / `advance`) podem ainda nao estar implementados (Wave A).
- Chatis 2.4 usa paths legados; nao remover ate cutover 2.5+.
- Triple-writer de progresso (admin Client + API + futuro app) deve convergir no motor (Wave B).
- Regras de seguranca do Firestore devem ser revisadas se painel continuar usando Client SDK.
- Toda mudanca no modelo precisa ser refletida em specs e docs.