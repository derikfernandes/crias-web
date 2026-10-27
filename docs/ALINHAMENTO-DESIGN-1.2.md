# Alinhamento com o Claude Design: tudo que mudou no código depois do pacote 1.1.1.b

Data: 26/10/2026. Estado do repositório: commit `94fbf20` (thiagocrias/crias-web, main).
Referência: o pacote do Claude Design entrou em `bceaf2d` (25/10, 14:22). O pacote da Prévia (itens 1.1.1.b.41 a 44) entrou em `94fbf20`.

Como ler: cada item diz **o que é**, **onde aparece na tela** e **como está hoje no código**. Textos entre aspas são exatamente os que aparecem na interface. Onde o código **diverge do design**, está marcado com **DIVERGÊNCIA**, para o Design decidir se o protótipo muda ou se o código volta.

Nota de correção: a versão anterior deste documento dizia que a página Perfil da Educação tem a escolha de login. Não tem. A escolha "Entrar com" está no formulário do aluno, na tabela de usuários e no Perfil do Aluno (seção 1).

---

## 1. Regras novas (decididas depois do pacote; não estão no design)

### 1.1 Login por telefone OU e-mail
- Vale para alunos e para usuários da Educação. Pelo menos um dos dois é obrigatório; **Nome é sempre obrigatório**.
- O sistema identifica o que a pessoa digitou (e-mail ou telefone). Quem tem os dois escolhe qual vale para a senha: campo `login_identifier` (`phone` ou `email`).
- Onde aparece na tela:
  - **Formulário do aluno (Educação)**, seção "Cadastro" / "Dados do aluno": campos "Nome (obrigatório)", "Telefone (obrigatório, ou e-mail)", "E-mail (obrigatório, ou telefone)". Quando os dois estão preenchidos surge o grupo "Entrar com (vale para a senha)" com dois botões de opção: "Telefone" e "E-mail".
  - **Tabela de Usuários (Educação)**: colunas Instituição (só na aba Instituições), Nome, E-mail, Telefone, Perfil, Senha e a lixeira. Em edição, a linha tem um seletor com o rótulo "Entrar com (vale para a senha)".
  - **Perfil do Aluno** (página nova no Aluno, seção 4.2): mesmos três campos e o mesmo grupo "Entrar com (vale para a senha)".
  - **Perfil da Educação** (seção 3.1): só "Nome (obrigatório)", "Telefone" e "E-mail (do login)" (somente leitura). Sem escolha de login.
  - **Planilhas em massa**: colunas "Telefone (obrigatório, ou e-mail)" e "E-mail (obrigatório, ou telefone)" (seção 2).
- Pendente de backend (Cursor): usar `login_identifier` no login do aluno, login da Educação por telefone, definir senha da Educação por servidor. Está em `docs/ORIENTACOES-CURSOR-1.2.md`.

### 1.2 Salvar e Cancelar só com alteração pendente
- Regra para toda a aplicação: **Salvar e Cancelar ficam ocultos**; aparecem no topo da página (no lugar do título, à direita, ao lado da linha) só quando há alteração que precise de confirmação.
- Ações em massa **não** usam o Salvar do topo: confirmam na própria tela (seção 2).
- Sair com alteração pendente abre pop-up (seção 1.5).
- Onde se aplica: Perfil (Educação e Aluno), Usuários, Permissões, Senhas, Prompts, formulário do aluno, página do aluno (vínculos de trilha), Configuração da trilha, aba Alunos da trilha, aba Gabarito.

### 1.3 Excluir sempre visível
- **Usuário**: o botão de lixeira ("Excluir", ícone) fica na linha do usuário independente do botão Editar.
- **Aluno**: "Excluir" fica ao lado do botão "Aluno ativo" no cabeçalho do cartão do aluno. Pop-up: "Deseja mesmo excluir o aluno?" com a frase "Também saem os vínculos com trilhas, o histórico de conversa e as tentativas de exercício. Essa ação não pode ser desfeita."

