# Metodologia SSVC — Skill-Spec Vibe Coding

## 1. Visão geral

A metodologia **SSVC — Skill-Spec Vibe Coding** é um modelo de trabalho para desenvolver sistemas com apoio de inteligência artificial sem cair no improviso típico do vibe coding puro.

Ela combina três elementos:

1. **Vibe Coding**: velocidade, criatividade e capacidade de testar ideias rapidamente com IA.
2. **Spec-Driven Development (SDD)**: disciplina para transformar intenção em especificação versionada, testável e auditável.
3. **Agent Skills**: competências reutilizáveis que ensinam ao agente como executar tipos específicos de tarefa com consistência.

A metodologia parte de uma constatação simples: a IA é muito boa em gerar código, mas pode se perder quando não existe clareza sobre o que deve ser construído, quais regras devem ser respeitadas, quais arquivos devem ser consultados e quais limites não podem ser ultrapassados.

No SSVC, o código deixa de ser o primeiro artefato do projeto. O primeiro artefato passa a ser a **intenção estruturada**.

> Antes de pedir código, escreva a intenção. Antes de aceitar código, verifique contra a intenção.

---

## 2. Problema que a metodologia resolve

O vibe coding tradicional funciona bem para protótipos simples, telas isoladas e experimentações rápidas. O problema aparece quando o projeto começa a crescer.

Sem metodologia, é comum acontecer:

- a IA cria funcionalidades que não foram pedidas;
- o projeto muda de direção sem registro;
- regras de negócio ficam escondidas no histórico do chat;
- endpoints são criados sem contrato;
- campos de banco mudam sem documentação;
- telas funcionam, mas não respeitam o fluxo real;
- a mesma explicação precisa ser repetida em toda conversa;
- a IA não sabe se deve consultar API, Firestore, arquivo, planilha ou outro sistema;
- o código cresce, mas a compreensão do sistema diminui.

O SSVC resolve isso criando uma camada de governança leve, prática e compatível com o uso diário de IA.

Ele não elimina o vibe coding. Ele transforma o vibe coding em um processo com trilho.

---

## 3. Princípio central

O princípio central da metodologia é:

> A IA só deve implementar depois que existir uma especificação mínima, um critério de aceite e uma Skill adequada para orientar a execução.

Todo projeto, funcionalidade ou melhoria deve passar por um fluxo mínimo:

```text
Ideia → Spec → Testes → Tarefas → Skill → Implementação → Verificação → Documentação → Melhoria da Skill
```

Esse fluxo não precisa ser burocrático. Para tarefas pequenas, a spec pode ser curta. Para sistemas grandes, a spec deve ser mais detalhada.

O importante é que a IA nunca trabalhe apenas com uma frase solta como:

```text
faz essa feature
```

Ela deve trabalhar com algo mais parecido com:

```text
implemente esta tarefa, respeitando esta spec, usando esta skill, sem sair deste escopo, e valide contra estes critérios
```

---

## 4. Os três pilares da metodologia

## 4.1. Pilar 1 — Spec-Driven Development

O SDD transforma documentação em contrato de desenvolvimento.

Na metodologia SSVC, a spec não é um documento decorativo. Ela é a fonte de verdade do projeto.

A spec responde:

- o que será construído;
- por que será construído;
- para quem será construído;
- quais fluxos devem existir;
- quais dados entram;
- quais dados saem;
- quais regras de negócio devem ser respeitadas;
- quais erros devem ser tratados;
- o que está fora de escopo;
- como a entrega será aceita.

O objetivo do SDD é reduzir ambiguidade.

Quanto mais ambígua for a intenção, maior a chance de a IA inventar uma solução errada.

## 4.2. Pilar 2 — Agent Skills

Agent Skills são competências reutilizáveis.

Uma Skill é uma pasta que explica como o agente deve executar determinado tipo de tarefa.

Exemplos:

- criar uma API;
- modelar Firestore;
- criar uma tela React;
- verificar qualidade;
- documentar um fluxo;
- integrar o player web do aluno;
- analisar uma base de dados;
- criar importador XLSX.

A Skill evita que a IA comece sempre do zero.

Em vez de dar um prompt enorme toda vez, criamos um procedimento reaproveitável.

## 4.3. Pilar 3 — Vibe Coding Controlado

O vibe coding continua importante porque permite velocidade.

