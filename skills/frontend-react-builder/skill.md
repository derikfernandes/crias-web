# Skill: Frontend React Builder

## Quando usar

Use para criar ou alterar telas, componentes, rotas ou estados visuais.

## Objetivo

Implementar UI em React respeitando a spec, o modelo de dados e o Action Routing Map.

## Arquivos que deve ler

- specs/02_USER_FLOWS.md
- specs/05_ACTION_ROUTING_MAP.md
- specs/07_ACCEPTANCE.md
- frontend/crias-painel/src/App.tsx

## Procedimento

1. Ler o fluxo afetado.
2. Verificar se a acao usa Firestore Client ou API HTTP.
3. Identificar pagina, componente ou lib afetada.
4. Implementar estado de loading.
5. Implementar estado de erro.
6. Implementar estado vazio.
7. Garantir navegacao correta.
8. Atualizar docs se a rota ou comportamento mudar.

## Restricoes

- Nao criar rota fora da spec.
- Nao mudar campo Firestore sem atualizar spec.
- Nao esconder regra de negocio complexa dentro de componente visual.

## Saida esperada

- UI atualizada.
- Estados de erro, loading e vazio tratados.
- Arquivos alterados listados.