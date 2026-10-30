# Relatório da aplicação do pacote 1.3 no app (Crias Aluno e Crias Educação)

Data: 30/10/2026. Fonte: INTERFACE.md, "Pacote 1.3" (1.3.1 a 1.3.18, 1.3.E, 1.3.F, 1.3.G, 1.3.H), `PLANO-1.3.md`
e os protótipos `prototipo/Crias Aluno.dc.html` e `prototipo/Crias Gestao.dc.html`.

## 0. Base: GitHub do sócio + o nosso
- O `main` do sócio (`derikfernandes/crias-web`, até o PR #37 de 30/10) foi juntado ao nosso `main`
  (commit "Merge do main do sócio"). Em conflito valeu a **lógica de produção** dele (login unificado por e-mail,
  entrada única em crias.ai com Aluno em `/` e Educação em `/gestao/`, poll da IA, "Trilha indisponível" só para
  trilha inexistente, turma no aluno) e o **visual do design**.
- Diferenças que eu desfiz porque contrariam o design: a espera da IA como esqueleto cinza com "Carregando…"
  (volta a ser o símbolo do Crias com três pontos, no lugar final da mensagem).
- Decisão de produção mantida e registrada (para o Thiago validar): login do aluno e da Educação com telefone e
  e-mail juntos, **os dois valem** (o sócio tirou a escolha "Entrar com"). Está em `lib/loginRule.ts` e no
  `CLAUDE.md`.

## 1. Por que itens do 1.2.5 não chegaram à produção, e o que muda agora
- Parte do 1.2.5 tinha ficado **fora do código** (marcado como "não aplicado" no relatório 1.2.5) e uma parte
  foi trocada depois (esqueleto cinza). Agora tudo do 1.2.5 e do 1.3 está no código.
- Para não se perder de novo, há **testes de contrato** que falham se um item do design for removido:
  `frontend/crias-aluno/src/lib/contrato-design-1.3.test.ts` e
  `frontend/crias-gestao/src/lib/contrato-design-1.3.test.ts`. Rodam com `npx vitest run`.
- Orientações para o Cursor: `docs/ORIENTACOES-CURSOR-1.3.md`.

## 2. Conferência item a item (protótipo x app)
"Igual" = conferido no navegador contra o protótipo (computador; celular 402 nos itens marcados).

### Aluno
| Item | Estado | Arquivo do app |
|---|---|---|
| 1.2.5.8 a 1.2.5.12 Espera no lugar final: conteúdo = símbolo do Crias com três pontos; monitor = caixa do monitor com personagem carregando e duas linhas | Igual | `components/ConversationParts.tsx` (`TypingRow`) |
| Ao abrir a atividade, a espera fica onde a mensagem vai ficar (sem esqueleto cinza, sem "Carregando…") | Igual | `pages/PlayerPage.tsx` |
| Entrada única: esmaecimento de 0,5s subindo 6px (espera e mensagem) | Igual | `styles/crias-v1-0.css` (`v125In`) |
| Tempos de espera = tempo da API (sem espera artificial); respiro de 0,9s antes do monitor; 1,6s depois da caixa de conclusão | Igual (regra do Thiago: carregamento dura o tempo da API) | `PlayerPage.tsx` (`closingWaiting`, `delayMs`) |
| Toda mensagem do monitor na caixa do monitor (azul muito claro, 52px, sem rótulo) | Igual | `ConversationParts.tsx` (`BotMessage monitor`), `MonitorHighlight.tsx` |
| Monitor em destaque com 2 ajudas + continuar só na 1ª etapa e no fim da atividade; textos do protótipo | Igual | `lib/monitorOffers.ts` |
| Conteúdo sem título (só símbolo e texto) | Igual | `PlayerPage.tsx` |
| Exercício sem símbolo, etiqueta amarela "Responda", enunciado sem alternativas e sem gabarito, uma alternativa por linha, barra travada "Selecione uma alternativa e continue..." | Igual | `PlayerPage.tsx`, `lib/api.ts`, `lib/exerciseParse.ts` |
| Resposta do aluno sobe ao topo e a espera entra logo abaixo; a tela não rola sozinha depois | Igual | `PlayerPage.tsx` (`startPin`, `data-pin-space`, `data-pending-answer`) |
| Feedback como bloco de conteúdo com "Acertou" ou "Quase" | Igual | `ConversationParts.tsx` |
| "NOVA ATIVIDADE" entre atividades | Igual | `PlayerPage.tsx` |
| Fim da atividade: último bloco, caixa "Atividade concluída" (check desenhado, etapas, exercícios certos com barra, minutos, PRÓXIMA), depois o monitor; Continuar em "Aguarde…" até o monitor | Igual | `components/ActivityDoneCard.tsx`, `PlayerPage.tsx` |
| Fim da trilha: caixa "Trilha concluída" (atividades, exercícios certos, minutos), monitor com "volte para a página inicial"; Continuar vira "Início" sem ícone; saiu o cartão antigo | Igual | `PlayerPage.tsx` |
| Régua: nome da atividade, segmentos nas cores do tipo, feita/atual cheia sem piscar, toque no segmento feito mostra o rótulo e rola até a etapa, "Etapa X de Y" em negrito / "Atividade X de Y" | Igual | `components/ActivityRuler.tsx`, `layouts/ChatLayout.tsx` |
| 1.3.1 Esmaecimento de 24px abaixo da régua | Igual (computador e celular) | `styles/crias-v1-0.css` (`v125-ruler__fade`) |
| 1.3.2 Trilha concluída continua no Início ("REVEJA A ATIVIDADE", "Rever", barra cheia, "AGORA" com a última atividade, "Atividade Y de Y · Trilha concluída") | Igual | `pages/TrailsPage.tsx` |
| 1.3.3 Tela cheia em tablet e celular (detecção por `requestFullscreen`; falhou, some até recarregar) | Igual (celular 402) | `lib/fullscreen.ts`, `lib/useFullscreen.ts` |
| 1.3.4 Monitor sem o símbolo do Crias antes (espaço vazio do mesmo tamanho; módulo pré-carregado) | Igual | `components/monitor/MonitorAvatar.tsx`, `main.tsx` |
| 1.3.5 Switch Aluno | Educação só para quem tem conta de gestão | **CONFLITO** (ver 4) | `layouts/ChatLayout.tsx`, `pages/LoginPage.tsx`, `lib/session.ts` |
| Monitoria: histórico sempre acima; sugestões (tirar uma dúvida, explicar de outro jeito, fazer um exercício) na primeira abertura | Igual | `pages/MonitoriaPage.tsx` |
| Ícones 38px (web) e 33px (celular) | Igual | `ConversationParts.tsx` |

### Educação
| Item | Estado | Arquivo do app |
|---|---|---|
| 1.3.6 Sem tela cheia (botão e lógica removidos) | Igual | `layouts/AdminLayout.tsx`, `main.tsx` |
| 1.3.7 Menu lateral igual ao do Aluno (rótulo CONFIGURAÇÕES, subtítulos Usuários e Sistema, item ativo com encaixe, recolher, rodapé com switch Aluno/Educação, avatar + nome, tema, sair; celular em tela cheia) | Igual (computador e celular 402) | `layouts/AdminLayout.tsx`, `design/styles/gestao.css` |
| 1.3.9 Dados e Trilhas: Filtrar matéria, Filtrar turma, Filtrar trilhas (trilhas em cascata pela matéria); pesquisa de aluno na aba Alunos do Dados | Igual | `design/views/DashboardPageView.tsx`, `pages/DashboardPage.tsx`, `pages/TrailsListPage.tsx` |
| 1.3.10 Dados, aba Alunos: Turma depois de Nome, com ordenação; "Turma" logo abaixo de "Nome" na lista de colunas e nas exportações | Igual | `design/types/dashboardPageView.ts`, `DashboardPage.tsx` |
| 1.3.11 Alunos: Turma depois de ID Aluno; colunas de desempenho do Dados; "Exportar base" exporta o filtrado (todas as páginas e colunas) | Igual | `pages/StudentsListPage.tsx`, `hooks/useStudentMetrics.ts` |
| 1.3.12 Trilhas: Matéria, Turma, Trilha, Criada em, Ativa, Abrir (lista e Início da Instituição); aba Alunos da trilha com Turma e desempenho na trilha | Igual | `TrailsListPage.tsx`, `HomePage.tsx`, `pages/trail/StudentsTab.tsx` |
| 1.3.12.a Alunos: pesquisa, Filtrar por nome, Filtrar turma (saiu Filtrar por ID) | Igual | `StudentsListPage.tsx` |
| 1.3.13 Turma ao lado do Nível pedagógico (lista da instituição ou turma nova) e em todas as planilhas e tabelas de aluno | Igual | `components/StudentForm.tsx`, `pages/students/BulkBlocks.tsx`, `lib/bulkActions.ts`, `StudentPasswordsPage.tsx`, `StudentsTab.tsx` |
| 1.3.14 Perfis Super admin, Gestão, Professor | Igual | `lib/adminProfiles.ts` |
| 1.3.15 Tabelas de usuários só leitura (Nome, Matérias, Turmas, Perfil, E-mail, Telefone, Ativo; Instituição na aba Instituições) | Igual | `pages/admin/UsersReadTable.tsx`, `UsersPage.tsx`, `AdminPage.tsx` |
| 1.3.16 Perfil do usuário (PA20) com Cadastro, Matérias, Turmas, Usuário ativo, Excluir (DELETAR) e Trilhas vinculadas; perfil próprio (PA19) só leitura | Igual | `pages/UserProfilePage.tsx` (rotas `/usuarios/:id` e `/usuarios/novo`), `ProfilePage.tsx` |
| 1.3.17 Planilha de usuários com Matérias e Turmas, Perfil (Gestão / Professor) | Igual | `pages/admin/UsersBulk.tsx`, `lib/bulkActions.ts` |
| 1.3.18 Professor só vê as matérias e turmas dele; menu sem Configurações | Igual na tela; **CONFLITO** no servidor (ver 4) | `lib/turmas.ts` (`scopeOf`), Dados, Trilhas, Alunos, Início |

### Itens do protótipo que não estão na seção 1.3 e ficaram de fora
- "+ Adicionar perfil" (perfil personalizado com nome) no cartão Perfis: não aplicado; precisa de regra de dados.
- Senha do usuário de gestão com o "olho" para ver: no app a senha da Educação é do Firebase Auth e não pode
  ser mostrada; o perfil mostra "••••••••" e o botão "Redefinir" (e-mail de redefinição).

## 3. Testes e build
- `npx vitest run`: todos os testes passam (inclui os testes de contrato do design 1.3).
- `npm run build`: passa.
- `npm run lint` da Educação já falhava antes (erros antigos de `react-hooks`); não piorou com o 1.3.

## 4. CONFLITOS: o que o backend precisa (sem inventar endpoints)
1. **Turma do aluno** (`students.turma`, texto): já existe no banco (sócio). Precisa vir em todas as respostas de
   lista de alunos e entrar nas planilhas (o app já grava e lê).
2. **Matérias, turmas e trilhas do usuário** (`admin_users.materias[]`, `turmas[]`, `trail_ids[]`): o app já grava
   pelo perfil do usuário e pela planilha. Vazio em Gestão e Super admin = todas.
3. **Filtro no servidor para o Professor** (1.3.E.3): toda consulta de Professor deve aplicar matéria (pela trilha)
   e turma (pelo aluno): `dashboard_metrics`, `student_trails`, exportações. Hoje a tela filtra, mas os números
   agregados do servidor (Dados e Início) ainda são da instituição inteira.
4. **Filtro de turma e matéria nos números agregados do Dados** (KPIs que vêm do servidor): aceitar os mesmos
   filtros da tela.
5. **Exportar base (Alunos)**: o app exporta o filtrado no navegador; se a base ficar grande, o servidor deve
   receber os mesmos filtros e devolver sem paginação (1.3.E.4).
6. **Switch Aluno | Educação** (1.3.E.5): hoje o app liga o switch pelo papel que o login unificado devolve e
   limpa ao sair; o vínculo definitivo (conta de gestão ligada à conta de aluno da mesma pessoa) deve vir do
   servidor junto com a sessão.
7. **Perfil Professor** (1.3.E.6): no banco as chaves seguem `admin` e `basico` (só o nome na tela mudou). Se algum
   documento guarda o texto "Básico" como perfil, migrar para "Professor". O menu padrão do Professor passou a ter
   Alunos: perfis já salvos em `admin_profiles/basico` mantêm o menu antigo até o Super admin salvar de novo.
8. **Tempo de estudo** por atividade e por trilha: o cartão de conclusão usa a estimativa da régua (1 min por
   conteúdo, feedback e conclusão; 2 min por exercício).
9. **Etapa de conclusão**: a régua pinta a última etapa de bege quando o título dela é "Conclusão" (a Gestão já
   grava assim nas trilhas novas).

## 5. Pontos para validação (1.3.H e decisões tomadas sem perguntar)
1. Trilhas vinculadas ao Professor: hoje só listam e limitam o "Vincular" às matérias dele; a visibilidade segue
   matérias e turmas. Confirmar se o vínculo também deve restringir o que ele vê.
2. Login com telefone e e-mail: em produção os dois valem (decisão do sócio). Antes, a regra 1.2 era escolher um.
3. Tempos de espera: seguem o tempo da API (sem os 0,9s/1,3s simulados do protótipo); só os respiros visuais
   foram mantidos.
4. Fechamento: o monitor entra 1,6s depois da caixa de conclusão e o Continuar fica em "Aguarde…" até ele entrar.
5. Monitoria: "primeira abertura" é por aluno neste aparelho (sem campo no banco).