A diferença é que, no SSVC, o vibe coding acontece dentro de limites claros.

O agente pode criar, sugerir, experimentar e implementar, mas sempre respeitando:

- a spec;
- o mapa de ações;
- os testes;
- o escopo;
- as decisões já tomadas;
- a Skill escolhida.

Assim, mantemos a criatividade do vibe coding sem perder controle arquitetural.

---

## 5. Fórmula da metodologia

```text
SSVC = SDD + Agent Skills + Vibe Coding Controlado
```

Ou, de forma operacional:

```text
Intenção estruturada + competência reutilizável + implementação incremental
```

O SDD define **o que** deve ser feito.

As Agent Skills definem **como** o agente deve trabalhar.

O vibe coding controlado executa **rapidamente**, mas sem abandonar o contrato.

---

## 6. Estrutura padrão de projeto

Todo projeto desenvolvido com SSVC deve ter, preferencialmente, a seguinte estrutura:

```text
/projeto
  /specs
    00_PROJECT_OVERVIEW.md
    01_DOMAIN_MODEL.md
    02_USER_FLOWS.md
    03_DATA_MODEL.md
    04_API_CONTRACT.md
    05_ACTION_ROUTING_MAP.md
    06_INTEGRATIONS.md
    07_ACCEPTANCE.md
    08_OUT_OF_SCOPE.md
    09_DECISIONS.md
    TASKS.md
    tests.yaml

  /skills
    /sdd-planner
      skill.md
    /data-modeler
      skill.md
    /api-contract-builder
      skill.md
    /frontend-builder
      skill.md
    /integration-builder
      skill.md
    /qa-verifier
      skill.md
    /doc-generator
      skill.md

  /docs
    architecture.md
    usage.md
    api-routing.md
    integration-flow.md
    troubleshooting.md

  /src
  /tests
```

Nem todo projeto precisa começar com todos os arquivos completos. Mas todo projeto deve ter pelo menos:

- visão geral;
- modelo de domínio;
- mapa de ações;
- tarefas;
- critérios de aceite;
- decisões;
- testes mínimos.

---

## 7. Artefatos da metodologia

## 7.1. PROJECT_OVERVIEW

Arquivo sugerido:

```text
specs/00_PROJECT_OVERVIEW.md
```

Função: explicar o projeto em linguagem clara.

Deve conter:

- objetivo;
- usuários;
- problema;
- resultado esperado;
- contexto;
- regra principal do projeto.

## 7.2. DOMAIN_MODEL

Arquivo sugerido:

```text
specs/01_DOMAIN_MODEL.md
```

Função: definir as entidades principais do sistema.

Deve conter:

- entidades;
- campos;
- significado de cada campo;
- regras de negócio;
- relações entre entidades;
- restrições.

Esse documento impede que a IA confunda conceitos parecidos.

## 7.3. USER_FLOWS

Arquivo sugerido:

```text
specs/02_USER_FLOWS.md
```

Função: descrever como o usuário passa pelo sistema.

Deve conter:

- fluxo principal;
- fluxos alternativos;
- erros esperados;
- critérios de conclusão de cada fluxo.

## 7.4. DATA_MODEL ou FIRESTORE_MODEL

Arquivo sugerido:

```text
specs/03_DATA_MODEL.md
```

ou, em projetos com Firebase:

```text
specs/03_FIRESTORE_MODEL.md
```

Função: definir como o domínio vira persistência.

Deve conter:

- tabelas ou collections;
- documentos;
- campos;
- tipos;
- chaves;
- relacionamentos;
- padrões de ID;
- regras de migração.

## 7.5. API_CONTRACT

Arquivo sugerido:

```text
specs/04_API_CONTRACT.md
```

Função: definir endpoints.

Deve conter:

- base URL;
- autenticação;
- métodos HTTP;
- paths;
- query params;
- body;
- responses;
- erros padronizados;
- exemplos de payload.

Esse documento não deve misturar endpoint planejado com endpoint implementado sem deixar claro.

Se o endpoint ainda não existe, deve ser marcado como planejado.

## 7.6. ACTION_ROUTING_MAP

Arquivo sugerido:

```text
specs/05_ACTION_ROUTING_MAP.md
```

Função: definir qual fonte de dados será usada em cada caso.

Esse é um dos documentos mais importantes da metodologia.

Ele responde:

