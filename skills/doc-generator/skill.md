# Skill: Doc Generator

## Quando usar

Use ao final de uma implementacao, mudanca de API, mudanca de modelo ou mudanca de fluxo.

## Objetivo

Gerar documentacao curta, pratica e alinhada com as specs.

## Arquivos que deve ler

- specs/00_PROJECT_OVERVIEW.md
- specs/01_DOMAIN_MODEL.md
- specs/03_FIRESTORE_MODEL.md
- specs/04_API_CONTRACT.md
- specs/05_ACTION_ROUTING_MAP.md
- specs/06_CHATIS_INTEGRATION.md
- specs/09_DECISIONS.md

## Procedimento

1. Identificar o tema documentado.
2. Confirmar a fonte de verdade na spec.
3. Criar ou atualizar arquivo em docs.
4. Usar exemplos curtos.
5. Separar o que esta implementado do que esta planejado.
6. Atualizar links internos quando necessario.

## Restricoes

- Nao documentar suposicao como fato.
- Nao esconder pendencias.
- Nao contradizer specs.

## Saida esperada

- usage.md, architecture.md, firestore-schema.md, api-routing.md ou docs do player atualizados.