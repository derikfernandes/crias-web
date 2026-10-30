# Plano de trabalho: Aluno 1.3 e Educação 1.3

Arquivos: `Crias Aluno v1.3.dc.html` (de Aluno 1.2.5) e `Crias Gestao v1.3.dc.html` (de Gestão 1.2, exibida como Crias Educação 1.3; o nome do arquivo segue `Crias Gestao`). As versões anteriores ficam intactas.

Ordem: primeiro o que não depende de dado novo (Aluno, estrutura da Educação), depois o dado novo (turma, matérias do professor), depois as telas que usam esse dado, a varredura do protótipo, a varredura do repositório e, por fim, documentação e pacote.

## Rodada 2 (30/10/2026)
- Esmaecimento abaixo da régua: 16px para 24px.
- Botão "Início" (trilha concluída): sem ícone de casa.
- Perfil "Admin" vira **Gestão** (perfis: Super admin, Gestão, Professor).
- Alunos: "Filtrar por ID" sai e entra "Filtrar turma".
- Confirmados: turma da trilha pelos alunos vinculados; Professor só vê suas matérias e turmas.
- Pacote completo atualizado em `export/repo/`.

## Etapa 0. Base
- [x] Cópias v1.3 com os links internos ajustados.

## Etapa 1. Aluno 1.3 (feita no protótipo)
- [x] 1.1 Esmaecimento abaixo da linha "Etapa X de Y" (o conteúdo que rola some por baixo da régua).
- [x] 1.2 Início com todas as trilhas concluídas: segue o mesmo layout (cartão principal + linhas). O cartão principal é a trilha concluída mais recente, com "REVEJA A ATIVIDADE" e o botão "Rever". Tweak `todasConcluidas`. Na trilha concluída, "AGORA" mostra a última atividade (antes repetia "Trilha concluída").
- [x] 1.3 Tela cheia em tablet e celular: o botão aparece em qualquer aparelho cujo navegador permita tela cheia (Android, iPad); só some onde não há suporte (iPhone). No protótipo já aparece dentro das molduras (conferido). Causa provável no app: `src/lib/fullscreen.ts` decide pelo `document.fullscreenEnabled`, que vem falso em parte dos navegadores de celular, tablet e navegadores internos de apps (ex.: WhatsApp). Regra: mostrar quando `requestFullscreen` ou `webkitRequestFullscreen` existir no elemento raiz (mesma checagem do protótipo); se o pedido falhar, esconder o botão na sessão. iPhone não tem a API: lá o botão não aparece (limite do navegador).
- [x] 1.4 Início: o personagem do monitor aparece direto, sem o símbolo do Crias antes. Enquanto o personagem não carrega, o espaço fica vazio com a mesma altura. Causa no app: `src/components/monitor/MonitorAvatar.tsx` mostra `<CriasSymbol>` enquanto o módulo do personagem carrega. Correção: espaço vazio do mesmo tamanho (em todo avatar do monitor) e pré-carregar `criasMonitorElement` ao abrir o app. O protótipo já está certo.