> Quando o sistema precisa fazer uma ação, ele consulta ou grava onde?

Deve conter, para cada ação:

- nome da ação;
- origem;
- modo de acesso;
- collection, tabela, endpoint ou arquivo;
- entrada;
- saída;
- regra de erro;
- arquivos relacionados.

Em projetos com múltiplas integrações, esse arquivo evita que a IA precise adivinhar se deve usar API, banco direto, arquivo local ou ferramenta externa.

## 7.7. INTEGRATIONS

Arquivo sugerido:

```text
specs/06_INTEGRATIONS.md
```

ou, quando a integração for específica:

```text
specs/06_CHATIS_INTEGRATION.md
```

Função: descrever como sistemas externos interagem com o projeto.

Deve conter:

- sistema externo;
- fluxo;
- autenticação;
- endpoints usados;
- payloads;
- erros;
- responsabilidade de cada lado.

Regra importante:

> Integração externa não deve depender de lógica implícita no chat. A API deve retornar o próximo passo.

## 7.8. ACCEPTANCE

Arquivo sugerido:

```text
specs/07_ACCEPTANCE.md
```

Função: definir quando uma entrega pode ser aceita.

Deve conter checklists objetivos.

## 7.9. OUT_OF_SCOPE

Arquivo sugerido:

```text
specs/08_OUT_OF_SCOPE.md
```

Função: definir o que não deve ser implementado.

Esse arquivo é essencial porque modelos de IA tendem a adicionar coisas úteis que não foram pedidas.

## 7.10. DECISIONS

Arquivo sugerido:

```text
specs/09_DECISIONS.md
```

Função: registrar decisões arquiteturais.

Deve conter:

- decisão;
- justificativa;
- impacto;
- data, quando relevante;
- status.

Esse arquivo impede que a IA rediscuta decisões já tomadas.

## 7.11. TASKS

Arquivo sugerido:

```text
specs/TASKS.md
```

Função: transformar a spec em plano de execução.

Deve conter:

- fases;
- tarefas;
- critérios de conclusão;
- pendências;
- riscos.

## 7.12. tests.yaml

Arquivo sugerido:

```text
specs/tests.yaml
```

Função: definir testes agnósticos de linguagem.

Exemplo:

```yaml
student:
  - name: criar aluno sem student_level usa default 2
    input:
      name: Maria
      phone_number: "12988880000"
    output:
      student_level: 2
```

Esse arquivo pode depois ser convertido em testes unitários, testes de integração ou checklist manual.

---

## 8. Agent Skills

## 8.1. Como uma Skill é chamada pelo agente

Na metodologia SSVC, uma Skill não deve ser tratada apenas como uma pasta com instruções. Ela deve funcionar dentro de um **Agent Loop**, ou seja, dentro do ciclo de raciocínio e execução do agente.

O agente não deve ler todas as Skills completas o tempo todo. Isso ocuparia contexto demais, lotaria a memória da IA e deixaria o processo confuso.

Regra arquitetural obrigatória:

> O agente primeiro enxerga apenas o catálogo de metadados das Skills. Ele só carrega o `skill.md` completo depois de decidir que aquela Skill é relevante para a tarefa.

A biblioteca de Skills funciona em duas camadas:

```text
Camada 1 — Catálogo de Skills
Apenas metadados curtos: nome, descrição, gatilhos, entradas e saídas.

Camada 2 — Skill completa
skill.md, templates, scripts, exemplos, checklists e arquivos auxiliares.
```

Isso permite que o agente tenha acesso a muitas Skills sem colocar todas na janela de contexto ao mesmo tempo.

Fluxo correto:

```text
Pedido do usuário
→ agente analisa a intenção
→ agente compara com metadados das Skills
→ agente escolhe a Skill adequada
→ agente lê o skill.md completo
→ agente consulta templates/scripts, se necessário
→ agente executa a tarefa
→ agente registra saída, pendências e verificações
```

## 8.2. Metadados obrigatórios da Skill

Toda Skill deve começar com um bloco curto de metadados.

Exemplo:

```yaml
---
name: firestore-modeler
description: Use esta skill para criar, revisar ou alterar modelos Firestore, collections, documentos, campos, regras de persistência e impactos no modelo de dados.
triggers:
  - criar collection
  - alterar campo do Firestore
  - revisar modelo de dados
  - definir schema
  - mapear entidade para banco
inputs:
  - specs/01_DOMAIN_MODEL.md
  - specs/03_FIRESTORE_MODEL.md
  - specs/05_ACTION_ROUTING_MAP.md
outputs:
  - modelo Firestore atualizado
  - impactos registrados
  - testes atualizados
runtime_tools:
  - scripts opcionais de validação
---
```