### 1.4 Perfis editáveis
- Cartão **"Perfis"** na página Usuários (Super admin) e Permissões (escola, só leitura).
- Linha "Super admin": texto fixo "Acessa todas as instituições e todo o menu."
- Linhas "Admin" e "Básico": caixas de seleção, uma por item do menu (Início, Dados, Trilhas, Alunos, Usuários). **Início** fica sempre marcado e desabilitado.
- Texto de apoio: "Marque o menu de cada perfil e use Salvar. A mudança vale para todos os usuários do perfil." Para quem não é Super admin: "Só o Super admin edita os perfis."
- As mudanças só gravam no Salvar do topo. Guardado em `admin_profiles/{admin|basico}`.
- Não existe ainda "+ Adicionar perfil" (perfil personalizado com nome). Decidir com o Design se entra.

### 1.5 Pop-ups padronizados (Educação e Aluno)
Três tipos: neutro (contorno amarelo), ação (verde sólido), destrutivo (contorno vermelho). Clicar fora ou Esc cancela. Textos hoje no código:
- Sair da página com alteração: título "Tem certeza que deseja sair?"; botões "Continuar editando" e "Sair" (ou "Salvar", quando há como salvar, e "Sair sem salvar").
- Cancelar edição: "Tem certeza que deseja cancelar a edição?" / "Continuar editando" e "Cancelar edição".
- Salvar: "Tem certeza que deseja salvar?" / "Continuar editando" e "Salvar".
- Alterar cadastro da trilha: "Tem certeza que deseja alterar o cadastro?" / "Continuar editando" e "Alterar".
- Desativar trilha: "Tem certeza que deseja desativar a trilha?" com o texto "Os alunos deixam de ver a trilha até ela ser ativada de novo. Conteúdo, gabarito e progresso continuam salvos." Botão "Desativar trilha". Ativar não pede confirmação.
- Criar trilha: "Tem certeza que deseja criar a trilha?" com o texto "A configuração de estrutura não poderá ser alterada depois." Botões "Continuar editando" e "Salvar".
- Sair da conta: "Tem certeza que deseja sair da conta?" com "Seu progresso fica salvo." (Aluno) e "Sair".
- Excluir trilha: "Deseja mesmo excluir a trilha?". Excluir atividade: "Deseja mesmo excluir a atividade?". Anular exercício: "Anular exercício?".
- Senhas: "Gerar senhas para alunos sem senha?" (botão "Gerar senhas") e "Gerar nova senha?" com "Gerar nova senha para NOME? A senha anterior deixará de funcionar." (botão "Gerar nova senha").
- Prompts: "Aplicar padrão do sistema?".

### 1.6 Texto ao aluno sempre por IA (padrão)
- Etapas de **conteúdo** de uma trilha nova nascem como IA (antes nasciam como texto fixo). O texto fixo continua existindo, mas só se alguém escolher.
- Cada etapa de conteúdo recebe um tipo de bloco pela posição: a primeira é Introdução; a última é Conclusão quando há 3 ou mais conteúdos; no meio alternam Explicação, Exemplo prático e Aprofundamento. Exercício continua como exercício.
- Salvar a Estrutura de uma trilha existente mantém título, tipo e comando já gravados na mesma posição.
- Mudança de interface: nenhuma tela nova. Afeta o que a Prévia mostra (seção 3.4).

### 1.7 Tela cheia (Aluno e Educação)
- Botão redondo só com ícone ("open in full"); em tela cheia vira X; Esc também sai. Navegação normal dentro da tela cheia, e o modo se mantém ao trocar de app. No Aluno fica no canto superior direito; na Educação, no topo, antes do botão de tema. Não aparece onde o navegador não permite (iPhone). (Já previsto em INTERFACE.md, Revisão 9; aqui só confirmando que está no código.)

---

## 2. Ações em massa (um padrão só, componente `BulkPanel`)

**Sequência igual em todas:** cartão recolhido (título, subtítulo, seta) > ao abrir: linha "Colunas" com uma etiqueta por coluna da planilha (com o que vem entre parênteses: obrigatório, opcional, sim / não) > nota opcional > botões **[Baixar planilha modelo ou base]**, **[Carregar planilha]**, **[botão da ação]** e o nome do arquivo ("Nenhum arquivo selecionado") > depois de carregar: "N linhas prontas para aplicar. M linhas com erro ficam de fora." e a tabela de erros (linha, referência, motivo) > ao tocar na ação: confirmação em linha com **negrito + contagem** e botões "Cancelar" e (verbo da ação) > resultado: **"Planilha aplicada:"** + resumo + "K linhas com erro" + tabela de erros.