## Etapa 2. Educação 1.3: estrutura (feita no protótipo)
- [x] 2.1 Sai o botão de tela cheia (topo, menu e celular; lógica removida).
- [x] 2.2 Menu volta para a lateral esquerda, no padrão do menu do Aluno: cor, cantos, grupos com rótulo em caixa alta, item ativo, recolher, efeito de abertura, rodapé (tema, avatar, nome, sair). Conteúdo reposicionado com proporção equilibrada. Celular: menu em tela cheia. Aplicado: o menu lateral da v1.1 (mesmo do Aluno: placa #fdfcf9 com cantos e borda esfumada, rótulos de grupo, item ativo com encaixe, vMenuIn no celular) volta no computador; sai a barra do topo; título alinhado ao primeiro item do menu (--hd-pt 90,5px) e conteúdo em 203px (--hd-min), como na v1.1; filtro de instituições e etiqueta da escola na linha do Voltar, à direita; menu recolhido: botão de abrir à esquerda do Voltar; rodapé com nome do usuário (não o e-mail), como no Aluno.
- [x] 2.3 Switch Aluno/Educação: só para perfis de gestão (Super admin, Admin, Professor). Troca entre a conta de gestão e a conta de aluno da mesma pessoa. Aluno comum não vê o switch. Protótipo: pílula Aluno | Educação no rodapé do menu, acima do usuário (Educação sempre; Aluno com o tweak `acessoGestao`). No app hoje o Aluno decide por `localStorage 'crias:acesso-gestao'` gravado pela Gestão no aparelho (qualquer aluno no mesmo aparelho veria o switch). Regra nova para o backend: o vínculo vem da conta (gestor ligado à conta de aluno da mesma pessoa); a troca entra na conta vinculada.

## Etapa 3. Dado novo: turma e matérias
- [x] 3.1 Dados de exemplo: turmas por instituição; cada aluno com uma turma; cada trilha com matéria e turmas; cada gestor com matérias e turmas.
- [x] 3.2 Filtros do topo (Início e Trilhas): Filtrar matéria, Filtrar turma, Filtrar trilhas, nessa ordem. A pesquisa por nome ou telefone do aluno sai do topo e vai para a aba Alunos, numa segunda linha abaixo da etiqueta.

## Notas técnicas do protótipo (Educação)
- Filtros: helper `mkFilt(prefixo, itens, chaveSel)` (subiu para antes da lista de trilhas). Dados: `dm` matéria, `dc` turma, `dt` trilhas (trilhas em cascata pela matéria). Lista de trilhas: `ms` matéria, `lc` turma, `t` trilhas.
- Busca do Dados (`dAq`) agora filtra só a tabela da aba Alunos.
- Desempenho por aluno: `perfOf(x, trilha?)` e `perfFlat(p)` (mesma conta do Dados), `PERF_COLS`, `twoLine`. Evitar `<sc-for>` aninhado dentro de `<tr>` com outro `<sc-for>` (travou a página); usar células fixas.
- Alunos gerados (200 + 50) recebem turma e escolaridade coerentes (TU/TL).

## Etapa 4. Telas com turma
- [x] 4.1 Início, aba Alunos: Turma ao lado do Nome, com ordenação. Exportação: "Turma" logo abaixo de "Nome" na lista de colunas.
- [x] 4.2 Menu Alunos: coluna Turma depois de ID Aluno; depois de "Atualizado em", todas as colunas de progresso e desempenho da aba Alunos do Início. Botão "Exportar base" abaixo dos filtros, à direita, alinhado com "Adicionar aluno". Regra: a base exportada é sempre o que está filtrado.
- [x] 4.3 Trilhas: tabela com Matéria, Turma, Trilha, nessa ordem. Trilha, aba Alunos: depois de Status, todas as informações de desempenho do Início.
- [x] 4.4 Perfil do aluno: Turma ao lado do Nível pedagógico. Cadastro individual e em massa com Turma (planilha modelo inclusive).

Feito na Etapa 4 também: Turma na aba Alunos da trilha (depois do nome), em "Ativar ou inativar alunos da trilha" (tabela e planilha), em Senhas dos alunos (tabela e planilha), nas planilhas de cadastrar, editar e remover alunos (Instituição e Alunos) e nas mensagens das planilhas. Campo Turma no cadastro do aluno com lista das turmas da instituição (aceita turma nova).

## Etapa 5. Usuários (gestores)
- [x] 5.1 Perfil "Básico" passa a se chamar "Professor".
- [x] 5.2 Tabela de cadastros no mesmo formato da tabela de Alunos, com Matérias e Turmas ao lado do Nome e antes do Perfil (separadas por vírgula quando houver mais de uma).
- [x] 5.3 Clicar no gestor abre o perfil dele, como no aluno, com vinculação de trilhas.
- [x] 5.4 Cadastro do gestor: Matérias no lugar de Escolaridade e Turmas no lugar de Nível pedagógico, com seleção no formato dos filtros (lista com marcação). Super admin e Admin: todas por padrão. Professor: só as marcadas no cadastro.
- [x] 5.5 Cadastro em massa de usuários com as colunas Matérias e Turmas.
- [x] 5.6 Regra para o backend (no protótipo: tweak perfil "Professor" = Mariana Lima, Matemática, 8º A e 8º B; menu sem Configurações): o Professor só vê dados das matérias e turmas do cadastro dele (filtros, tabelas, exportações e indicadores).

Feito na Etapa 5: tabelas de Usuários (PA13 Cadastros e PA18 Crias/Instituições) no formato de Alunos: só leitura, ordenáveis, busca aplicada, Nome abre o perfil, Abrir no fim; colunas Nome, Matérias, Turmas, Perfil, E-mail, Telefone, Ativo (Instituições começa com Instituição). Senha e Excluir saíram da tabela e foram para o perfil (PA20 Usuário, rota `gestor`): Cadastro (Nome, Telefone, Senha, E-mail, Perfil, Matérias, Turmas; Usuário ativo e Excluir), Trilhas vinculadas (Matéria, Turma, Trilha, Ativa, Desvincular; Vincular trilha mostra só trilhas das matérias do professor). Admin e Super admin: Matérias e Turmas fixas em "Todas". "Adicionar usuário" abre o perfil em branco. Planilha de usuários com Matérias e Turmas depois do Nome; Perfil (Admin / Professor). Dados de exemplo: Mariana Lima e Rafael Moura (Professor).

## Etapa 6. Varredura do protótipo
- [x] Turma ao lado do nome do aluno em todo cadastro, tabela, perfil, planilha e exportação. Matérias e turmas ao lado do nome do gestor em Usuários. Lista de cada lugar conferido.

Conferido (Turma): Dados > Alunos (tabela, ordenação, exportação), Alunos (tabela, Exportar base), Trilhas (lista e tabela do Início da Instituição: Matéria, Turma, Trilha), Trilha > Alunos (tabela e Ativar ou inativar), Senhas dos alunos, Início da Instituição (tabela de alunos), Perfil do aluno (campo), planilhas de cadastrar, editar, remover, ativar/inativar e senhas, mensagens das planilhas. Usuários: Matérias e Turmas ao lado do Nome (tabelas, perfil PA20, planilha), Perfil próprio (PA19) mostra Perfil, Matérias e Turmas só para leitura. Não alterado: listas de opções dos filtros por nome (não são cadastro).

## Etapa 7. Varredura do repositório (thiagocrias/crias-web, main)
- [x] 7.1 Alternativas do exercício separadas do enunciado, uma por linha.
- [x] 7.2 Dinâmica de troca de mensagens do Aluno (1.2.5.8 a 1.2.5.12): espera no lugar final, esmaecimento, respiros, fechamento automático, Continuar travado.
- [x] 7.3 Matriz protótipo × repositório, tela por tela, com o que falta.
- [x] 7.4 Conflitos de regras.

Etapa 7 registrada em INTERFACE.md 1.3.F (achados com arquivos) e 1.3.G (conflitos). A conferência linha a linha do PlayerPage.tsx (190 KB) fica como checklist obrigatório do Claude Code (1.3.F), com critérios de aceite.

## Etapa 8. Documentação e pacote
- [x] 8.1 INTERFACE.md: seção "Versão 1.3" (regras + orientações ao Claude Code e ao backend).
- [x] 8.2 CLAUDE.md e tabela de versões.
- [x] 8.3 Pacote `export/v1.3/` espelhando o repositório, com PROMPT-CLAUDE-CODE.md. Versões offline: pendentes.
- [ ] 8.4 Conferência final.

## Conflitos já identificados
1. 1.1.1.b.38 ("Aluno e Gestão são acessos diferentes, sem seletor") × switch para perfis de gestão. Vale o 1.3.
2. Gestão 1.1.1.b (menu no topo) × menu lateral. Vale o 1.3.
3. Revisão 9 (tela cheia na Gestão) × sem tela cheia na Educação. Vale o 1.3.
4. v1.0 ("Trilha concluída sai da lista do Início") × 1.2.5.1 e 1.3 (concluída continua no Início). Vale o 1.3.
5. Perfil "Básico" × "Professor". Vale o 1.3.

## Cuidados
- "Básico" também é valor do Nível pedagógico do aluno (Básico, Intermediário, Avançado). Só o perfil de usuário vira "Professor".
- Dados de exemplo: inst-01 Escola Estadual Exemplo (Ana Souza, Bruno Lima, Diego Rocha, Elisa Prado; trilhas Matemática básica, Leitura e interpretação, Produção de texto); inst-02 Colégio Exemplo (Carla Dias, Felipe Nunes; Ciências da natureza, História do Brasil, Geografia do Brasil). Usuários em ADMIN_USERS.
- Turmas de exemplo: inst-01 8º A, 8º B, 9º A; inst-02 1º A, 2º A.
- Turma da trilha = turmas dos alunos vinculados (calculada, sem campo novo na trilha).

## Leituras a confirmar
- A. "Nas colunas, em exportação, adicionar também alunos abaixo do nome": li como "Turma" logo abaixo de "Nome" na lista de colunas da exportação.
- B. Usuários: ordem Nome, Matérias, Turmas, Perfil (atende "ao lado do nome" e "Turmas ao lado de Perfil").
- C. "Rever" abre a trilha concluída com o histórico, como hoje.