Esse bloco serve para o agente saber **quando chamar a Skill** sem precisar ler o arquivo inteiro.

## 8.3. Estrutura de uma Skill

```text
skills/nome-da-skill/
  skill.md
  templates/
    exemplo_template.md
  scripts/
    validate.py
  examples/
    exemplo_entrada.md
    exemplo_saida.md
  checklist.md
  CHANGELOG.md
  lessons.md
```

A estrutura mínima é apenas:

```text
skills/nome-da-skill/skill.md
```

## 8.4. Scripts como ferramentas da Skill

Uma Skill não é apenas um arquivo Markdown. Ela pode ter scripts prontos em Python, Bash ou outra linguagem adequada.

O `skill.md` é o manual de instrução da Skill.

A pasta `scripts/` contém ferramentas executáveis que ajudam o agente a realizar tarefas repetitivas, determinísticas ou verificáveis.

Distinção:

```text
skill.md    → orienta o agente
scripts/    → executa procedimentos reutilizáveis
templates/  → padroniza saídas
examples/   → mostra uso correto
checklist.md → ajuda na verificação manual
```

Exemplos de scripts:

```text
scripts/validate_tests_yaml.py
scripts/check_firestore_schema.py
scripts/generate_api_table.py
scripts/compare_spec_vs_routes.py
scripts/extract_routes_from_react.py
scripts/normalize_phone_numbers.py
server/lib/studentTrailProgressService.ts
scripts/check_action_routing_map.py
```

Usar script quando a tarefa exigir:

- validação objetiva;
- leitura de muitos arquivos;
- comparação entre spec e código;
- geração de tabela;
- normalização de dados;
- conversão de formatos;
- teste repetitivo;
- redução de erro humano;
- execução sempre igual.

Não usar script quando a tarefa depender principalmente de julgamento qualitativo, como:

- decidir estratégia de produto;
- escrever narrativa;
- avaliar clareza de uma explicação;
- escolher prioridade política ou institucional;
- interpretar contexto ambíguo.

Antes de executar script, o agente deve entender:

```text
1. O que o script faz?
2. Quais arquivos ele lê?
3. Quais arquivos ele altera?
4. Ele chama rede/API externa?
5. Ele apaga ou sobrescreve dados?
```

Scripts que alteram arquivos devem ser tratados com mais cuidado do que scripts apenas de leitura.

---

## 9. Evolução contínua das Skills

O SSVC assume que o agente melhora com o tempo.

Curva esperada:

```text
Dia 1  → sem Skills      → inteligente, mas improvisa
Dia 5  → poucas Skills   → capaz, mas ainda limitado
Dia 30 → muitas Skills   → útil, consistente e especializado
```

No início, o agente pode ser inteligente, mas ainda não conhece os procedimentos específicos do projeto. Ele depende de raciocínio geral e pode improvisar.

Com o acúmulo de Skills, ele passa a trabalhar como alguém que já conhece o caminho: sabe quais arquivos ler, quais decisões respeitar, quais testes rodar, quais APIs consultar e quais erros evitar.

Por isso, uma Skill não é estática. Ela deve ser tratada como um ativo vivo.

O agente deve cumprir cinco movimentos em toda tarefa:

```text
1. Descobrir a Skill necessária
2. Carregar a Skill
3. Executar o procedimento da Skill
4. Avaliar se a Skill foi suficiente
5. Melhorar a Skill quando houver aprendizado novo
```

Ao final de cada tarefa, o agente deve fazer uma pergunta obrigatória:

> Esta tarefa gerou algum aprendizado que deve melhorar uma Skill?

Se sim, ele deve propor atualização em uma das seguintes formas:

```text
1. Adicionar novo gatilho à Skill
2. Adicionar nova restrição
3. Adicionar novo passo ao procedimento
4. Adicionar novo template
5. Adicionar novo checklist
6. Adicionar novo script
7. Criar uma nova Skill
```

Regra:

> Tarefa repetida três vezes deve virar Skill.

E também:

