# User Flows — Crias Trilhas

## Fluxo 1 — Criar instituição

1. Admin acessa o painel.
2. Clica em Nova instituição.
3. Preenche nome, tipo e status.
4. Sistema salva no Firestore.
5. Sistema gera ou atualiza link público.
6. Instituição aparece na página inicial.

Critérios:

- Instituição aparece na lista.
- Link pode ser copiado.
- Erro do Firebase é exibido se configuração estiver ausente.

## Fluxo 2 — Criar aluno

1. Admin acessa Novo aluno.
2. Seleciona instituição.
3. Informa nome, telefone, nível escolar, série e nível pedagógico.
4. Sistema normaliza telefone.
5. Sistema salva aluno.

Critérios:

- Aluno fica vinculado à instituição.
- `student_level` default é 2 quando não preenchido.
- Telefone salva apenas números (identificador de login/contato, não canal de mensagens).

## Fluxo 3 — Criar trilha

1. Admin acessa Nova trilha.
2. Sistema usa instituição selecionada no gerenciamento, query param ou localStorage.
3. Admin preenche nome, matéria e descrição.
4. Admin define estrutura da trilha.
5. Para cada fase, define título, tipo e prompt quando houver IA.
6. Sistema cria documento em `trails`.
7. Sistema cria documentos em `trail_stages`.
8. Admin passa para etapa de conteúdos.
9. Admin preenche conteúdo por etapa/questão.
10. Sistema cria documentos em `trail_stage_questions`.

Critérios:

- Trilha deve ter pelo menos 1 fase.
- Fase IA exige prompt.
- Cada etapa deve ter exatamente 1 questão no editor atual.
- Cada fase deve ter conteúdo preenchido antes de salvar.

## Fluxo 4 — Liberar conteúdo

1. Admin abre trilha ou stage.
2. Visualiza conteúdos criados.
3. Marca conteúdo ou etapa como liberado.
4. Sistema atualiza `is_released`.
5. O player web do aluno passa a poder entregar o conteúdo.

Critérios:

- Conteúdo não liberado não deve ser entregue (`blocked`).
- Conteúdo liberado deve aparecer no next-content do player.

## Fluxo 5 — Aluno consome próximo conteúdo (app web)

1. Aluno informa telefone + código da instituição.
2. API identifica aluno ativo na instituição.
3. Aluno vê lista de trilhas vinculadas (`student_trails`).
4. Aluno abre uma trilha; API identifica stage e question atuais.
5. API verifica se o conteúdo está liberado e ativo.
6. API retorna conteúdo, prompt e tipo de stage.
7. App renderiza conforme `stage_type` (`fixed` / `ai` / `exercise`).
8. Aluno avança; app chama `POST /student_trails/advance`.

Critérios:

- Se aluno não existe, retornar `not_found`.
- Se aluno está inativo, retornar `inactive_student`.
- Se conteúdo não está liberado, retornar `blocked`.
- Se não houver próximo conteúdo, retornar `completed`.