Regras comuns de leitura: importar **sempre adiciona ou altera**, nunca apaga o que não está na planilha; só as colunas indicadas são lidas; linha vazia é ignorada; a linha 1 é o cabeçalho; campo em branco **não** altera (nas edições). Botão da ação fica desabilitado quando não há nada para aplicar ("Nada para aplicar nesta planilha."). Verde para ações; **vermelho** para remoções.

| Onde | Título do cartão | Colunas da planilha | Botão da ação | Texto da confirmação (exemplo) |
|---|---|---|---|---|
| Alunos, e página da Instituição | Cadastrar alunos em massa | ID Instituição (obrigatório), Nome (obrigatório), Telefone (obrigatório, ou e-mail), E-mail (obrigatório, ou telefone), Senha (opcional) | Cadastrar | "Cadastrar alunos em massa? 5 alunos serão cadastrados, 1 já cadastrado fica de fora." |
| idem | Editar alunos em massa | ID Instituição, ID Aluno, Nome, Telefone, E-mail, Escolaridade, Nível pedagógico (base com os dados atuais; o aluno é achado pelo ID Aluno) | Alterar | "Editar alunos em massa? 4 alunos serão alterados, 2 ficam como estão." |
| idem | Remover alunos em massa | ID Instituição, ID Aluno, Nome (visualização), Telefone (visualização), Remover (sim / não) | Remover (vermelho) | "Remover alunos em massa? 3 alunos serão removidos, ..." O aluno perde o acesso; histórico fica guardado. |
| Trilha > Alunos | Ativar ou inativar alunos em massa | ID Trilha, Trilha, ID Aluno, Nome (visualização), Telefone (visualização), Ativo (sim / não) | Atualizar (confirma com "Confirmar") | "Ativar ou inativar em massa? ..." |
| Trilha > Gabarito | Alterar gabarito em massa | ID Trilha, Trilha, Atividade, Exercício, Gabarito, Anular (sim / não) | Alterar | idem |
| Trilha > Conteúdo | Adicionar atividades em massa | modelo de planilha da trilha | Adicionar atividades | Elas entram depois da última existente; nada é substituído. |
| Senhas | Alterar senhas em massa | ID Instituição, ID Aluno, Nome (visualização), Telefone (visualização), Senha | Alterar senhas | Termina com **"Essa ação não pode ser desfeita."** |
| Usuários | Adicionar usuários em massa | ID Instituição, Nome (obrigatório), Telefone, E-mail, Perfil (Admin / Básico), Senha (opcional) | Adicionar | idem |
| Usuários | Remover usuários em massa | ID Instituição, Nome (visualização), Telefone (visualização), E-mail, Remover (sim / não) | Remover (vermelho) | A própria pessoa e os Super admins nunca saem. |

- O resumo final de cada ação tem o formato "**X alterados, Y sem mudança**" e, quando há erro, "**K linhas com erro**" (exemplos: "3 alunos cadastrados, 1 com senha, 1 já cadastrado (de fora)."; "4 alunos alterados, 2 sem mudança.").
- Na página da Instituição, ao lado da mensagem final aparece o botão de texto **"Ver em alunos"**.
- A nova trilha nunca importa planilha para criar; só o Conteúdo adiciona atividades.
- O que ainda não está definido: o Cancelar da confirmação em linha não desfaz uma ação já aplicada (nenhuma ação é desfeita depois de aplicada).

---

## 3. Educação (Crias | Educação)

