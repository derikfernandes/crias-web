# Crias Trilhas — SSVC Documentation Index

Este repositório usa a metodologia SSVC — Skill-Spec Vibe Coding.

## Specs

- `specs/00_PROJECT_OVERVIEW.md`: visão geral do projeto.
- `specs/01_DOMAIN_MODEL.md`: modelo de domínio.
- `specs/02_USER_FLOWS.md`: fluxos de usuário.
- `specs/03_FIRESTORE_MODEL.md`: modelo Firestore.
- `specs/04_API_CONTRACT.md`: contrato de API.
- `specs/05_ACTION_ROUTING_MAP.md`: mapa ação -> Firestore/API.
- `specs/06_CHATIS_INTEGRATION.md`: integração com Chatis.
- `specs/07_ACCEPTANCE.md`: critérios de aceite.
- `specs/08_OUT_OF_SCOPE.md`: fora de escopo.
- `specs/09_DECISIONS.md`: decisões arquiteturais.
- `specs/10_AGENT_USAGE_DASHBOARD.md`: dashboard de uso de agentes.
- `specs/11_OMNICHANNEL_INVARIANTS.md`: invariantes I1–I10 (omnichannel).
- `specs/12_SHARED_TRAIL_ENGINE.md`: contrato do Shared Trail Engine.
- `specs/13_CHATIS_STRANGLER_CONTRACT.md`: strangler 2.4 vs fachada next-content.
- `specs/14_PHONE_NORMALIZATION.md`: política de telefone não-destrutiva.
- `specs/tests.yaml`: testes agnósticos da metodologia.
- `specs/TASKS.md`: plano de execução.

Agentes: `AGENTS.md` · regras Cursor: `.cursor/rules/omnichannel-sot.mdc`.

## Skills

- `skills/sdd-planner/skill.md`
- `skills/firestore-modeler/skill.md`
- `skills/trail-flow-builder/skill.md`
- `skills/frontend-react-builder/skill.md`
- `skills/api-contract-builder/skill.md`
- `skills/chatis-integration-builder/skill.md`
- `skills/qa-verifier/skill.md`
- `skills/doc-generator/skill.md`

## Docs

- `docs/architecture.md`
- `docs/firestore-schema.md`
- `docs/api-routing.md`
- `docs/chatis-flow.md`
- `docs/ssvc-methodology.md`
- `docs/omnichannel-architecture.md`: resumo estável omnichannel (Waves 0–D)
- `docs/phone-normalization.md`
- `docs/chatis-strangler-contract.md`

## Regra de trabalho

Antes de implementar qualquer nova funcionalidade:

1. Atualize a spec correspondente.
2. Atualize `tests.yaml`.
3. Atualize `TASKS.md`.
4. Escolha a skill apropriada.
5. Implemente apenas a menor fatia possível.
6. Rode verificação com `qa-verifier`.
7. Atualize documentação e decisões.

## Separação operacional

```text
Painel Admin -> Firestore Client SDK (leituras; writes de progresso → motor na Wave B)
Chatis 2.4 -> API HTTP (?action= strangler) -> Trail Engine -> Firestore
App Trilha / Chatis 2.5+ -> next-content/advance -> Trail Engine -> Firestore
```

Essa separação está documentada em `specs/05_ACTION_ROUTING_MAP.md`, `docs/api-routing.md` e `docs/omnichannel-architecture.md`.