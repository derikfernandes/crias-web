# TASKS — Crias Trilhas

## Fase 0 — Organização SDD

- [x] Criar pasta `/specs`.
- [x] Criar `00_PROJECT_OVERVIEW.md`.
- [x] Criar `01_DOMAIN_MODEL.md`.
- [x] Criar `02_USER_FLOWS.md`.
- [x] Criar `03_FIRESTORE_MODEL.md`.
- [x] Criar `04_API_CONTRACT.md`.
- [x] Criar `05_ACTION_ROUTING_MAP.md`.
- [x] Criar `06_STUDENT_WEB_PLAYER.md`.
- [x] Criar `07_ACCEPTANCE.md`.
- [x] Criar `08_OUT_OF_SCOPE.md`.
- [x] Criar `09_DECISIONS.md`.
- [x] Criar `tests.yaml`.
- [ ] Criar pasta `/skills`.
- [ ] Criar `skill.md` das skills iniciais.
- [ ] Criar pasta `/docs`.

Critério de conclusão:

- Specs existem.
- Skills existem.
- O projeto tem contrato antes de novas alterações de código.

## Fase 1 — Auditoria da base atual

- [ ] Mapear todas as rotas existentes.
- [ ] Mapear todos os componentes de página.
- [ ] Mapear todas as libs Firestore.
- [ ] Mapear todos os types.
- [ ] Comparar código atual com Domain Model.
- [ ] Identificar campos documentados mas não usados.
- [ ] Identificar campos usados mas não documentados.

Critério de conclusão:

- `docs/architecture.md` criado.
- `docs/firestore-schema.md` criado.
- Lista de inconsistências registrada.

## Fase 2 — Padronização do modelo de trilhas

- [ ] Confirmar regra: stage = fase vertical.
- [ ] Confirmar regra: question = avanço horizontal.
- [ ] Confirmar que cada etapa tem exatamente 1 questão no editor atual.
- [ ] Documentar `phase_blueprint`.
- [ ] Documentar ID de stage.
- [ ] Documentar ID de question.
- [ ] Criar testes de progressão.

Critério de conclusão:

- Modelo documentado.
- Testes de avanço definidos.
- Spec do player web do aluno atualizada.

## Fase 3 — Contrato de API

- [ ] Validar endpoints realmente existentes no backend.
- [ ] Separar API administrativa de API conversacional.
- [ ] Criar exemplos de payload.
- [ ] Criar respostas padrão de erro.
- [ ] Criar contrato de autenticação.

Critério de conclusão:

- API Contract fechado.
- Exemplos de payload disponíveis.
- Endpoints necessários para o player aluno definidos.

## Fase 3.5 — Action Routing Map

- [x] Criar `specs/05_ACTION_ROUTING_MAP.md`.
- [x] Separar ações do painel e ações do player aluno.
- [x] Definir quais ações usam Firestore direto.
- [x] Definir quais ações usam API HTTP.
- [x] Definir base URL da API.
- [x] Definir autenticação.
- [x] Definir endpoints obrigatórios para o player aluno.
- [ ] Criar `docs/api-routing.md`.

## Fase 4 — Player web do aluno + API de progresso

- [ ] Definir endpoint de identify (telefone + código instituição).
- [ ] Definir endpoint de trilhas vinculadas do aluno.
- [ ] Definir endpoint de próximo conteúdo.
- [ ] Definir endpoint de avanço de stage/question.
- [ ] Definir payload para `stage_type = ai`.
- [ ] Definir payload para `stage_type = fixed`.
- [ ] Definir payload para `stage_type = exercise`.
- [ ] Criar testes de conclusão de trilha.
- [ ] Scaffold `frontend/cria-frontend`.

Critério de conclusão:

- Player consome próximo conteúdo sem lógica de progressão no cliente.
- Fluxo de avanço está documentado.
- Erros e bloqueios estão previstos.

## Fase 5 — Melhorias do painel

- [ ] Melhorar tela de gerenciamento.
- [ ] Adicionar indicadores básicos.
- [ ] Melhorar UX de criação de trilha.
- [ ] Criar validações visuais mais claras.
- [ ] Criar estado vazio para listas.
- [ ] Criar feedback pós-salvamento.

Critério de conclusão:

- Painel fica utilizável sem explicação externa.
- Erros principais aparecem na tela.
- Fluxo de criação é compreensível.

## Fase 5.5 — Uso de agentes no dashboard + performance

Spec: `specs/10_AGENT_USAGE_DASHBOARD.md`.

- [x] Atualizar `08_OUT_OF_SCOPE.md`, `09_DECISIONS.md`, `tests.yaml`, `TASKS.md`.
- [x] Criar `specs/10_AGENT_USAGE_DASHBOARD.md`.
- [x] Estender `GET /api/dashboard_summary` com `agent_usage` (allowlist canônica).
- [x] Garantir que `trail_id` de agente não entra nas métricas de trilha `tN`.
- [x] Remover fallback cliente que baixa `conversation_logs` no dashboard.
- [x] Reduzir `onSnapshot` onde one-shot basta (stages/questões/dados base).
- [x] Tabela de uso: agente, mensagens, alunos únicos, % total, última atividade.
- [x] Gráficos de volume/share (e série temporal se houver dados).
- [x] Filtro de período (todo / 7 / 30 dias).
- [x] Testes unitários: classificador + agregação + contrato do summary.
- [x] lint + typecheck + build verdes.

Critério de conclusão:

- Dashboard mostra uso dos 5 agentes canônicos sem download de logs no cliente.
- Métricas de trilha real permanecem corretas.
- Testes e checks de qualidade passam.

## Fase 6 — Importação XLSX

- [ ] Definir spec para importação de alunos.
- [ ] Definir colunas aceitas.
- [ ] Criar validação com zod.
- [ ] Criar preview antes de salvar.
- [ ] Criar relatório de erros.
- [ ] Criar salvamento em lote.
- [ ] Criar teste para planilha válida.
- [ ] Criar teste para planilha inválida.

Critério de conclusão:

- Admin importa alunos via XLSX.
- Erros aparecem antes de gravar.
- Nenhum aluno inválido é salvo.

## Fase 7 — Testes e QA

- [ ] Criar testes unitários de normalização.
- [ ] Criar testes de modelagem.
- [ ] Criar testes de progressão.
- [ ] Criar testes de validação de stage_type.
- [ ] Criar checklist manual de UI.
- [ ] Rodar lint.
- [ ] Rodar build.

Critério de conclusão:

- Build passa.
- Lint passa.
- `tests.yaml` tem cobertura mínima dos fluxos críticos.

## Fase 8 — Documentação final

- [ ] Criar `usage.md`.
- [ ] Criar `architecture.md`.
- [ ] Criar `firestore-schema.md`.
- [ ] Criar `student-player-flow.md` (fluxo do player web).
- [ ] Criar guia de operação do painel.
- [ ] Criar guia de troubleshooting Firebase/Vercel.