### 3.1 Estrutura geral
- **Menu no topo**: logo "Crias | Educação" (arquivo `crias-logo-educacao.svg`), pílulas Início, Dados, Trilhas, Alunos, menu "Configurações" (Usuários: Senhas e Usuários; Sistema: Prompts e API e documentação), filtro de instituições (Super admin), seletor Educação/Aluno, botão de tela cheia, tema, avatar (leva ao Perfil) e Sair.
- **Voltar** único, só texto com a seta, no topo da página.
- **Celular (até 768px)**: o menu vira drawer em tela cheia (botão hambúrguer). Entre 861 e 1000px: o filtro de instituições fica só com ícone e o espaço entre os itens cai para 6px (1.1.1.b.44, já no design). Até 860px o filtro sobe para a linha do Voltar.
- **Perfil** ("Seus dados de cadastro e o contato do suporte."): seção "Cadastro" com "Nome (obrigatório)", "Telefone", "E-mail (do login)" (somente leitura) e seção "Suporte" com WhatsApp (31) 9752-0152, contato@crias.org e botão "Falar com o suporte".

### 3.2 Usuários e Permissões
- **Usuários (Super admin)**: "Cadastro de usuários para o painel de gestão." Ordem: cartão Perfis (1.4), cartão "Adicionar usuários em massa" / "Remover usuários em massa", cartão "Usuários" com abas **Crias** e **Instituições**. Cabeçalho do cartão: título "Usuários", botão de texto com lápis **Editar** (vira "Sair da edição") ao lado do título, e **"+ Adicionar usuário"** à direita.
- **Permissões (escola)**: "Defina quais as permissões para cada usuário da instituição." Mesmo cartão, sem abas.
- Perfis disponíveis: Super admin (só na aba Crias), Admin, Básico.
- Usuários da Educação: nome obrigatório, telefone OU e-mail. Quem só tem telefone recebe o ID `tel_<dígitos>`.

### 3.3 Trilhas
- **Lista**: filtros "Filtrar trilhas" e "Filtrar matérias" na barra de Filtros; tabela Nome, Instituição (só quando há mais de uma), Matéria, Ativa, Criada em e botão **Abrir** no fim da linha.
- **Nova trilha em três etapas** (cabeçalho: Configuração > Prévia > Adicionar alunos (opcional)):
  1. **Configuração**: índice à esquerda (01 Cadastro, 02 Estrutura, 03 Criar com IA) e três cartões que recolhem pela rolagem. Botão do topo: "Criar trilha" (gera a prévia). Estrutura ganhou a chave **"Etapa conclusiva"** (ligada por padrão) ao lado de "Feedback imediato".
  2. **Prévia**: ver 3.4.
  3. **Adicionar alunos (opcional)**: "Ativar ou inativar alunos", botões "Ativar todos" e "Inativar todos", contador "X de Y ativados", lista com chave Ativo/Inativo. Botão do topo: "Salvar trilha".
  A trilha **nasce ativa**. Só "Salvar trilha" grava (trilha, atividades e alunos marcados). "Cancelar" pergunta "Tem certeza que deseja sair?".
- **Trilha aberta**: abas Configuração, Conteúdo, Alunos e Gabarito no topo, e a chave **"Trilha ativa"** na linha das abas (mantém o tamanho no celular). Ativar não pede confirmação; desativar abre o pop-up (1.5).
  - **Conteúdo**: rótulo "Novas atividades" e dois painéis lado a lado: "Adicionar atividades em massa" e "Adicionar atividades com Inteligência Artificial". O painel de IA tem cabeçalho que quebra linha no celular.
  - **Alunos**: título "Alunos da trilha"; "Alterar posição em massa" (escolher "Atividade de destino" e "Etapa de destino", botão "Aplicar a N aluno(s)"); "Adicionar ou remover" com abas; cartão "Ativar ou inativar alunos em massa" (seção 2); tabela Aluno, Etapa, Atividade, Status, Início, Última interação. Vínculos alterados ficam pendentes até o Salvar do topo.
  - **Gabarito**: "Alterar gabarito em massa" (seção 2) e edição por linha, tudo pendente até o Salvar do topo.

