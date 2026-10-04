# Crias Trilhas · Redesign do painel da escola
## Guia de implementação do frontend (para agente de IA)

Este documento orienta a implementação do redesign no repositório **crias-trilhas**, app `frontend/trilha-admin`. Leia tudo antes de escrever código. Quando algo aqui conflitar com as specs do repositório (`specs/*.md`, `ARCHITECTURE_RULES.md`), **as specs vencem**: pare, registre o conflito em `09_DECISIONS.md` e peça confirmação.

---

## 1. Fontes de verdade

| O quê | Onde |
| --- | --- |
| Visual e comportamento de cada tela | Protótipos `Crias *.dc.html` deste pacote (valores de estilo inline) e capturas em `imagens/` |
| Viabilidade, backlog e decisões | `Crias Documentacao.dc.html` (seções Resumo, Números, Manual, Por tela, Backlog, Decisões) |
| Regras de arquitetura | `ARCHITECTURE_RULES.md`, `src/design/design-system/README.md` |
| Modelo de dados | `specs/03_FIRESTORE_MODEL.md` (atualizar **antes** de criar qualquer campo) |
| API do dashboard | `specs/04_*`, `specs/10_*` (agentes), `api/dashboard_summary` |
| Escopo | `specs/08_OUT_OF_SCOPE.md`, `specs/09_DECISIONS.md` |

Protótipo → código:

| Protótipo | Substitui (rota atual) | View / container |
| --- | --- | --- |
| `Crias Visao Geral.dc.html` | `/dashboard` (+ `/gabarito` para anular/gabarito) | `DashboardPageView` + `design/views/dashboard/**` · `pages/DashboardPage.tsx` |
| `Crias Trilhas.dc.html` | `/trilhas`, `/trilhas/:id`, `/trilhas/:trailId/stages/:n/questoes` | `TrailsListPageView`, `TrailDetailPageView`, `TrailStageQuestionsPageView` |
| `Crias Nova Trilha.dc.html` | `/trilhas/novo` | `TrailNewPageView` + `components/TrailForm` |
| `Crias Alunos.dc.html` | `/alunos` | `StudentsListPageView` |
| `Crias Alunos.dc.html?aluno=1` | `/alunos/:id` | `StudentDetailPageView` |
| `Crias Configuracoes.dc.html` | `/`, `/gerenciamento`, `/admin`, `/instituicoes/*` | `HomePageView`, `GerenciamentoPageView`, `AdminPageView` |

---

## 2. Regras que não podem ser quebradas

1. **Só altere arquivos em `src/design/**`** na Fase A. Fora disso (pages, lib, api, server, rotas, `index.html`) é área protegida e exige tarefa explícita de fase B/C/D.
2. Views **não importam** Firebase, Firestore, `lib/`, `hooks/`, `contexts/`, `pages/`, `api/`, `server/`.
3. Views **não usam** `fetch`, `onSnapshot`, `import.meta.env`, `process.env`.
4. Dados e ações chegam **só por props** ou slots `ReactNode` (`formSlot`, `chatSlot`). Tipos em `src/design/types/*PageView.ts`.
5. **Permissão nunca é decidida na view.** Lista de instituições, itens de menu e botões permitidos chegam prontos do container (`usePermissions`, `nav_permissions`).
6. Formulários protegidos (`StudentForm`, `TrailForm`, `TrailStructureEditor`, `TrailStageForm`, `TrailStageQuestionForm`, `InstitutionForm`): a view só estiliza o entorno do slot. Mudar o layout interno exige tarefa própria.
7. **Não invente dado.** Se a tela pede algo que o banco não tem (ver seção 7), a view recebe a prop como opcional e esconde o bloco quando ela vier `undefined`. Nunca preencha com valor fixo.
8. Spec 10: não mostrar disciplina de agente com zero mensagens; não inferir tema de dúvida na tela.
9. Antes de qualquer PR:
   ```
   npm run lint && npm run typecheck && npm run test && npm run build && npm run check:design-boundaries
   ```
   Observação: `check:design-boundaries` é citado no README do design, mas **não está em `frontend/trilha-admin/package.json`**. Procure o script na raiz do repositório; se não existir, sinalize em vez de criar um.

---

## 3. Tokens (Fase A · `src/design/themes/tokens.css`)

As cores do redesign são as mesmas da marca já presente no repositório (`--sidebar-bg #00be85`, `--accent #ffd500`). Adicione os tokens abaixo sem remover os antigos até todas as views migrarem.