> Procedimento repetido três vezes dentro de uma Skill deve virar template, checklist ou script.

---

## 10. Seleção dinâmica de Skills

O agente deve escolher a Skill conforme a necessidade da tarefa.

Essa escolha deve ser feita a partir do catálogo de metadados, não da leitura completa de todas as Skills.

O catálogo de metadados deve conter:

```text
name
description
triggers
inputs
outputs
runtime_tools
```

Somente depois da escolha o agente lê o `skill.md` completo da Skill selecionada.

Exemplo:

Pedido:

```text
Crie um endpoint para o player web buscar o próximo conteúdo da trilha.
```

Skills escolhidas:

```text
Skill principal:
- frontend-react-builder

Skills auxiliares:
- api-contract-builder
- trail-flow-builder
- qa-verifier
- doc-generator
```

O agente deve declarar:

```text
Skill principal escolhida: X
Skills auxiliares: Y, Z
Motivo da escolha: ...
```

---

## 11. Matriz de escolha de Skills

| Tipo de pedido | Skill principal | Skills auxiliares |
|---|---|---|
| Ideia nova | sdd-planner | doc-generator |
| Nova entidade | firestore-modeler/data-modeler | sdd-planner, qa-verifier |
| Novo endpoint | api-contract-builder | action-routing, qa-verifier, doc-generator |
| Player web do aluno | frontend-react-builder | api-contract-builder, trail-flow-builder |
| Nova tela | frontend-builder | data-modeler, qa-verifier |
| Mudança em fluxo | flow-builder | integration-builder, qa-verifier |
| Documentação | doc-generator | qa-verifier |
| Revisão de entrega | qa-verifier | skill específica da área revisada |

Essa matriz deve ser atualizada sempre que novas Skills forem criadas.

---

## 12. Fluxo operacional completo

## 12.1. Etapa 1 — Ideia bruta

Tudo começa com uma ideia.

Exemplo:

```text
Quero que o app aluno consiga buscar o próximo conteúdo da trilha.
```

Nessa etapa, ainda não se escreve código.

## 12.2. Etapa 2 — Transformar ideia em spec

Usar a Skill `sdd-planner`.

O agente deve produzir ou atualizar:

- spec do fluxo;
- modelo de domínio, se necessário;
- Action Routing Map;
- critérios de aceite;
- tarefas.

## 12.3. Etapa 3 — Criar testes

Atualizar `tests.yaml` com:

- caso feliz;
- erro esperado;
- caso de borda;
- comportamento proibido.

## 12.4. Etapa 4 — Quebrar em tarefas

Atualizar `TASKS.md`.

Cada tarefa deve ser pequena o suficiente para ser implementada e revisada.

## 12.5. Etapa 5 — Escolher Skill

Antes de implementar, escolher a Skill.

## 12.6. Etapa 6 — Implementar fatia pequena

O agente deve implementar apenas uma tarefa.

Regra:

> Quanto menor a fatia, menor o risco de alucinação.

## 12.7. Etapa 7 — Verificar

Usar `qa-verifier`.

O verificador deve procurar falhas, não elogios.

Deve comparar:

- spec;
- código;
- tests.yaml;
- Action Routing Map;
- Acceptance;
- Out of Scope.

## 12.8. Etapa 8 — Documentar

Usar `doc-generator`.

Atualizar:

- docs;
- decisões;
- troubleshooting;
- usage, se necessário.

## 12.9. Etapa 9 — Melhorar Skills

Ao final, registrar aprendizado para Skills.

Formato obrigatório:

```text
## Aprendizado para Skills

Skill usada:
- [nome]

A Skill foi suficiente?
- Sim/Não

O que faltou?
- [descrever]

Atualização recomendada:
- [nenhuma / adicionar gatilho / adicionar restrição / adicionar checklist / criar script / criar nova Skill]

Arquivo de Skill a atualizar:
- skills/[nome]/skill.md
```

---

## 13. Prompts padrão

## 13.1. Criar spec

```text
Use a skill sdd-planner.

Antes de escrever código, transforme a ideia abaixo em spec.

Leia:
- specs/00_PROJECT_OVERVIEW.md
- specs/01_DOMAIN_MODEL.md
- specs/05_ACTION_ROUTING_MAP.md
- specs/08_OUT_OF_SCOPE.md
- specs/09_DECISIONS.md

Atualize:
- spec relacionada
- specs/tests.yaml
- specs/TASKS.md

Ideia:
[descrever ideia]

Não altere código de aplicação.
```