### 3.4 Prévia da trilha (itens 1.1.1.b.41 a 44, **já aplicados no código conforme o design**)
- Lista de atividades à esquerda (número "01", nome com esmaecimento no fim, seta redonda que gira) e cartão **Resumo** à direita. Todas começam recolhidas; abrir uma mostra os blocos B1, B2... (Conteúdo #00be85, Exercício #ffd500, Feedback #88cde7, Conclusão #e9e1c6 com texto #4a4030, todos do mesmo tamanho) e abaixo cada etapa com tipo, título e conteúdo. Até 6 atividades; "+ N atividades" mostra o resto ("Mostrar menos" volta).
- Resumo: nome, "matéria · objetivo" (ou N/A); 3 números (atividades, exercícios no total, "≈ N min por atividade"); linhas Conteúdos, Exercícios, Alternativas por exercício, Feedback instantâneo, Bloco conclusivo; nota "Tempo aproximado: 1 min por bloco de conteúdo, feedback ou conclusão e 2 min por exercício." Sem botão no Resumo.
- Mesma Prévia em **Adicionar atividades com IA** (trilha aberta), com Resumo "Novas atividades".
- Topo da Prévia da nova trilha: botão **"Salvar trilha"** (salva direto, sem passar por Adicionar alunos) e a etapa "Adicionar alunos" com contorno verde.
- **DIVERGÊNCIAS em relação ao design da Prévia (decidir):**
  1. **Confirmação ao salvar**: o design diz "salva direto"; o código mantém o pop-up "Tem certeza que deseja criar a trilha? A configuração de estrutura não poderá ser alterada depois." (regra anterior 1.5). O Design deve dizer se o pop-up sai.
  2. **Rótulo do botão em Adicionar atividades com IA**: o design diz "Adicionar atividades"; o código usa **"Criar atividades"** (pedido anterior). O Design deve dizer qual vale.
  3. **Feedback instantâneo** não é chave no código (o design tem chave): hoje é a etiqueta fixa "Feedback imediato" e o Resumo mostra sempre "Sim".
  4. **Etapa conclusiva**: a chave existe e liga/desliga a Prévia (bloco B conclusivo e "Bloco conclusivo: Sim/Não"), mas **nada é gravado**: a trilha criada não tem etapa conclusiva e as atividades geradas não trazem texto de conclusão (a Prévia mostra um texto explicativo no lugar). Em Adicionar atividades com IA o Resumo mostra "Bloco conclusivo: Não". Falta backend (`conc`, booleano, padrão verdadeiro no formulário).
  5. Feedback e Conclusão na Prévia mostram um texto-padrão ("Informa se a resposta está correta e explica o porquê..." e "Sintetiza os pontos principais da atividade, sem conceito novo...") porque o conteúdo real só é gerado quando o aluno estuda. O design pode definir outro texto.

### 3.5 Alunos
- Lista: colunas na ordem do design 1.1.1.b: Nome, ID Aluno, Trilha atual, Atividade, Etapa, Status, Telefone, Escolaridade, Nível pedagógico, Criado em, Atualizado em, Ativo e a seta de abrir. Filtros "Filtrar por nome" e "Filtrar por ID".
- **Página do aluno** ("Cadastro, trilhas vinculadas e conversa com o monitor."): cartão "Cadastro" com "Aluno ativo" e **Excluir ao lado**, formulário (1.1), cartão "Trilhas vinculadas" (colunas Trilha, Atividade atual, Etapa atual, Status, Início, Última interação) e "Vincular nova trilha". Trilhas vinculadas/desvinculadas ficam **pendentes até o Salvar do topo**, com a etiqueta na linha: "Será vinculada ao salvar", "Será desvinculada ao salvar" ou "Alteração pendente", e o botão "Manter"/"Remover"/"Desvincular".

### 3.6 Instituição e Início
- **Página da Instituição** ("Cadastro da instituição e alunos em massa."): cartão "Cadastro da instituição" com chave "Instituição ativa", campos Nome e Tipo e **lápis** para editar (Salvar no topo); abaixo, as três ações em massa de alunos (seção 2) com "Ver em alunos".
- **Início da escola** usa o mesmo cadastro. Início do Super admin: "Instituições" com filtro, cartões por instituição e botão de lápis "Editar" que leva à página da Instituição.

### 3.7 Senhas
- "Senhas dos alunos" ("Nome, celular e senha dos alunos de cada escola. Toda visualização, exportação e nova senha fica registrada."). Só Master. **Senha gerada ou alterada fica pendente e só grava no Salvar do topo**; coluna E-mail incluída. Pop-ups em 1.5; "Alterar senhas em massa" em 2.

### 3.8 Dados
- Barra **"Filtros"** fixa: "Filtrar trilhas" e a pesquisa **"Pesquisar nome ou telefone do aluno"** (antes só nome).
- Resumo com **5 cartões**: Alunos ativos, Trilhas ativas, Conclusão média, Acerto médio, Perguntas ao monitor (média por aluno).
- Linha de três cartões: **Conclusão das atividades** (com o filtro "% de conclusão" por duas barras, "De" e "Até"), **Situação dos alunos** (gráfico de pizza; "Concluiu" no lugar de "Concluído") e **Uso do monitor** (abas de período; Mensagens, Alunos, Cobertura, Por dia).
- "Alunos por atividade concluída" (gráfico de barras). **Desempenho** ("Clique em um exercício para ver o enunciado"): Menor acerto e Maior acerto.
- Cartão "Alunos e exercícios" com abas, **seletores "Atividades", "Etapas" e "Colunas"** e "Exportar histórico". As abas **não movem os cartões** acima. Aviso quando a trilha não tem exercícios. Vocabulário "atividade" e "etapa" também nas planilhas exportadas.

---

## 4. Aluno (Crias Aluno)

### 4.1 Painel (dashboard)
- Linha de filtro por trilha: "Todas as trilhas" e uma pílula por trilha.
- Cartões: **Progresso** (Atividades liberadas, Atividades feitas, % de conclusão, barra e uma linha por trilha "X de Y atividades"), **Desempenho** ("Nos exercícios, você acertou X de Y respostas." ou "Você ainda não respondeu exercícios."; Acertos, Erros, % de acerto; legenda; listas **"Mais erros"** e **"Mais acertos"** com detalhes por atividade) e **Uso do monitor** (Perguntas feitas, Dias com conversa, Última conversa; uma linha por trilha e "Monitoria (fora das trilhas)").
- Barra do monitor embaixo: "Pergunte ao monitor sobre o seu desempenho…" e botão "Enviar pergunta ao monitor". **Enviar leva à Monitoria.**

### 4.2 Perfil
- Abre pelo nome no rodapé do menu. Título "Perfil"; seção "Cadastro": "Nome (obrigatório)", "Telefone (obrigatório, ou e-mail)", "E-mail (obrigatório, ou telefone)" e, com os dois preenchidos, "Entrar com (vale para a senha)" (Telefone / E-mail). Seção "Suporte": (31) 9752-0152, contato@crias.org, botão "Falar com o suporte". Cancelar e Salvar só com alteração (1.2), com os pop-ups de 1.5.

### 4.3 Menu e navegação
- Ao abrir uma trilha, o menu **recolhe as outras trilhas**. Botão **"Voltar para página inicial"** dentro da trilha. Pop-ups do Aluno seguem o `ConfirmModal` (1.5).

---

## 5. Texto sugerido para INTERFACE.md (registrar como 1.1.1.b.45 em diante)
- **1.1.1.b.45 Login por telefone ou e-mail:** seção 1.1 acima.
- **1.1.1.b.46 Salvar e Cancelar só com alteração pendente; ações em massa confirmam na tela:** seções 1.2 e 2.
- **1.1.1.b.47 Excluir sempre visível (usuário) e ao lado de "Aluno ativo" (aluno):** seção 1.3.
- **1.1.1.b.48 Perfis editáveis:** seção 1.4.
- **1.1.1.b.49 Texto ao aluno por IA como padrão:** seção 1.6.
- **1.1.1.b.50 Dados, Alunos, Instituição, Senhas, Usuários e Painel do aluno:** seções 3 e 4 (conferir contra o protótipo e corrigir o que for diferente).

## 6. O que pedir ao Design
1. Atualizar o protótipo (Aluno e Educação) com os itens das seções 1 a 4, principalmente 1.1, 1.2, 1.4, 2 e 3.4.
2. Decidir as cinco divergências da Prévia (3.4).
3. Dizer se entra "+ Adicionar perfil" (perfil personalizado com nome).
4. Validar tablet (retrato e paisagem) de Nova trilha, Prévia, Dados e Painel do aluno.
