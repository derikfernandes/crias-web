# Architecture — Crias Trilhas

## 1. Visao geral

O projeto Crias Trilhas inclui um painel administrativo para criacao e gestao de trilhas educacionais e um app web do aluno para consumir o progresso.

Arquitetura atual:

```text
Painel Admin -> Firebase Client SDK -> Firestore
App aluno web -> API HTTP -> Backend -> Firestore
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
  frontend/cria-frontend/
  api/
  server/lib/
```

Workspaces: `frontend/trilha-admin` e `frontend/cria-frontend`.

## 4. Rotas principais (admin)

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

Paginas e componentes React (admin e player aluno).

### Libs Firestore

Arquivos em `src/lib` (admin) que concentram nomes de collections, conversao de snapshots e funcoes auxiliares.

### API / Server

`api/*.ts` + `server/lib/*` — progresso canônico (`next-content` / `advance`), identify, logs.

### Types

Arquivos em `src/types` que definem os modelos TypeScript.

### Specs

Pasta `specs/`, fonte de verdade metodologica.

### Skills

Pasta `skills/`, que define como agentes devem trabalhar no projeto.

## 6. Decisao arquitetural principal

O painel administrativo usa Firestore Client SDK.

O app aluno usa apenas API HTTP (sem Firestore Client no player).

## 7. Riscos conhecidos

- Endpoints documentados devem ser validados no deploy.
- Regras de seguranca do Firestore devem ser revisadas se painel continuar usando Client SDK.
- Toda mudanca no modelo precisa ser refletida em specs e docs.
- Deploy do monorepo nao deve quebrar o admin ao incluir o app aluno.
