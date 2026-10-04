# Skill: API Contract Builder

## Quando usar

Use quando criar, alterar ou documentar endpoints.

## Objetivo

Manter contrato de API consistente entre painel, backend, app aluno e documentacao.

## Arquivos que deve ler

- specs/04_API_CONTRACT.md
- specs/05_ACTION_ROUTING_MAP.md
- specs/06_CHATIS_INTEGRATION.md
- specs/tests.yaml

## Procedimento

1. Identificar endpoint afetado.
2. Definir metodo, path, auth, params, body e responses.
3. Atualizar Action Routing Map.
4. Atualizar testes.
5. Verificar compatibilidade com o player web do aluno.
6. Registrar decisao se endpoint existente mudar.

## Restricoes

- Nao mudar endpoint existente sem registrar decisao.
- Nao remover campo consumido pelo player web do aluno.
- Nao documentar endpoint como implementado se ele for apenas planejado.

## Saida esperada

- Contrato de API atualizado.
- Exemplos de payload.
- Regras de erro documentadas.