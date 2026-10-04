# SSVC — Skill-Spec Vibe Coding

## 1. Definicao

SSVC e a metodologia usada neste projeto para combinar:

- Spec-Driven Development;
- Agent Skills;
- Vibe coding controlado.

A ideia e manter a velocidade do vibe coding, mas com trilho, contrato, testes e verificacao.

## 2. Fluxo obrigatorio

```text
Ideia -> Spec -> Testes -> Tarefas -> Skill -> Codigo -> Verificacao -> Documentacao
```

## 3. Artefatos principais

### specs

Contem a verdade do projeto.

### skills

Contem os procedimentos reutilizaveis dos agentes.

### docs

Contem documentacao pratica para humanos e operacao.

## 4. Regra principal

Nenhuma funcionalidade nova deve ser implementada sem:

1. spec;
2. teste;
3. tarefa;
4. skill escolhida;
5. criterio de aceite.

## 5. Quando criar nova skill

Criar nova skill quando uma tarefa se repetir em 3 ou mais projetos ou quando uma area exigir procedimento proprio.

Exemplos:

- importacao XLSX;
- criacao de API;
- validacao Firestore;
- fluxo do player web do aluno;
- QA adversarial.

## 6. Como pedir implementacao para agente

Modelo de prompt:

```text
Use a skill [NOME_DA_SKILL].

Leia:
- specs/[SPEC_RELACIONADA]
- specs/tests.yaml
- specs/TASKS.md
- specs/05_ACTION_ROUTING_MAP.md

Implemente apenas a tarefa [X].
Nao implemente nada fora do escopo.
Ao final, informe arquivos alterados, verificacoes feitas e pendencias.
```

## 7. Verificacao

Toda entrega deve passar pela skill `qa-verifier`.

O verificador deve comparar:

- spec;
- testes;
- codigo;
- action routing map;
- criterios de aceite.

## 8. Resultado esperado

O projeto deve evoluir com menos improviso, menos divergencia de regra e mais reutilizacao de conhecimento.