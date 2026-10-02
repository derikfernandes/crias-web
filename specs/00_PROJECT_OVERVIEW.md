# Crias Trilhas — Project Overview

## 1. Objetivo

Construir e evoluir um painel administrativo para criação, edição, liberação e gerenciamento de trilhas pedagógicas do Crias, e um app web do aluno para consumir essas trilhas.

O sistema permite que instituições cadastrem alunos e configurem trilhas educacionais compostas por fases, conteúdos fixos, exercícios e etapas com IA.

## 2. Usuários

### Administrador Crias
Pessoa responsável por configurar instituições, alunos, trilhas, fases e conteúdos.

### Instituição
Escola, cursinho, instituto ou organização que terá alunos vinculados a trilhas.

### Aluno
Usuário final que percorre a trilha no app web do aluno (`frontend/cria-frontend`), autenticado por telefone + código da instituição.

## 3. Problema

A criação de trilhas pedagógicas precisa ser organizada de forma clara, repetível e consumível pelo player web.

O sistema deve evitar confusão entre:

- trilha
- etapa
- stage/fase
- questão
- conteúdo fixo
- exercício
- interação com IA

## 4. Resultado esperado

Ao final, o sistema deve permitir:

- criar instituição;
- criar aluno vinculado à instituição;
- criar trilha vinculada à instituição;
- configurar fases da trilha;
- definir se cada fase é IA, texto fixo ou exercício;
- criar conteúdos por questão/etapa;
- liberar ou bloquear conteúdos;
- permitir que o app aluno consulte o próximo conteúdo via API;
- documentar todo o contrato de dados.

## 5. Método de trabalho

Este projeto deve seguir a metodologia SSVC — Skill-Spec Vibe Coding:

1. Pedido bruto.
2. Atualização ou criação de SPEC.
3. Atualização de testes em `tests.yaml`.
4. Atualização de `TASKS.md`.
5. Escolha da Agent Skill adequada.
6. Implementação incremental.
7. Verificação adversarial.
8. Documentação e registro de decisão.

## 6. Regra principal

Nenhuma funcionalidade nova deve ser implementada sem spec, teste e critério de aceite definidos.
