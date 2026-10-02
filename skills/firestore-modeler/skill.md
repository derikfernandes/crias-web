# Skill: Firestore Modeler

## Quando usar

Use quando houver alteracao em entidades, collections, documentos ou regras de persistencia.

## Objetivo

Garantir que o modelo Firestore fique consistente com a spec.

## Arquivos que deve ler

- specs/01_DOMAIN_MODEL.md
- specs/03_FIRESTORE_MODEL.md
- specs/05_ACTION_ROUTING_MAP.md
- specs/tests.yaml

## Procedimento

1. Ler o modelo de dominio.
2. Ler o modelo Firestore.
3. Identificar entidades afetadas.
4. Definir collection, documento, campos e defaults.
5. Verificar impacto em queries e telas.
6. Atualizar testes.
7. Registrar decisoes quando houver mudanca estrutural.

## Restricoes

- Nao alterar nomes de campos existentes sem plano de migracao.
- Nao criar subcollections sem justificativa.
- Nao alterar IDs sem revisar o contrato do player web.

## Saida esperada

- Modelo Firestore atualizado.
- Impactos listados.
- Testes atualizados.