```css
:root {
  /* base */
  --c-bg: #fffcf0;          /* fundo da página */
  --c-surface: #f6f2e3;     /* cartões, painéis, caixas de nota */
  --c-text: #001c0e;        /* texto principal */
  --c-divider: color-mix(in srgb, #001c0e 34%, transparent);

  /* verde (primário) */
  --c-green: #00be85;  --c-green-100: #e6f8f1; --c-green-200: #c4efdf;
  --c-green-300: #8fe0c4; --c-green-700: #00835b; --c-green-800: #006246;

  /* amarelo (destaque) */
  --c-yellow: #ffd500; --c-yellow-100: #fff9d6; --c-yellow-200: #fff0a3; --c-yellow-800: #7a6400;

  /* rosa (alerta / "desenvolver" / erro de exercício) */
  --c-rose-100: #fde4e9; --c-rose-300: #f5b0bd; --c-rose-900: #7a1f33;

  /* neutros */
  --c-n-100: #faf8f0; --c-n-200: #efece1; --c-n-300: #dcd8cb; --c-n-400: #bdbaae;
  --c-n-500: #9a988e; --c-n-600: #7a7970; --c-n-700: #5b5b53; --c-n-800: #3e3f38; --c-n-900: #1f231c;

  /* tipografia */
  --font: "Manrope", system-ui, sans-serif;
}
```

Regras de uso:
- Texto sobre verde ou amarelo é sempre `--c-text` (nunca branco). Texto verde em corpo usa `--c-green-700`; hover de link `--c-green-800`.
- Texto secundário: `--c-n-700`. Rótulos pequenos em caixa alta: `--c-n-700`, 11px, `letter-spacing: .08em`, peso 700.
- **Sem cantos arredondados** (radius 0) e **sem sombras** decorativas. A estrutura vem de réguas: 2px `--c-text` abaixo de títulos de seção e do header; 1px `--c-divider` entre linhas.
- Foco: `outline: 2px solid var(--c-green); outline-offset: 2px` em `:focus-visible`.
- Status sempre com texto além da cor.

**Manrope**: pesos 400, 500, 600, 700, 800. Carregar a fonte exige ativo em `public/` (permitido) ou `<link>` no `index.html` (protegido). Prefira `@font-face` apontando para arquivos em `public/fonts/`. Números em tabelas e KPIs: `font-variant-numeric: tabular-nums`.

Escala de tipo usada nos protótipos:
| Uso | Tamanho / peso |
| --- | --- |
| Título de página | 36–44px / 800, `letter-spacing: -.03em` |
| Título de seção | 24–28px / 800, `-.02em` |
| KPI | 40–44px / 800, `-.04em` |
| Subtítulo de bloco | 18–20px / 800 |
| Corpo | 14–16px / 400, `line-height 1.55–1.6` |
| Tabela / meta | 12–13px |
| Rótulo caixa alta | 10–11px / 700 |

Espaçamento: página `max-width: 1320px`, padding lateral 32px; seções com 32–40px verticais; gaps de 12/16/24/32px. Alvos de toque 36–44px.

---

## 4. Shell (`design/layouts/AdminLayoutView.tsx`)

O menu lateral verde é substituído por um **header fixo no topo** (64px, fundo `--c-bg`, régua inferior 2px):

Ordem da esquerda para a direita:
1. Logo Crias (22px de altura, link para Visão geral).
2. **Seletor de instituição** (dropdown). Lista vem do container. Último item: link "Gerenciar instituições" → Configurações.
3. Navegação: **Visão geral · Trilhas · Alunos**. Item ativo com sublinhado/fundo verde.
4. À direita (`margin-left: auto`, gap 8px): botão **Docs** (apenas no protótipo; não implementar em produção), botão de ícone **Configurações** (engrenagem, 36px) e avatar com iniciais (36px, fundo amarelo, `title` = nome · papel).

Em telas estreitas o nome da instituição e a navegação quebram linha em vez de estourar.

Mapeamento de menu: os itens seguem `NAV_PERMISSIONS`. Agrupar Dashboard + Gabarito em "Visão geral" e Início + Gerenciamento + Admin em "Configurações" **muda rotas**, que é área protegida: na Fase A mantenha as rotas atuais e só troque rótulos/visual; o reagrupamento é tarefa de container.

---

## 5. Telas

Para cada tela: estrutura, props necessárias e status (Pronto / Parcial / Desenvolver). A matriz completa, linha por linha, está em `Crias Documentacao.dc.html#telas`.

