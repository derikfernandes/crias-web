# Skill: Trail Flow Builder

## Quando usar

Use para qualquer alteracao na logica de trilhas, stages, questoes e progressao.

## Objetivo

Manter coerencia entre estrutura pedagogica e execucao conversacional.

## Arquivos que deve ler

- specs/01_DOMAIN_MODEL.md
- specs/02_USER_FLOWS.md
- specs/06_CHATIS_INTEGRATION.md
- specs/tests.yaml

## Procedimento

1. Identificar se a alteracao afeta trail, stage, question, release ou progression.
2. Garantir que stage_type seja respeitado.
3. Garantir que IA tenha prompt.
4. Garantir que fixed e exercise tenham prompt nulo.
5. Validar a regra de avanco stage/question.
6. Atualizar testes de progressao.
7. Atualizar documentacao do player se houver impacto externo.

## Restricoes

- O cliente nao deve decidir a progressao sozinho.
- O comportamento fica no stage.
- O conteudo fica na question.

## Saida esperada

- Logica de trilha atualizada.
- Testes de progressao.
- Documentacao do fluxo atualizada.