## 13.2. Implementar

```text
Use a skill [NOME_DA_SKILL].

Leia:
- specs/[SPEC_RELACIONADA].md
- specs/05_ACTION_ROUTING_MAP.md
- specs/07_ACCEPTANCE.md
- specs/08_OUT_OF_SCOPE.md
- specs/tests.yaml
- specs/TASKS.md

Implemente apenas a tarefa:
[descrever tarefa]

Não implemente nada fora do escopo.
Ao final, informe:
1. arquivos alterados;
2. regra da spec atendida;
3. testes ou verificações realizadas;
4. pendências;
5. riscos;
6. aprendizado para Skills.
```

## 13.3. Verificar

```text
Use a skill qa-verifier.

Compare:
- spec relacionada;
- tests.yaml;
- arquivos alterados;
- Action Routing Map;
- Acceptance;
- Out of Scope.

Procure divergências.
Classifique como:
- aprovado;
- aprovado com ressalvas;
- reprovado.

Não elogie. Encontre falhas.
```

---

## 14. Critérios de qualidade

Uma entrega só pode ser aceita quando:

- cumpre a spec;
- não viola o fora de escopo;
- respeita decisões existentes;
- atualiza testes;
- respeita o Action Routing Map;
- tem tratamento de erro;
- não cria complexidade desnecessária;
- passa por verificação adversarial;
- atualiza documentação quando necessário;
- avalia se a Skill precisa ser melhorada.

---

## 15. Aplicação no Crias Trilhas

No Crias Trilhas, a metodologia fica assim:

```text
specs/ define a verdade do produto.
skills/ define como agentes devem trabalhar.
docs/ explica operação e arquitetura.
frontend/trilha-admin/ contém implementação atual.
```

A separação operacional principal é:

```text
Painel Admin -> Firestore Client SDK
App aluno web -> API HTTP -> Backend -> Firestore
```

As entidades principais são:

- Institution;
- Student;
- Trail;
- TrailStage;
- TrailStageQuestion.

Os fluxos principais são:

- criar instituição;
- criar aluno;
- criar trilha;
- criar stages;
- criar conteúdos;
- liberar conteúdos;
- entregar conteúdo via app web do aluno;
- avançar aluno na trilha.

---

## 16. Checklists

## 16.1. Antes de começar uma feature

- Qual problema estou resolvendo?
- Qual usuário será beneficiado?
- Qual fluxo será alterado?
- Qual entidade será afetada?
- Qual dado entra?
- Qual dado sai?
- Qual API ou collection será usada?
- Isso está dentro do escopo?
- Qual critério de aceite?
- Qual Skill deve ser usada?

Se alguma resposta não existir, a feature ainda não está pronta para implementação.

## 16.2. Antes de aceitar uma entrega

- A entrega cumpre a spec?
- Alguma coisa fora do escopo foi criada?
- A IA alterou decisão sem registrar?
- O Action Routing Map foi respeitado?
- Os testes foram atualizados?
- O build passa?
- O lint passa?
- A documentação foi atualizada?
- O QA adversarial aprovou?
- Houve aprendizado para atualizar Skills?

---

## 17. Regra de ouro

> Nunca peça código antes de existir uma spec. Nunca aceite código antes de verificar contra a spec.

Versão operacional:

```text
Spec primeiro.
Skill antes da execução.
Teste antes do aceite.
Decisão registrada.
Documentação atualizada.
Skill melhorada continuamente.
```

---

## 18. Conclusão

A metodologia SSVC transforma o uso de IA em desenvolvimento de software em um processo mais confiável.

Ela preserva a velocidade do vibe coding, mas adiciona:

- clareza;
- rastreabilidade;
- governança;
- repetibilidade;
- qualidade;
- memória operacional;
- especialização por Skills.

O objetivo não é burocratizar o desenvolvimento.

O objetivo é fazer com que a IA trabalhe como um especialista que conhece o projeto, respeita decisões, segue procedimentos, entrega em partes verificáveis e melhora suas próprias competências ao longo do tempo.

Em vez de depender de prompts soltos e histórico de conversa, o projeto passa a ter uma base viva de especificações, competências, decisões e aprendizados.

Essa é a essência do **Skill-Spec Vibe Coding**.