### 5.1 Visão geral (`DashboardPageView`)
Estrutura, de cima para baixo:
1. Cabeçalho: título, instituição, filtros (período, matéria/trilha, série, turma).
2. Faixa de KPIs em grade de colunas iguais: alunos ativos de cadastrados, progresso médio, acerto médio, interações com tutores (% dos ativos).
3. Percurso por faixa de progresso (Concluiu, Final, Meio, Início, Parado 7+ dias, Não iniciou).
4. Mapa conteúdo a conteúdo: matriz atividade × exercício com acerto; célula clicável abre distribuição A/B/C, gabarito e ação de anular.
5. Conversas com os tutores: consolidado, por disciplina e por aluno.
6. Oportunidades de aprendizagem (mais erros, mais acertos, dúvidas por tema).
7. Ranking de alunos e alunos parados.

Props: tudo que já está em `dashboardPageView.ts` + novas opcionais: `gradeOptions`, `classOptions?`, `activityMatrix?`, `optionDistribution?`, `topicDoubts?`, `ranking?`.

Status:
- Pronto: seletor de instituição, período Tudo/30/7 (`period_days=0|7|30`), KPIs, tutores (`agent_usage`), filtro matéria/trilha, faixas, parados 7+ dias, anular/gabarito (reusar callbacks do Gabarito).
- Parcial: filtro série (expor `school_grade` na linha), matriz por atividade (agrupar por `question_number` no container), distribuição por alternativa (agregar `student_answer`), mais erros/acertos.
- Desenvolver: período personalizado (`start_date`/`end_date`), turma (`students.class_name`), dúvidas por tema (`metadata.topic`).
- **Bloqueado por decisão**: ranking e oportunidades conflitam com `08_OUT_OF_SCOPE.md`. Implemente atrás de prop opcional e não renderize até existir decisão.

Estados obrigatórios: skeleton no carregamento, vazio ("Nenhum aluno no período") e erro com botão "Tentar de novo" (padrão da spec 10).

### 5.2 Trilhas · lista e editor
Lista: tabela com nome, matéria, profundidade (blocos + exercícios), atividades liberadas de total, alunos, status. Ações: abrir, duplicar, excluir.

Editor em abas: **Geral · Estrutura · Atividades · Desempenho · Alunos**.
- Geral: nome, descrição, matéria (TrailForm, protegido) e objetivo (desenvolver `trails.goal`).
- Estrutura: n conteúdos + m exercícios por atividade (`trail_stages`, `phase_blueprint`). Terminologia: **bloco = stage (vertical)**, **atividade = question (horizontal)** (spec 01).
- Atividades: liberar/bloquear (`is_released`), texto fixo / IA / exercício com gabarito, prévia do conteúdo no player, importar XLSX (`loadXlsx`). Datas, habilidade, orientações e materiais: desenvolver.
- Desempenho e Alunos: `student_trails` + `exercise_attempts`; mover aluno via `update_position`.

Status "Rascunho": `trails.active` é booleano. Até decidir `trails.status`, mostre só Ativa/Inativa.

### 5.3 Nova trilha
Assistente em etapas sobre o `TrailForm`. Dividir em etapas depende de adaptar o formulário protegido. "Gerar a partir do material" é Fase D; não mostrar o botão enquanto não existir endpoint.

### 5.4 Alunos · lista
Busca, filtros (trilha, série, turma), coluna Situação, seleção em massa (vincular, exportar, desativar), adicionar e importar.

Regra de situação (calcular no **container**, não na view), sobre o percentual do conteúdo liberado:
- Concluiu: `status = completed`
- Parado 7+ dias: `last_interaction_at` há 7 dias ou mais (tem prioridade sobre as faixas)
- Não iniciou: `not_started` **ou** `students.active = false` (pendente de decisão, ver 8.4)
- Início < 34% · Meio 34–66% · Final ≥ 67%

### 5.5 Alunos · perfil
Blocos: cabeçalho (nome, turma, ano, nível, última interação, ações), painel de edição (formSlot do StudentForm), percurso por trilha com "mover de atividade", aprendizagem (mais errou/acertou por disciplina), outras trilhas + vincular, histórico de sessão com filtro Tudo / Trilha / Tutores de IA (`chatSlot`, `agentHistoryFilterLabel`), desativar.

Campos novos do painel (código, e-mail, turma, nível automático, necessidades específicas, observações) são Fase C. Renderize cada um só quando a prop existir.

### 5.6 Configurações
Abas: Instituições (listar, criar, desativar) · Usuários e acesso (`admin_users.institution_ids`, `all_institutions`) · Papéis. Papéis Coordenação/Leitura = conjunto fixo de `nav_permissions` mapeado no container. Convite por e-mail: Fase D.

