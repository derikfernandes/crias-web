# Orientações para o Cursor: pacote 1.3 (ler antes de publicar)

Data: 30/10/2026. Relatório completo: `frontend/crias-aluno/design/RELATORIO-1.3.md`.

## 1. O que aconteceu na 1.2.5
Parte do design 1.2.5 não estava no código (ficou marcada como "não aplicado") e outra parte foi substituída
depois (a espera da IA virou esqueleto cinza com "Carregando…"). Na 1.3, **tudo do design 1.2.5 e 1.3 está no
código**, em cima do `main` de vocês (PR #37). A lógica de produção de vocês foi mantida.

## 2. Como juntar sem perder nada
1. Partir do `main` do `thiagocrias/crias-web` (já contém o main de vocês).
2. Em conflito: **lógica, API e banco = de vocês; visual (JSX de apresentação e CSS) = do design**.
3. Rodar `npx vitest run` antes de publicar. Os testes de contrato precisam passar:
   - `frontend/crias-aluno/src/lib/contrato-design-1.3.test.ts`
   - `frontend/crias-gestao/src/lib/contrato-design-1.3.test.ts`
   Eles leem o código e falham se um item do design sumir (por exemplo, a espera voltar a ser esqueleto).
   **Não apagar nem afrouxar esses testes.** Se um falhar, o item do design foi removido: recolocar o item.
   Se a mudança for intencional, combinar com o Thiago e atualizar o design primeiro.

## 3. Onde está cada item (Aluno)
| Item | Arquivo |
|---|---|
| Espera no lugar final (símbolo + três pontos; caixa do monitor com linhas) | `src/components/ConversationParts.tsx` (`TypingRow`) |
| Abertura da atividade e poll da IA usam a mesma espera (sem esqueleto) | `src/pages/PlayerPage.tsx` |
| Esmaecimento de entrada (0,5s, 6px) | `src/styles/crias-v1-0.css` (`v125In`) |
| Resposta sobe ao topo, espera logo abaixo, sem rolar sozinho | `PlayerPage.tsx` (`startPin`, `data-pin-space`, `data-pending-answer`) |
| "NOVA ATIVIDADE" | `PlayerPage.tsx` (`.v125-sep`) |
| Caixa "Atividade concluída" / "Trilha concluída" | `src/components/ActivityDoneCard.tsx` |
| Continuar em "Aguarde…" no fechamento (1,6s até o monitor) | `PlayerPage.tsx` (`closingWaiting`) |
| Monitor em destaque e textos | `src/components/MonitorHighlight.tsx`, `src/lib/monitorOffers.ts` |
| Régua (segmentos clicáveis, rótulo, rolar até a etapa, esmaecimento 24px) | `src/components/ActivityRuler.tsx`, `src/layouts/ChatLayout.tsx` |
| Trilha concluída fica no Início | `src/pages/TrailsPage.tsx` |
| Tela cheia em tablet e celular | `src/lib/fullscreen.ts`, `src/lib/useFullscreen.ts` |
| Monitor sem símbolo antes do personagem | `src/components/monitor/MonitorAvatar.tsx`, `src/main.tsx` |
| Monitoria (histórico acima, sugestões na 1ª abertura) | `src/pages/MonitoriaPage.tsx` |

## 4. Onde está cada item (Educação)
| Item | Arquivo |
|---|---|
| Menu lateral igual ao do Aluno, sem tela cheia | `src/layouts/AdminLayout.tsx`, `src/design/styles/gestao.css` |
| Filtros matéria, turma, trilhas | `src/lib/turmas.ts`, `DashboardPage.tsx`, `design/views/DashboardPageView.tsx`, `TrailsListPage.tsx`, `StudentsListPage.tsx` |
| Turma do aluno (formulário, planilhas, tabelas) | `components/StudentForm.tsx`, `lib/bulkActions.ts`, `lib/studentBulk.ts`, `pages/students/BulkBlocks.tsx`, `StudentPasswordsPage.tsx`, `pages/trail/StudentsTab.tsx` |
| Desempenho nas tabelas de alunos | `hooks/useStudentMetrics.ts`, `hooks/useTrailAttempts.ts`, `components/PctCell.tsx` |
| Perfis Super admin, Gestão, Professor | `lib/adminProfiles.ts` |
| Usuários: tabela só leitura e página do usuário | `pages/admin/UsersReadTable.tsx`, `pages/UserProfilePage.tsx`, `UsersPage.tsx`, `AdminPage.tsx` |
| Escopo do Professor na tela | `lib/turmas.ts` (`scopeOf`, `trailInScope`, `studentInScope`) |

## 5. Backend (CONFLITOS, sem inventar endpoints)
1. `students.turma` em todas as listas e planilhas de aluno.
2. `admin_users.materias[]`, `turmas[]`, `trail_ids[]` (o app já grava; vazio = todas).
3. Professor: filtrar no servidor por matéria (pela trilha) e turma (pelo aluno) em `dashboard_metrics`,
   `student_trails` e exportações.
4. Números agregados do Dados aceitarem os filtros de matéria e turma.
5. Exportar base de alunos com os filtros, sem paginação, quando a base crescer.
6. Switch Aluno | Educação: vínculo da conta de gestão com a de aluno vir na sessão.
7. Perfil `basico` aparece como "Professor" (chave igual). Migrar textos "Básico" gravados, se houver.
   O menu padrão do Professor ganhou Alunos; `admin_profiles/basico` salvo antes mantém o menu antigo.
8. Tempo de estudo real por atividade e trilha (hoje é estimado pela régua).
9. Etapa de conclusão com título "Conclusão" para a régua pintar de bege.