---

## 6. Dados de referência do protótipo (fixtures de teste)

Use estes números em testes de view e Storybook/fixtures. Eles são consistentes entre todas as telas.

**Instituto Sol**: 612 cadastrados (558 ativos, 54 inativos), 5 trilhas (4 ativas + Redação ENEM em rascunho). Situação: Concluiu 76 · Final 98 · Meio 121 · Início 128 · Parado 7+ dias 73 · Não iniciou 116. Outras instituições: Colégio Horizonte (214), Escola Rio Verde (96).

| Trilha | Matéria · id | Alunos | Liberadas | Blocos |
| --- | --- | --- | --- | --- |
| Revisão | Matemática · t47 | 412 | 16 de 20 | 8 + 3 |
| Simulado | Linguagens · t48 | 398 | 16 de 20 | 5 + 3 |
| Leitura e Interpretação | Linguagens · t52 | 186 | 16 de 16 | 3 + 1 |
| Recuperação | Matemática · t55 | 94 | 6 de 12 | 5 + 2 |
| Redação ENEM | Redação · t61 (rascunho) | 0 | 0 de 10 | 8 + 3 |

**Aluna Ana Beatriz Souza**: 8º B · 8º ano · nível 2. Vinculada só a Revisão e Leitura e Interpretação. Revisão: atividade 12 (Ângulos), bloco 3 de 11, progresso 70%, acerto 71%. Leitura e Interpretação: concluída, acerto 82%. Última interação há 2 dias.

---

## 7. Backlog em ordem de entrega

**Fase A · só design** (`src/design/**`)
- Tokens, Manrope, shell no topo.
- Views novas usando só as props atuais; blocos sem dado ficam ocultos.
- Loading, vazio e erro em cada view.
- Testes de view com as fixtures da seção 6.

**Fase B · container e props** (sem mudar o banco)
- Matriz atividade × exercício no summary.
- Contagem por alternativa (`student_answer`).
- Faixas Início/Meio/Final e "Parado 7+ dias" no container.
- `school_grade` nas linhas do dashboard.
- Reordenação de blocos em transação.
- Ações em massa.
- Papéis → `nav_permissions`.

**Fase C · modelo de dados** (atualizar spec 03 primeiro)
- `students`: `class_name`, `external_code`, `email`, `student_level_mode`, `special_needs`.
- `trails`: `goal`, `status`.
- Documento de atividade (`trail_id` + `question_number`): `skill`, `guidance`, `release_at`, `due_at`, `materials[]`.
- Collection `student_notes`.
- `dashboard_summary`: `start_date`, `end_date`.

**Fase D · serviços**
- Classificação de tema das mensagens de tutor (`metadata.topic`).
- Job de liberação por data.
- Duplicar trilha (novo `tN` via `counters/trails`).
- Importação XLSX de alunos (fase 6 do TASKS.md).
- Prévia de blocos de IA; geração a partir de material (Firebase Storage).
- Convite de usuário por e-mail (Firebase Auth).

---

## 8. Decisões pendentes (não implementar sem registro em `09_DECISIONS.md`)

1. **Ranking de alunos**: fora de escopo na spec 08. Alternativa: lista ordenável sem posição numérica.
2. **Oportunidades de aprendizagem**: "dashboard pedagógico avançado" está fora de escopo; precisa de spec própria.
3. **Tema das dúvidas**: só com campo gravado, nunca inferido na tela.
4. **Inativo em "Não iniciou"**: spec 01 trata inativo como estado próprio.
5. **Necessidades específicas**: dado sensível (LGPD). Definir base legal, quem vê e se entra no prompt da IA antes de criar o campo.
6. **Nível automático**: definir regra (acerto + progresso) e quando o manual prevalece.

---

## 9. Como trabalhar

1. Uma tela por PR, na ordem: shell → Visão geral → Alunos (lista, perfil) → Trilhas → Configurações → Nova trilha.
2. Para cada tela: abra o protótipo, liste os blocos, marque cada um com o status da seção 5, implemente só os "Pronto" na Fase A.
3. Componentes visuais reutilizáveis vão em `design/components/{cards,tables,forms,navigation,feedback,ui}`: botão, tag de status, tabela com réguas, KPI, abas, dropdown, célula de matriz, barra de progresso.
4. Textos em português do Brasil, iguais aos do protótipo.
5. Não copie estilos inline dos protótipos para o React: converta para classes em `design/styles/` que leem os tokens.
6. Rode a checagem da seção 2.9 antes de abrir o PR e descreva no PR quais blocos ficaram ocultos por falta de dado.
