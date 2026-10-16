> **Versão entregue: v1.1.** As regras marcadas como "Base v1.1" (antes chamadas v1.2) são a versão final e valem sobre a "Base v1.1 inicial" e a v1.0.

# Interface Crias: regras e orientações

Este arquivo guarda as regras da interface. Cada regra inviolável definida na revisão entra aqui.

## Versões

| Versão | Arquivos no projeto | Antes chamada |
| --- | --- | --- |
| **v1.1 (atual)** | `Crias Aluno v1.1.dc.html`, `Crias Gestao v1.1.dc.html` | v1.1 |
| v1.0 (travada) | `Crias Aluno v1.0.dc.html`, `Crias Painel v1.0.dc.html` | v1.0 |
| Histórico | pasta `historico/` | v2 a v5 e telas antigas |

No repositório os arquivos não levam o sufixo de versão. As seções abaixo numeram as regras pela versão (1.1.x e 1.0.x).

## Como aplicar este pacote

O pacote (`export/repo/`) espelha a raiz do repositório `thiagocrias/crias-web`, branch `main`. Copie as pastas por cima da raiz e faça o commit.

| Caminho no pacote | O que é |
| --- | --- |
| `CLAUDE.md` | Regras do projeto para o Claude Code |
| `frontend/crias-aluno/design/LEIA-ME.md` | Guia da pasta de design |
| `frontend/crias-aluno/design/INTERFACE.md` | Este arquivo. Regras de interface e de front-end |
| `frontend/crias-aluno/design/DECISOES.md` | O que foi feito e o que falta decidir |
| `frontend/crias-aluno/design/prototipo/Crias Aluno.dc.html` | Crias Aluno (v1.1). Precisa de `support.js` e `assets/` na mesma pasta |
| `frontend/crias-aluno/design/prototipo/Crias Gestao.dc.html` | Crias Gestão (v1.1), ligado ao Crias Aluno pelo seletor Aluno/Gestão |
| `frontend/crias-aluno/design/prototipo/Crias Aluno offline.html`, `Crias Gestao offline.html` | Os mesmos protótipos em arquivo único: abrem com dois cliques, sem internet, com as imagens dentro, e apontam um para o outro |
| `frontend/crias-aluno/design/design-system/` | Tokens (`styles.css`), guia (`readme.md`) e logotipos |

Ao subir, apague do repositório o arquivo antigo `frontend/crias-aluno/design/prototipo/Crias Aluno (offline).html` (substituído pelos dois arquivos offline) e `frontend/crias-aluno/design/ATUALIZACAO-DESIGN-SYSTEM.md` (histórico da revisão anterior, guardado no projeto de design).

O código dos apps (`frontend/crias-aluno/src` e `frontend/crias-gestao/src`) não vem no pacote. A v1.1 é aplicada sobre ele pelo Claude Code, seguindo este arquivo.

## Base v1.1 (em andamento, desde 15/10/2026)

Arquivos: `Crias Aluno v1.1.dc.html` e `Crias Gestao v1.1.dc.html`, copiados da v1.1 travada. Valem sobre a v1.1 onde houver diferença.

**1.1.1 Gestão no celular** (15/10/2026)

A Gestão passa a seguir os mesmos padrões de celular do Crias Aluno (F1 a F29), que já funcionam bem lá.

- Tweak **celular** na Gestão, igual ao do aluno: mostra a Gestão num iPhone 17 (402×874) ao lado da versão web, na mesma tela, perfil, estado e tema. A versão web encolhe 460px à direita para dar lugar ao aparelho. Só no protótipo.
- Viewport de app sem zoom (`maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content`), `touch-action: manipulation`, sem destaque de toque.
- Altura pela área visível (`--vvh` e `--vvt` vindos de `visualViewport`, nunca 100vh); a página nunca rola, só a área de conteúdo.
- Áreas seguras: topo da página, botão de abrir menu e botões do protótipo descem com `safe-area-inset-top`; o fim do conteúdo soma `safe-area-inset-bottom`.
- Margem lateral do conteúdo: 32px na web, **16px** no celular. Títulos de página (h1): 28px na web, **24px** no celular, em uma linha com esmaecimento.
- Alvos de toque: no celular, botões, links, seletores e campos da área de conteúdo e das janelas têm no mínimo **44px** de altura; botões só com ícone, 44×44.
- Campos com no mínimo 16px (evita zoom ao focar).
- Início do Super admin: filtro e "+ Nova instituição" quebram em duas linhas quando não cabem (filtro em cima, largura total; botão abaixo, à esquerda).
- Cadastro da instituição: o campo Nome ocupa a linha inteira (`grid-column: 1 / -1`), sem criar coluna extra no celular.
- Tabelas: rolam na horizontal dentro do cartão, com esmaecimento na borda que ainda tem conteúdo (1.1.25). Grades usam `minmax` que cabe em 370px.
- Menu: tela cheia no celular (já era), fecha ao escolher um item.

**1.1.2 Personagem do monitor** (15/10/2026)

Definido em `Monitor Personagem.dc.html` (componente `crias-monitor.js`, three.js), também no design system. **Aplicado no Crias Aluno v1.1**: Monitoria, Painel e respostas do monitor dentro da trilha.

- Forma: esfera azul clara (degradê de #b4e2f6 a #3f9fd0, base #82cbec, Tropical breeze do design system) com manchas verdes suaves (#cadea5, #a7edcb) e nuvens desfocadas, lembrando a Terra de dia sem realismo. Anel amarelo #ffd500 (raio 1,45 vez o corpo, espessura 5% do raio do anel). Dois olhos pretos brilhantes (#030504), só reflexo, sem íris nem pupila. Sem boca nem emoji.
- Onde entra: substitui o círculo amarelo "M" nas mensagens do monitor (Monitoria, Painel e respostas do monitor dentro da trilha). **As mensagens de conteúdo da trilha continuam com o símbolo do Crias.** No chat: 32×32 px na web e 22×22 px no celular, sem sombra no chão. O símbolo do Crias nas mensagens da trilha passa a ter o mesmo tamanho (32 px na web, 22 px no celular), para que o anel do monitor estático e o símbolo completo tenham o mesmo raio visual (cerca de 90% da caixa).
- Carregando na conversa: o personagem em estado carregando ocupa o lugar do avatar; ao lado, "Monitor" (13px, 700) e, logo abaixo, três pontos de 6px que sobem em sequência (1s, defasagem 0,15s), sem pílula de fundo. Mesmo alinhamento de uma mensagem do monitor, para que a resposta entre no mesmo lugar.
- Desempenho: o histórico estático é desenhado uma vez por um único renderizador e reutilizado como imagem; só a última mensagem e o carregando usam WebGL ao vivo.
- Sequência padrão de cada resposta:
  1. **Carregando:** o anel, inclinado 29°, orbita o corpo da direita para a esquerda (uma volta a cada 1,5 s); os olhos acompanham de leve.
  2. **Mensagem chegou: pulo.** Um pulo só, suave (1,3 s, 10% da altura), com leve achatamento na saída e na chegada. O anel continua a órbita do carregando, cada vez mais curta e lenta, e assenta centralizado **abaixo dos olhos**.
  3. **Parado (última mensagem):** anel de frente contornando o corpo; respira (96,5% a 100% em 2,6 s) com brilho amarelo, pisca a cada 2,4 a 5,5 s (às vezes duas vezes) e o olhar vagueia ±3°.
  4. **Histórico (estático):** quando chega outra mensagem ou o aluno continua a trilha, o personagem anterior fica na pose do parado sem nenhum movimento (não respira, não pisca, não gira) e vira imagem fixa.
- Só um personagem se move por vez: o da última mensagem do monitor.
- Trocas de estado suaves (0,3 a 0,65 s). Com movimento reduzido, fica parado de frente e sem piscar.
- Página de definição: botão Pausar/Ver sequência; pausado, cada estado pode ser visto isolado. Tweaks: fundo, velocidade e giro do planeta.

**1.1.10 Ajustes finais da Gestão v1.1** (16/10/2026)

- Orientações (nova trilha e Configuração): subtítulo "Os conteúdos são gerados por padrão pela sequência abaixo. Você pode enviar orientações específicas." seguido da sequência visual Contextualização > Introdução > Exemplos > Desenvolvimento > Conclusão.
- Trilha criada e **ativa**: na Configuração, Objetivo, Estrutura e Orientações ficam **bloqueados**, com a etiqueta "Somente visualização" à direita do título. Cadastro continua editável pelo lápis.
- Adicionar atividades com IA: "Gerar prévia" abre a **página Prévia** dentro da aba (não é janela), com subtítulo "Revise os conteúdos para adicionar atividades. Você pode revisar ou excluir as atividades depois.", Cancelar e "Adicionar atividades" no topo à direita. Uma atividade por linha (número na sequência da última atividade + título); a primeira começa aberta; abrir outra mantém as abertas; aberta mostra cada etapa com o conteúdo gerado (Conteúdo / Exercício X de Y). Ao adicionar, volta para o Conteúdo com as atividades no topo e o bloco de IA recolhido. Tag IA à direita, ao lado da seta.

## Orientações para o backend (Cursor), v1.1

19. **Padrão de senha (toda a aplicação):** senha sempre mascarada (••••••••) com botão de olho para mostrar; depois, botão editar (libera digitação), copiar para a área de transferência e o botão **Gerar** (gera nova senha). Em edição, o botão vira **Salvar**. Estados possíveis: com senha ou "Sem senha" (não existe "legado"). Vale em Senhas, Permissões > Usuários e Usuários (Crias e Instituições).
20. **Menu Sistema** (Prompts, API e documentação) aparece só para Super admin.

15. **Usuários (Super admin):** página Usuários (botão ao lado de "+ Nova instituição"), abas **Crias** (usuários do Crias, inclusive Super admins) e **Instituições** (usuários de cada escola, com coluna Instituição). Mesma tabela de Permissões > Usuários: nome, e-mail, telefone, perfil, senha (copiar e gerar nova senha), excluir com DELETAR. Escola nunca tem Super admin.
16. **Permissões:** perfis Admin e Básico (menu por perfil) editáveis só pelo Super admin; a escola vê sem editar. Tabela Usuários editável pelo Super admin e pela escola.
17. **Senhas:** "Alterar senhas em massa" (Exportar CSV, Carregar arquivo CSV, Alterar senhas só após carregar, confirmação "Tem certeza que deseja alterar senhas em massa?"). "Alunos da escola": filtros por nome e código, seleção "Sem senha", Gerar senhas para alunos sem senha, copiar senha, gerar nova senha por aluno, nome abre o cadastro do aluno.
18. **Aluno (conversa):** ao tocar em Continuar aparecem só os três pontos; o personagem do monitor carregando aparece só quando o aluno envia mensagem ao monitor.

0. **Gerar por IA: nova trilha × trilha existente.** Nova trilha: prompt fixo + Configuração de geração completa (cadastro, objetivo, estrutura, nº de atividades, múltipla escolha, habilidades, orientações, arquivos); resultado vira rascunho com Prévia (passo 2) e só é gravado em "Salvar trilha". Trilha existente (Conteúdo > Adicionar atividades com IA): prompt fixo + dados já salvos da trilha (cadastro, objetivo, estrutura) + nº de atividades (padrão = nº configurado da trilha), habilidades, orientações, arquivos; mostra a página Prévia (sem o bloco Configuração de geração) e grava em "Adicionar atividades", acrescentando no topo com numeração seguinte. O número pedido é exatamente o número gerado.
12. **Permissões:** perfis Super admin (tudo), Master (padrão: Início, Dados, Trilhas, Alunos, Senhas, Permissões) e Básico (padrão: Início, Dados, Trilhas); itens de menu por perfil editáveis. Gestores: nome, e-mail, telefone, perfil; novo usuário entra no topo e só grava em Salvar (nome e e-mail válidos); excluir com DELETAR.
13. **Senhas:** usa a instituição do filtro global (sem seletor próprio). "Exportar base de alunos" (CSV) e "Gerar senhas para alunos sem senha".
14. **Prompts:** seletor "Agente"; versões anteriores abrem o texto pela seta e podem voltar ao editor.

Lógicas novas definidas no protótipo que exigem backend. Interface pronta no protótipo; persistência e regras abaixo.

1. **Geração por IA (nova trilha).** Prompt "Criar trilha com IA" é do sistema: não editável e invisível para a escola (só Super admin vê, em leitura). Na geração: `prompt_fixo + configuracao_de_geracao`, onde a configuração traz nome, matéria, descrição, objetivo, estrutura (conteúdos, exercícios, ordem), número de atividades, alternativas por exercício, habilidades, orientações e o texto dos arquivos anexados. Campo vazio = "N/A". Se habilidades, orientações e arquivos estiverem vazios, não chama a IA: cria a trilha com 1 atividade em branco.
2. **Prévia antes de salvar.** A trilha gerada fica em rascunho (não aparece em Trilhas) até "Salvar trilha". Cancelar descarta.
3. **Adicionar atividades com IA (trilha existente).** Mesmo prompt fixo + dados da trilha (cadastro, objetivo, estrutura) + número de atividades, habilidades, orientações e arquivos. Numeração continua após a última atividade. Nada é gravado antes de "Adicionar atividades".
4. **Importar planilha de atividades sempre ADICIONA** (append, nunca substitui ou apaga). Novas atividades recebem os próximos números.
5. **Exercícios:** título automático "Exercício X de Y" pela posição na atividade; gabarito A.. conforme alternativas da trilha (padrão 4, 2 a 6). Feedback imediato fixo.
6. **Configuração bloqueada** quando a trilha está ativa (objetivo, estrutura, orientações). Validar também na API.
7. **Alunos da instituição:** cadastro manual ou planilha (nome, celular, senha opcional, trilha opcional) sempre grava na base. Remoção por planilha (nome, celular, remover sim/não) exige confirmação DELETAR e retorna a contagem de removidos; remover tira o acesso e mantém histórico.
8. **Alunos da trilha:** vínculo ativo/inativo por aluno; gravação em lote no Salvar. Planilha em massa: inativos primeiro, depois ativos (nome, código, telefone, ativo sim/não); importação com confirmação.
9. **Exportações:** Dados > Exercícios exporta a tabela completa como está (filtro de trilhas aplicado, sem paginação, todas as colunas, ordem atual). Código do aluno exibido só com o número (al-001 → 1); ordenação numérica.
10. **Ordenação de tabelas:** por coluna (asc/desc), padrão alfabética; vazios e N/A sempre no fim.
11. **Exclusões** (trilha, atividade, alunos em massa) só com a palavra DELETAR.

**1.1.9 Consolidação das regras da Gestão v1.1** (16/10/2026)

Vale sobre 1.1.3 a 1.1.8 onde houver diferença.

*Trilha (abas Configuração, Conteúdo, Alunos, Gabarito)*
- A aba antes chamada Estrutura chama-se **Configuração** em toda a aplicação.
- Botão do topo da trilha (fim da linha do título): **Salvar**, ativo só com alteração e pulsando enquanto houver alteração; vale para Configuração, Alunos e Gabarito. Na criação vira **Gerar prévia** e, na prévia, **Salvar trilha**.
- Edição por ícone de lápis ao lado do título do bloco (Cadastro, Objetivo, Conteúdo das etapas, cadastro do aluno, instituição): ao clicar, aparecem só Cancelar e Salvar; Salvar ativa só com alteração. Ativo/inativo é sempre chave (switch).
- Excluir (trilha, atividade) pede digitar DELETAR.
- Conteúdo: lista de atividades à esquerda (metade da página; número em etiqueta + título, uma linha; Liberada verde / Bloqueada amarela, clicável; selecionada só com contorno verde). "+ Nova atividade" cria a próxima atividade numerada, no topo da lista, com conteúdo em branco. À direita, "Conteúdo das etapas": uma etapa por linha, tipos só Conteúdo ou Exercício. Exercício tem título automático "Exercício X de Y" (posição na atividade, conforme a Configuração) e gabarito A, B… até o número de alternativas da Múltipla escolha.
- Etapas seguem a Configuração: conteúdos primeiro, exercícios por último (padrão); Baixa 3+1, Média 5+2, Alta 8+3; alterar números passa para Personalizado (ordem só por arrastar). Múltipla escolha padrão 4 alternativas (2 a 6); Feedback imediato é informativo.

*Criação de trilha (fluxo único, sempre por IA)*
- "+ Nova trilha" abre a página da trilha vazia, subtítulo "Crie em poucos passos", com passos em sequência (um aberto por vez, setas para cima e para baixo): **1 Cadastro** (Matéria e Descrição opcionais), **2 Objetivo** (Reforço padrão; "Outro objetivo" com contorno verde escuro #00593d), **3 Estrutura** (Profundidade, blocos verdes e amarelos, Número de atividades 1 a 60, Múltipla escolha), **4 Habilidades, 5 Orientações, 6 Arquivos** (os três com tag IA, texto branco).
- Gerar prévia ativa com nome e objetivo preenchidos. Se Habilidades, Orientações ou Arquivos tiverem algo, a prévia é **gerada por IA** com o número de atividades e a estrutura definidos. Se os três estiverem vazios, a prévia começa **em branco com só a Atividade 1**.
- Gerar prévia abre a aba Conteúdo com o nome **Prévia** e, no topo, o bloco "Configuração de geração" com todas as respostas. A trilha só entra na lista de Trilhas depois de Salvar trilha.
- **Lógica do prompt:** o prompt "Criar trilha com IA" do Super admin é **fixo do sistema: não editável e invisível para a escola**. Ao gerar a prévia, o sistema envia **prompt fixo + Configuração de geração** (respostas do usuário): [nome], [materia], [descricao], [objetivo], [conteudos], [exercicios], [ordem], [atividades], [alternativas], [habilidades], [orientacoes], [arquivos] (conteúdo dos arquivos anexados). Campo vazio vai como N/A. Nada do que o usuário preencheu pode ficar fora do envio.

*Importação e exportação (banco)*
- Conteúdo da trilha (e Prévia): **Adicionar atividades com inteligência artificial** (recolhível): número de atividades, Habilidades, Orientações (opcional), Arquivos (opcional). "Gerar prévia" abre uma janela grande "Prévia" com as atividades geradas e o botão "Adicionar atividades". A geração usa o prompt fixo do sistema + dados da trilha existente (cadastro, objetivo, Configuração/estrutura) + o que foi preenchido aqui. **Adicionar atividades em lote**: Baixar planilha modelo, Carregar planilha, Adicionar atividades (só após carregar). Nos dois casos as atividades entram **no topo das existentes** (numeração continua).
- Alunos em massa: Remover pede DELETAR ("Tem certeza que deseja remover os alunos selecionados?"); depois mostra em vermelho "N alunos removidos para esta instituição.". Adicionar mostra "N alunos adicionados para esta instituição.".
- Nova trilha: passos com tags (Objetivo "recomendado", Estrutura "padrão", Habilidades/Orientações/Arquivos "opcional" + tag IA verde escuro ao lado das setas). Cadastro começa aberto; abrir o próximo mantém os anteriores abertos; um passo só fecha pela seta para cima.
- Importar planilha de conteúdo **sempre ADICIONA** atividades; nunca substitui nem apaga.
- Alunos cadastrados pela instituição (manual ou CSV) entram **sempre na base** de alunos.
- Alunos da trilha (Adicionar ou remover): chaves Ativo/Inativo; Adicionar lista quem não está ativado (todos começam inativos), Remover lista quem está ativado (todos começam ativos); o aluno não muda de lugar ao alternar; cada aba guarda a seleção; Salvar aplica tudo e as listas se atualizam. Em massa: "Baixar base de alunos ativos e inativos" (inativos primeiro; nome, código, telefone, ativo sim / não) e "Importar em massa" com confirmação "Tem certeza que deseja alterar os alunos da trilha em lote?".
- Instituição > Remover alunos: mesmo modelo em massa, com confirmação para a instituição. Inativar tira o acesso, mantém histórico e o aluno na base.
- Dados > Exercícios > Exportar histórico: CSV com a tabela completa (todas as linhas do Filtrar trilhas, todas as colunas, ordem atual).
- Código do aluno: só o número (al-001 → 1).

*Padrões de interface*
- **Posição inicial:** a primeira informação abaixo do subtítulo de qualquer página começa em **203px** (web), alinhada à linha de base do item selecionado no menu (referência: Trilhas selecionado). Vale para conteúdo e para linhas fixas no cabeçalho (filtros, abas).
- **Esmaecimento do cabeçalho fixo:** abaixo da última parte fixa há 18px de respiro em cor sólida e depois 36px de esmaecimento; o conteúdo começa abaixo disso.
- Instituição e página Alunos: blocos "Cadastrar alunos" (Colunas: Nome, celular, senha (opcional), trilha (opcional); Baixar planilha modelo, Escolher planilha, Adicionar em massa) e "Remover alunos" (Colunas: Nome, celular, remover (sim / não); Baixar planilha base com alunos, Remover em massa, com confirmação). Em Alunos ficam no topo, antes do filtro por nome.
- Botões em pílula 36px, texto 13px; filtros e campos 40px. Filtros ocupam metade da largura (exceções: Filtrar alunos em Alunos, na trilha e em Dados, de ponta a ponta).
- Ordenação por setinhas no cabeçalho de cada coluna; padrão ordem alfabética.
- Todo conteúdo começa 36px abaixo do subtítulo (1.1.4); linhas fixas no cabeçalho também.
- Filtrar instituições (Super admin) ou nome da escola (Instituição) ficam no topo à direita, na linha do Voltar.

**1.1.8 Criação de trilha (fluxo único)** (16/10/2026)

- Passos: **1 Cadastro, 2 Objetivo, 3 Estrutura, 4 Habilidades (tag IA), 5 Arquivos (opcional), 6 Orientações (opcional)**. Dentro de cada passo não se repete o título; só as setas para cima e para baixo. Tudo editável direto, sem Salvar por passo. Matéria e Descrição são opcionais.
- Habilidades: texto com as habilidades ou conteúdos. Só com Habilidades preenchidas Arquivos e Orientações abrem. "Começar em branco" bloqueia Habilidades, Arquivos e Orientações.
- O botão do topo (no lugar de Salvar) vira **Gerar prévia** e ativa quando o obrigatório está preenchido: nome, objetivo e (Habilidades ou Começar em branco). Gerar prévia abre a aba Conteúdo, renomeada **Prévia**: com IA, já preenchida; em branco, atividades "Nova atividade" vazias. Na prévia o botão vira **Salvar trilha**; só então a trilha aparece na lista de Trilhas.
- O prompt Criar trilha com IA recebe também [habilidades].
- Campo "Outro objetivo" tem sempre o contorno verde de destaque.

- "+ Nova trilha" abre direto a página da trilha (Estrutura), vazia, com passos em sequência na rolagem: **1 Cadastro, 2 Objetivo, 3 Estrutura, 4 Arquivos, 5 Orientações**. Só um passo aberto por vez (começa no 1); cada passo tem setas para cima e para baixo; clicar no título abre o passo.
- Estrutura (antes Profundidade): número de atividades (setas ou digitado, 1 a 60) e a chave **Começar em branco**. Em branco, Arquivos e Orientações ficam bloqueados e o botão "Gerar prévia" aparece já na Estrutura; senão, aparece depois de Orientações.
- **Sempre gerado por IA.** "Gerar prévia" chama o prompt **Criar trilha com IA** (Configurações > Prompts) e preenche obrigatoriamente todas as variáveis com o que o usuário informou: [nome], [materia], [descricao], [objetivo], [atividades], [conteudos], [exercicios], [ordem], [alternativas], [arquivos], [orientacoes]. Campo vazio vai como N/A. Em branco, a IA cria só a estrutura das atividades, sem conteúdo.
- A prévia mostra o resumo das informações enviadas e as atividades; "Salvar trilha" cria a trilha e abre Conteúdo.
- O título do bloco de cadastro é sempre "Cadastro", em toda a aplicação.

**1.1.7 Nova trilha e alunos da instituição** (16/10/2026)

- **Definir passo a passo** abre a mesma página de uma trilha aberta (Estrutura, Conteúdo, Alunos, Gabarito), vazia: cadastro já em edição, objetivo Reforço e profundidade Média. Em Alunos, "Adicionar alunos" lista todos os alunos da instituição e "Remover alunos" fica vazio até alguém ser ativado.
- **Instituição > Remover alunos:** mesmo modelo do em massa da trilha, aplicado à instituição. "Baixar base de alunos ativos e inativos" (inativos primeiro, depois ativos; nome, código, telefone, ativo sim / não) e "Importar em massa", com a confirmação "Tem certeza que deseja alterar os alunos da instituição em lote?". Inativar na instituição tira o aluno do acesso, mas mantém o histórico; o aluno continua na base.

**1.1.6 Regras de importação e cadastro** (16/10/2026)

- Alunos adicionados a uma instituição pelo menu Instituições (cadastro ou CSV) são **sempre adicionados à base** de alunos.
- **Regra importantíssima:** importar planilha de conteúdo **sempre ADICIONA atividades** à trilha. Nunca substitui nem apaga as existentes.
- Alunos da trilha: "Adicionar ou remover" usa chaves Ativo/Inativo por aluno; o aluno não muda de lugar ao alternar; cada aba guarda sua seleção; o Salvar do título aplica tudo de uma vez. Planilha em massa: inativos primeiro, depois ativos, com nome, código, telefone, ativo (sim / não); importar pede confirmação.

**1.1.5 Código do aluno** (15/10/2026)

- Na página Alunos, o filtro único vira dois: "Filtrar por nome" e "Filtrar por código", lado a lado.
- Na tabela, o código ganha coluna própria, logo depois de Nome, ordenável.
- **Regra:** o código mostra só o número, sem prefixo nem zeros à esquerda (banco `al-001` → interface `1`). A ordenação usa o valor numérico.

**1.1.4 Posição inicial do conteúdo (Gestão)** (15/10/2026)

- Referência: Início no perfil Instituição, onde o botão Dados começa abaixo do subtítulo.
- Em toda página, o primeiro conteúdo abaixo do cabeçalho começa nessa mesma altura: 36px abaixo do subtítulo. Na web, o cabeçalho tem altura mínima de 194,7px (`--hd-min`), contando o respiro de 36px do esmaecimento, então páginas sem subtítulo começam no mesmo ponto.
- Páginas com uma linha fixa no cabeçalho (filtros de Trilhas e Dados, abas da trilha) começam essa linha na mesma posição, 36px abaixo do subtítulo. O que fica fixo e o esmaecimento abaixo dela não mudam.

**1.1.3 Dados: exportar histórico de exercícios** (15/10/2026)

- Na aba Exercícios de Dados, acima da tabela: à esquerda o texto "Clique no exercício para abrir o enunciado" (na posição do "Filtrar alunos" da aba Alunos); à direita o botão principal "Exportar histórico".
- Clicar no título do exercício abre, abaixo da linha, o enunciado com as alternativas, a contagem de respostas de cada uma e o gabarito. A seta ao lado do título gira ao abrir.
- **Regra de exportação:** "Exportar histórico" baixa um CSV com a tabela completa, exatamente como está na tela: todas as linhas que passam pelo "Filtrar trilhas" do topo (sem paginação) e todas as colunas (Trilha, Atividade, Título, % de acerto, Respostas, Acertos, Erros, Gabarito), na ordem de classificação atual. Uma linha por exercício.

## Base v1.1 inicial (travada em 15/10/2026)

A v1.1 (`Crias Aluno v1.1.dc.html` e `Crias Gestao v1.1.dc.html`; no repositório `crias-redesign/prototipo/Crias Aluno.dc.html` e `Crias Gestao.dc.html`) parte da v1.0 e vale sobre ela onde houver diferença.

**1.1.1 Menu lateral sempre aberto na web**

- No computador o menu começa aberto e continua aberto ao abrir trilha, atividade, conversa com o monitor ou voltar ao início. O aluno ainda pode recolher pelo botão do topo. No celular nada muda (menu em tela cheia, fechado ao navegar).
- Código: ao navegar, `sidebarOpen = !isMobile` (antes mantinha o estado anterior).

**1.1.2 Largura única da coluna (web)**

- Uma só largura para tudo: **780px**, a mesma dos cards de trilha da home (2 ou 3 cards lado a lado). Vale para a barra de mensagem da home (antes 680px), a barra de mensagem da conversa e a coluna da conversa (antes 760px).
- O texto da conversa ocupa a largura inteira da barra (referência ChatGPT): a coluna não tem mais recuo interno (antes 6% de cada lado) e o símbolo/avatar de 32px fica pendurado à esquerda, fora da coluna (margem de -46px). Assim o texto do monitor, o cartão de exercício e o balão do aluno alinham com as bordas da barra.
- Para o avatar caber, o recuo lateral da conversa e da barra é `gutter + 46px` na web. No celular nada muda (avatar já fica na linha do rótulo).
- Variáveis: `--r-av: 46px` (celular 0), `--r-ex-ml: 0`, `--r-thread-px: 0`.

**1.1.3 Alternativas do exercício (web e celular)**

- Sempre uma alternativa por linha, em toda a aplicação. Nunca em colunas.
- A letra (caixa de 30px) fica fixa no topo, à esquerda (`align-items: flex-start`). O texto começa ao lado com 12px de espaço; a linha tem 22px de altura e 4px de respiro no topo, para a primeira linha ficar centrada na letra. Da segunda linha em diante o texto segue com o mesmo recuo da primeira.

**1.1.4 Topo e menu acompanham a rolagem**

- A conversa da trilha é contínua (todas as atividades em sequência, ver 1.0.8). Ao rolar, o topo ("Atividade X de Y · Etapa N de M" e os pontos de etapa) e a atividade marcada no menu mudam para a atividade e a etapa que estão na tela. Subindo, assim que passa para a etapa anterior, o número muda; ao passar para a atividade anterior, muda a atividade. Descendo, o mesmo.
- Referência: a mensagem que cruza a linha de 35% da altura da conversa (no máximo 220px do topo). No fim da rolagem vale a última mensagem.
- Cada mensagem leva `data-a` (atividade) e `data-s` (etapa); mensagens do aluno e do monitor herdam a etapa da mensagem anterior.
- Clicar numa atividade no menu rola a conversa até o início dela (não troca mais de tela). A faixa "Você está revendo a Atividade X" sai.

**1.1.5 Carregamento inicial**

- Ao abrir a página (entrada, app do aluno ou painel), o mesmo símbolo da home do aluno (arquivo, 64px, com o brilho e o movimento da home, `vDoneSym` e `vDoneGlow`) aparece centralizado, sobre o fundo sólido. Some em 0,4s quando a página está pronta. Com movimento reduzido, fica parado.

**1.1.6 Painel com a identidade do aluno**

- Mesmos tokens do aluno (`--v-*`), tema claro ao abrir e escuro (#000) pelo botão do menu. Todas as cores fixas do painel viraram variáveis, então o escuro vale em todas as páginas.
- Menu lateral igual ao do aluno: 280px, retângulo bege com cantos arredondados e borda esfumada, wordmark em arquivo (fica branco no escuro) com a etiqueta "Painel" (na Gestão, logo único: ver 1.1.25), botão de recolher no topo. Grupos ("Gestão acadêmica", "Conteúdo e avaliações", "Administração") com rótulo em caixa alta, 11px, verde `--v-lab` e linha fina; itens 14px, 700, raio 14px; item ativo em cartão (fundo `--v-raise`, borda fina e sombra), como no aluno. Sai o amarelo do item ativo.
- Rodapé igual ao do aluno: linha de 38px com avatar verde-escuro, e-mail (13px, 700, esmaece), seta de perfil, botão de tema (lua/sol) e ícone de sair (21px). Saem "Ajuda" e "Modo escuro" em texto.
- Fundo: malha 3D no Início do painel e névoa a 70% nas demais páginas, com as transições de topo (60px) e base (80px).
- Menu aberto por padrão na web; no celular, tela cheia.

**1.1.7 Seletor Aluno / Painel**

- Quem não é só aluno (professor, coordenação, administração) vê, acima da linha do perfil, um seletor em pílula igual ao antigo Claro/Escuro: "Aluno" e "Painel". O lado marcado é a área atual; o outro leva à outra área. Quem é só aluno não vê o seletor. Vale no app do aluno e no painel.
- Estilo: fundo `--v-soft2`, borda fina, 3px de respiro, pílulas de 30px, 13px peso 700; marcado em `--v-raise` com sombra leve. Alinhado ao avatar (12px à esquerda).
- Protótipo: tweak `acessoPainel`.

**1.1.8 Painel do aluno (individual)**

- O item "Painel" do menu do aluno abre uma página própria, só com os dados do aluno logado (nunca de outros alunos). O painel de administração é outra coisa.
- Formato de conversa: o monitor apresenta os dados em mensagens, de cima para baixo, cada uma com um cartão simples. A barra "Pergunte ao monitor sobre o seu desempenho…" fica embaixo, e o aluno pode perguntar sobre os próprios dados; a resposta entra na mesma conversa.
- Cabeçalho: avatar, nome e telefone, com só o ícone de lápis. Ao clicar, nome e telefone viram campos na mesma linha, com "Salvar alterações" e "Cancelar". Telefone vazio: "N/A".
- Filtro em pílulas: "Todas as trilhas" (agregado) ou uma trilha. Tudo abaixo segue o filtro.
- Mensagens, na ordem:
  1. Progresso: atividades liberadas, atividades feitas, % de conclusão e barra em degradê. No agregado, uma linha por trilha ("2 de 5 atividades"); numa trilha, a lista de atividades com Feita, Em andamento, Liberada ou Bloqueada.
  2. Desempenho: acertos, erros, % de acerto e barra verde/vermelha com legenda. No agregado, por trilha; numa trilha, por atividade.
  3. Principais erros: os últimos exercícios errados (trilha · atividade · etapa, enunciado, sua resposta e resposta certa).
  4. Uso do monitor: perguntas feitas, dias com conversa e última conversa. No agregado, perguntas por trilha e em Monitoria (fora das trilhas).
  5. Principais dúvidas: perguntas ao monitor agrupadas por trilha (no filtro por trilha, por atividade), com o número de perguntas e a última pergunta num balão bege. Não há agrupamento por assunto.
- Origem dos dados (mesmos campos de Dados do painel, filtrados pelo aluno): atividades liberadas, atividades feitas, % de conclusão, acertos, erros e % de acerto; respostas aos exercícios (resposta e gabarito); histórico da conversa com o monitor (mensagens do aluno, data e atividade). Dúvidas são agrupadas por trilha.
- Largura 780px e símbolo do monitor (círculo amarelo "M") pendurado à esquerda, como na conversa (1.1.2).
- Cabeçalho (nome, telefone e filtro de trilha) fixo no topo; só as mensagens rolam. A rolagem é a da conversa: mesmo respiro de 36px até a barra, esmaecimento na base e setas "ir para o topo" e "ir para o fim".

**1.1.10 Esmaecimento do menu lateral**

- A lista do menu (aluno e painel) esmaece na base quando há mais itens abaixo (44px) e no topo quando já rolou (28px), no mesmo padrão da conversa. Começa ativo se houver conteúdo além da área. Espaço livre de 44px abaixo do último item. Acima do primeiro: ver 1.1.23.

**1.1.11 Nomes: Crias Aluno e Crias Gestão**

- O produto de administração passa a se chamar **Crias Gestão** (antes Crias Painel). Arquivo: `Crias Gestao v1.1.dc.html` (no repositório `Crias Gestao.dc.html`).
- Seletor do menu (só para quem tem acesso à gestão): no Crias Aluno mostra "Aluno | Gestão"; no Crias Gestão mostra "Gestão | Aluno" (a área atual vem primeiro e fica marcada). Quem é só aluno não vê.
- "Painel" passa a ser só a página individual de dados dentro do Crias Aluno (1.1.8).
- Cabeçalho do menu da Gestão: o wordmark em arquivo, uma barra vertical em verde #00be85 (2px, 22px de altura) e "Gestão" (Manrope 14px, 600, `--v-t2`), no mesmo desenho da assinatura "Crias | Tecnologia educacional". Sai a etiqueta verde "Painel".

**1.1.12 Gestão: reorganização**

- Dois perfis: **Super admin** (vê todas as instituições) e **Instituição** (vê só a sua). No protótipo, tweak `perfil`. No perfil Instituição somem o botão "Nova instituição" e os seletores de instituição (Dados e Administração já abrem na instituição do usuário); o Início mostra o nome dela como título e "Resumo da sua instituição."
- Início (super admin): título "Instituições", subtítulo "Resumo das instituições cadastradas.", botão "+ Nova instituição" alinhado à direita da página. Cada card tem dois botões: "Administração" (secundário) e "Dados" (principal). Sai "Editar".
- Administração (antes "Visão por instituição"): no topo, o cartão "Cadastro" com Nome, Tipo, Ativa e Salvar na mesma área, e ID, criada e atualizada em texto pequeno ao lado do título. Abaixo, Trilhas e Alunos da instituição. Sai a página separada de edição.
- Menu lateral: Início, Dados, Trilhas, Alunos; depois o grupo "CONFIGURAÇÕES" (ver 1.1.15). A Administração não está no menu: abre pelos botões do Início (cartão da instituição no Super admin, botão "Administração" no Admin) e destaca "Início" no menu. Saem do menu Alunos (está dentro de Administração) e Gabaritos.
- Gabarito: virou a aba "Gabarito" dentro da trilha (Estrutura, Conteúdo, Alunos, Gabarito), já filtrado pela trilha aberta, com "Só faltando", "Só anulados" e "Salvar tudo".
- Voltar: um único botão "Voltar" no topo de toda página que não seja a primeira, sempre para a tela anterior (histórico, como no navegador), incluindo navegação pelo menu. Saem os botões com destino fixo ("← Visão por instituição", "← Alunos", "← Trilha", "← Outra forma de criar"). "Cancelar" nos formulários também volta para a tela anterior. No assistente de IA, o passo anterior se chama "Anterior".

**1.1.13 Gestão: destaques, seletores e base**

- Destaques só com dados que já existem, em barras finas (3 a 4px, trilho `--v-soft2`/`--v-line`):
  - Início, card da instituição, "Uso dos alunos": barra acima de cada número, proporcional ao total de alunos da instituição (Em andamento e Ativos em degradê amarelo para verde, Concluíram em verde, Não iniciaram em cinza).
  - Dados: "Conclusão média" com barra em degradê e "Acerto médio" com barra verde, abaixo do número. Contagens (alunos, trilhas) ficam sem barra.
  - Dados, tabela Alunos: "% de conclusão" e "% de acerto" no mesmo padrão: número em negrito e barra fina em degradê amarelo para verde. Sem dado: "N/A".
  - Dados, "Exercícios com menor/maior acerto": barra por exercício na cor da etiqueta (verde a partir de 70%, amarelo de 50 a 69%, vermelho abaixo de 50%). Nome esmaece no fim.
- Seletores (todos os `select`): seta própria (chevron 16px, `#5b6b60`) a 14px da borda direita, texto com 42px de respiro à direita, sem a seta nativa do navegador.
- Base da área de conteúdo: esmaecimento de 56px na cor do fundo, acima do conteúdo, começando na altura do topo do avatar do rodapé do menu. O conteúdo tem 72px de respiro no fim para não ficar sob o esmaecimento.

**1.1.14 Gestão: Senhas dos alunos, Prompts e Master** (novidades do sócio, 14/10/2026; repositório crias-web, docs/entrega-claude-design-gestao)

- Acesso Master: só quem tem "Master (senhas dos alunos)" marcado no login (novo checkbox em Permissões, abaixo de "Super admin") vê os itens "Senhas" e "Prompts". Sem Master, a rota mostra só o aviso de acesso restrito. No protótipo, tweak `master`.
- Menu: ver 1.1.15.
- Senhas dos alunos (PA16): seletor "Escola"; à direita "Exportar CSV" (secundário) e "Gerar senhas para alunos sem senha" (principal), desativados até escolher a escola. Depois da geração, aviso verde com outro "Exportar CSV". Tabela Nome, Celular, Senha, Ações: senha em código (monoespaçada, fundo bege), "Legado, gere nova senha" ou "Sem senha" em cinza; ação "Gerar nova senha" (vira "Gerando…"). Celular vazio: "N/A". Contagem "N alunos · M sem senha" no título. Paginação de 50: "1 a 50 de N", Anterior, números (atual em pílula verde clara, reticências quando há muitas páginas), Próxima.
- Importar CSV: colunas em etiquetas (trilha e senha marcadas como opcional), botão "Escolher arquivo CSV" com o nome do arquivo ao lado, campo "Ou cole o CSV", "Importar alunos" (vira "Importando…"), resultado "Importação concluída: X criados, Y atualizados, Z erros, W senhas geradas.", tabela de erros (Linha, Nome, Celular, Erro em vermelho) e "Baixar senhas geradas (CSV)" quando houve senha gerada.
- Janela de confirmação no padrão do app (substitui window.confirm): fundo escurecido, cartão de 420px, título em Outfit 19px, texto, "Cancelar" e ação principal verde. Usada em gerar senhas em lote e gerar nova senha.
- Prompts (PA17): seletor "Prompt" (título · versão), descrição e "Última edição: e-mail · data" ao lado; campo "Texto" (monoespaçado); "Nota da versão (opcional)" e "Salvar" (desativado sem mudança); lista "Versões anteriores" com etiqueta da versão, nota, autor e data e "Restaurar no editor". Os botões técnicos Seed, Seed forçado e Recarregar ficaram fora do desenho. Nome "Gerador de bloco da trilha" virou "Gerador de etapas da trilha" (vocabulário).

**1.1.15 Gestão: grupo Configurações** (14/10/2026)

- O grupo do menu que se chamava "Administração" passa a se chamar **Configurações**.
- Dentro dele, dois subtítulos (12px, 700, `--v-t3`, sem caixa alta):
  - **Usuários:** Senhas (só Master) e Permissões.
  - **Sistema:** Prompts (só Master) e API e documentação.
- A página "Usuários e permissões" passa a se chamar **Permissões** (título, menu e lista de itens que cada e-mail pode ver). Avisos que apontavam para ela dizem "Configurações, Permissões".
- "Senhas (Master)" vira **Senhas**; o acesso continua só para Master.
- O aviso "Selecione uma instituição em Visão por instituição" passa a dizer "em Administração".

**1.1.16 Protótipo: só o botão Atualizar** (14/10/2026)

- Sai o menu de opções do canto superior direito (telas do protótipo, páginas da Gestão e opções de fundo). Fica um único botão redondo de 36px, só com o ícone de recarregar e borda tracejada (dica ao passar o mouse: "Atualizar protótipo (só na versão de teste)"). Ele reinicia o protótipo e existe só na versão de teste; não vai para o app.
- Saem do código as opções de fundo Horizonte e Órbitas. O fundo é sempre a malha 3D (1.0.2).
- Sai a tela solta de Gabaritos (PA14) da Gestão. O gabarito fica só na aba "Gabarito" da trilha (1.1.12).

**1.1.17 Gestão: erro ao carregar** (14/10/2026)

- A faixa "Não foi possível carregar os dados. Tente atualizar a página." ganha, no fim, um botão de atualizar só com ícone: círculo de 32px na cor do texto de erro, ícone branco. Ao clicar, a tela volta ao estado de carregando e tenta de novo.

**1.1.18 Carregando e topo do fundo** (14/10/2026)

- Carregando, em qualquer página (Crias Aluno e Gestão): a tela inteira fica na cor do fundo com o símbolo do Crias animado ao centro (64px, o mesmo da abertura). Nada da página aparece até carregar (os esqueletos e textos "Carregando…" ficam por baixo e não aparecem).

**1.1.20 Seta da trilha e névoa no escuro** (14/10/2026)

- A seta de abrir trilha na home passa de amarelo #ffd500 para o verde #00be85, o mesmo da seta do menu.
- No tema escuro, a névoa verde da malha fica mais suave: `--v-aurA` de 26% para 18% e `--v-rimGlow` de 24% para 17%. No tema claro, o amarelo da névoa fica mais suave: `--v-aurB` de 10% para 2,2% e `--v-rimGlow2` de 20% para 4,5%; o verde também fica mais suave: `--v-aurA` de 14% para 9,5% e `--v-rimGlow` de 16% para 11%.

**1.1.21 Miolo verde mais estreito no celular** (14/10/2026)

- No celular (até 768px), a largura do miolo verde do fundo passa de 1700px para 1480px (cerca de 13% menor), nos dois temas. No computador não muda.

**1.1.22 Menu lateral em bege mais claro no claro** (14/10/2026)

- No tema claro, o fundo do menu lateral (`--v-side`) fica em bege mais claro que o anterior, **#fdfcf9** (antes #fcfbf6), no Crias Aluno e na Gestão. Campos, balões e destaques continuam em #fcfbf6. No escuro não muda.

**1.1.23 Menu lateral: linha lateral e seleção aberta** (14/10/2026)

Vale para Crias Aluno e Gestão, no computador (acima de 768px). No celular a seleção continua um cartão arredondado com sombra.

- Linha lateral: linha de 1px (`--v-line`) na borda direita do menu, contínua de cima a baixo. Não há `border-right` no menu. No Aluno ela é feita em quatro trechos que se encontram em y exato, todos com `right:0` (cabeçalho 60px; bloco fixo; lista; rodapé). Na Gestão é um único elemento no menu inteiro. Os trechos do Aluno ficam dentro da área que esmaece, para a linha esmaecer junto com o fundo da seleção (nunca uma linha única atrás da lista, que aparece na faixa transparente).
- Seleção aberta (item ativo: Painel, Monitoria, trilha, ou qualquer item da Gestão): o item perde a borda direita, tem cantos `14px 0 0 14px`, fundo `--v-bg` e fica 14px mais curto à direita (`margin-right:14px`, `z-index:2`). Um bloco de 25px com `--v-bg` (`left:100%`, `top:-1px`, `bottom:-1px`) cobre a linha lateral e abre o item para o conteúdo.
- Curvas de encaixe: dois SVG de 24×23,5 (raio 23,5), um acima e um abaixo do item, em `left:100%`. Preenchimento `--v-bg` e traço de 1px `--v-line`. O caminho de preenchimento vai até `H25` (cobre o pixel inteiro da linha lateral; com `V` só chegava ao meio e sobrava um traço). A curva de cima termina em tangente vertical sobre a linha lateral (x = borda do menu menos 0,5px) e a de baixo sai dela.
- Alinhamento vertical das curvas: onde o item tem borda própria (a trilha, `li` com `border:1px`) o SVG de cima usa `bottom:calc(100% + 0.5px)` e o de baixo `top:calc(100% + 0.5px)`, para o traço cair no centro da borda. Onde o item é um `div` sem borda com o botão dentro (Painel, Monitoria, itens da Gestão) usa `bottom:calc(100% - 0.5px)` e `top:calc(100% - 0.5px)`.
- Espaço para a curva de cima: a lista rola dentro de um contêiner que corta o que passa da borda. A curva de cima tem 23,5px, então o primeiro item precisa de pelo menos 24px acima dele dentro do contêiner. Aluno: 24px de respiro no topo da lista (abaixo do título "Trilhas"). Gestão: 28px no topo da lista (antes 12px, o que cortava a curva do "Início").
- Aluno, parte fixa: "Acompanhamento", Painel, Monitoria e o título "Trilhas" ficam fixos no topo do menu (`flex:none`, `z-index:3`). Só a lista de trilhas rola. Trilhas abertas não empurram esses itens para fora.
- Gestão: a lista do menu esconde a barra de rolagem (`scrollbar-width:none`). A barra empurrava a linha lateral e deixava um degrau.
- Linha do rodapé: no lugar de `border-top`, uma linha no mesmo padrão dos títulos "Acompanhamento" e "Trilhas": cor `--v-lab`, 1px com `scaleY(.5)`, 25% de opacidade, `left:20px` e `right:20px` (mesmo respiro dos dois lados). No Aluno sem o seletor Aluno/Gestão ela fica só acima da linha do nome; com o seletor, acima dele.

**1.1.24 Gestão: perfis Super admin e Admin, Início da escola, exclusão de trilha** (14/10/2026)

- Botão de perfil (só no protótipo): ao lado esquerdo do botão de atualizar, mesmo tamanho (36px redondo, borda tracejada). Mostra **S** (Super admin selecionado) ou **A** (Admin selecionado). Ao clicar, troca o perfil e permanece na mesma página (só volta ao Início se a página não existir no Admin, como Instituição e Nova instituição). Substitui, no uso, o tweak `perfil`. Não vai para o app.
- Início do Super admin: título "Instituições" e "+ Nova instituição". Logo abaixo, no topo, o botão **Filtrar instituições** (42px, com ícone de funil, contador "Todas" ou "X de Y" e seta). Ele abre um painel no estilo do filtro do Excel: campo "Pesquisar" (16px), "Selecionar tudo" (marca as instituições visíveis na pesquisa) e "Limpar tudo" (desmarca todas), e a lista de instituições **em ordem alfabética** com caixas de seleção. Apagar a pesquisa mostra todas de novo. Clicar fora fecha. Padrão: todas marcadas. Com seleção parcial, o contador e a faixa de totais (Instituições, Alunos ativos, Ativos (7 dias), Trilhas ativas, Em andamento) passam a considerar só as instituições marcadas, e só elas aparecem na lista abaixo, em ordem alfabética. Nenhuma marcada: "Nenhuma instituição selecionada.". Abaixo da faixa, **uma linha (cartão) por instituição**, todas no mesmo padrão: nome e tipo à esquerda e, no topo à direita da linha, os botões **Dados**, **Trilhas** e **Alunos** daquela instituição (32px, borda verde #00be85, texto 13px/700, seta ">"; abrem Dados, Trilhas e Alunos já filtrados por ela). Abaixo, o cabeçalho completo de Dados com as quatro caixas (Alunos ativos, Trilhas ativas, Conclusão média e Acerto médio, com barras nas duas últimas) calculadas para aquela instituição. Não há botões Dados, Trilhas e Alunos soltos acima da lista, nem campo de pesquisa fora do filtro. Sai o bloco "Uso dos alunos". Pelo menu, Trilhas e Alunos voltam a mostrar todas as instituições.
- Início do Admin (escola): título é o **nome da escola**; subtítulo "Resumo das informações da escola."; sem botões no cabeçalho. Abaixo, nesta ordem:
  1. Cartão "Cadastro" como na Administração, mas só **Nome** e **Tipo** editáveis. Sem "Ativa". ID, criada e atualizada em texto pequeno.
  2. Acima das caixas, à esquerda, o botão **Dados**, que é título e botão ao mesmo tempo. Depois, quatro caixas iguais às do cabeçalho de Dados: Alunos ativos, Trilhas ativas, Conclusão média e Acerto médio (barras nas duas últimas).
  3. Cartão de trilhas com as colunas da página Trilhas (Nome, Instituição, Matéria, Ativa, Criada em e botão Abrir). O botão **Trilhas** (abre a página Trilhas) fica fora do cartão, acima dele e alinhado à esquerda, no mesmo padrão do botão Dados. Sem "N resultados". Só no Início há esse botão; a página Trilhas segue com o cartão "Todas as trilhas". Rodapé e paginação: ver abaixo.
- Botões "Dados" e "Trilhas" do Início do Admin (botões fora dos cartões): 36px de altura, fundo transparente (não parecem selecionados), borda de 1,5px verde #00be85, texto 14px/700 na cor do texto e seta ">" verde #00be85 à direita. Hover com fundo `--v-gsoft`. Ficam à esquerda. A Administração não tem botão no Início.
- Botão "Salvar" do cartão Cadastro (Início do Admin e Administração): mesmo padrão do "Criar trilha" (32px de altura, padding 0 14px, 13px/700, pílula verde), alinhado à direita na linha do título "Cadastro". Na Administração, "Ativa" fica no corpo do cartão, sem o botão.
- Dados e Administração (os dois perfis): a instituição aparece só como **nome**, em caixa de 42px de altura, sem lista de seleção. A Administração não tem subtítulo. Sai também o seletor "Trilha" do topo. O Super admin escolhe a instituição pelo Início (botões "Administração" e "Dados" do cartão). Em Dados a caixa do nome tem a mesma altura (42px) das abas Alunos e Exercícios e se estende quando o nome é grande, com as abas acompanhando à direita. Admin vê sempre a própria instituição.
- Excluir trilha (todos os perfis e telas): sai o `confirm` do navegador. Janela no mesmo padrão da de sair da conta (20px de raio, fundo esmaecido com desfoque): título "Deseja mesmo excluir a trilha?", subtítulo "Essa ação não pode ser desfeita.", caixa em vermelho claro (`--v-errSoft`, texto `--v-err`) com "Escreva DELETAR para excluir." e o campo de digitação. O campo de digitação usa 14px/600, o mesmo tamanho do texto acima dele. Botões "Cancelar" e "Excluir" (vermelho `--v-err`, texto branco). "Excluir" fica desativado (40% de opacidade) até digitar DELETAR (sem diferenciar maiúsculas).
- Cadastro (Início do Admin e Administração): "Salvar" só fica ativo (40% de opacidade quando bloqueado) depois de alterar o Nome ou o Tipo; voltar ao valor original bloqueia de novo. Ao clicar abre a janela no padrão de sair/excluir: título "Deseja mesmo alterar o cadastro?", botões "Cancelar" (secundário) e "Alterar" (verde). Ao confirmar, grava e mostra "Alterações salvas.".
- Paginação (Início do Admin e página Trilhas): padrão **5 por página**, seletor "5 / 10 / 30 / 50 por página" no rodapé, à esquerda de Anterior. Texto à esquerda do rodapé: "X trilhas de Y" (X = trilhas na página, Y = total; "1 trilha de 1" no singular). Anterior e Próxima só ficam ativos quando há mais de 10 trilhas (senão desativados, 45% de opacidade). A página volta à primeira ao mudar o tamanho (e, em Trilhas, a busca ou o filtro). Página Alunos: mesmo padrão, com rodapé "X alunos de Y", padrão **100 por página** e opções 100, 500 ou 1000. Anterior e Próxima só ficam ativos quando há mais páginas.
- Alunos (novo item do menu, abaixo de Trilhas): página "Alunos" com o cartão de alunos que existia na Administração (busca "Pesquisar aluno", contagem, colunas Nome, Trilha atual, Atividade, Etapa, Status, Telefone, Escolaridade, Nível pedagógico, Ativo, Criado em, Atualizado em e Abrir), só alunos, sem trilhas. Admin vê os da sua instituição; Super admin vê todos.
- Subtítulos: Dados, "Painel com informações de uso dos alunos."; Trilhas, "Gestão de trilhas de conteúdos e exercícios."; Alunos, "Cadastro de alunos da instituição.". No protótipo a instituição da escola tem 3 trilhas de exemplo (Matemática básica, Leitura e interpretação, Produção de texto).
- Posição do topo (todas as páginas da Gestão, computador): o botão "Voltar" fica fixo a 14px do topo da área de conteúdo, na mesma altura do botão de expandir o menu (centro a 30px), e acompanha a rolagem. O título (h1) de toda página fica sempre na mesma altura, com o centro alinhado ao centro do primeiro item do menu, "Início" (centro a ~106px; `padding-top` de 90px da área de conteúdo). No celular o `padding-top` é 64px.
- **Administração eliminada**: a página Administração, o botão "Administração" (Início do Super admin e do Admin) e o item de menu saem da interface. O cadastro da escola (Nome e Tipo) fica no topo do Início do Admin. O texto "Selecione uma instituição em Administração para criar a trilha." passa a "Selecione uma instituição para criar a trilha.".
- Logo "Crias | Gestão" no menu: o Crias é centralizado visualmente com a barra verde de 22px e o texto "Gestão" pela altura das letras "a" e "s", não pela caixa do arquivo. Com o logo em 20px, ajuste fino de `position:relative;top:-2.05px` (2,05px acima da caixa centrada). Ajustar em décimos de pixel se mudar o arquivo do logo.
- Sair da conta (Crias Aluno): título "Sair da conta?", subtítulo "Seu progresso fica salvo.".

**1.1.9 Vocabulário em toda a aplicação**

- trail = trilha, question = atividade, stage = etapa. Nunca "passo" (o painel trocou "Passo", "Ver passos", "Editar passos", "Novo passo", "Salvar passo" e "Passo atual" por "Etapa").
- Tutor = monitor (área "Monitoria"). Sai "parceiro de estudos" e "Maria" do painel ("Uso do monitor", coluna "Monitor", agentes "Monitor · trilha").
- Exercício é sempre "exercício" ("Responda o exercício", "Exercícios com menor acerto").

**1.1.25 Gestão: Início do Super admin, dados de exemplo, N/A e esmaecimento** (15/10/2026)

- Início do Super admin: "+ Nova instituição" fica na **mesma linha** do filtro "Filtrar instituições". O filtro ocupa toda a largura livre, alinhado à esquerda, e para com 16px de respiro antes do botão (botão alinhado à direita). Seta do filtro na ponta direita do campo; o conteúdo (ícone, texto, contagem) fica alinhado à esquerda. A lista aberta continua com 340px, ancorada à esquerda do filtro.
- Dados de exemplo: **toda instituição tem 3 trilhas** (Escola Estadual Exemplo: Matemática básica, Leitura e interpretação, Produção de texto; Colégio Exemplo: Ciências da natureza, História do Brasil, Geografia do Brasil) e todos os campos preenchidos (matéria, descrição, telefone, nível, situação). Cada aluno tem pelo menos uma trilha. Assim nenhuma tela de exemplo mostra "N/A" por falta de cadastro.
- **Ausência de dado = "N/A"** (substitui "N/A") em todo o Crias: campo vazio, telefone, matéria, descrição, % sem base de cálculo, trilha ou atividade sem vínculo, última atividade sem registro, indicador sem alunos. Sem exceção, no Aluno, na Gestão e nos documentos.
- **Esmaecimento em vez de corte**, regra geral para todo o Crias. Todo texto que não cabe numa linha (nome, título, e-mail, ID, nome de arquivo, etapa) esmaece no fim (máscara de 28px a 40px); nunca reticências (`text-overflow`) nem 2 linhas. O elemento leva `data-fade`, `white-space:nowrap`, `overflow:hidden`, `min-width:0` e `display:block`. A máscara só liga quando há estouro (medido na tela e a cada atualização).
- Esmaecimento de rolagem: toda área que rola recebe máscara de 28px na borda onde ainda há conteúdo, sumindo na borda já alcançada. Horizontal (`data-sfade="x"`): todas as tabelas da Gestão. Vertical (`data-sfade="y"`): lista do filtro de instituições. Menu lateral (`data-navfade`, 44px na base) e conversa do aluno já seguiam a regra. Toda nova área com rolagem deve usar um destes três.
- Títulos dinâmicos que esmaecem na Gestão: nome da instituição (cartão do Início e formulário), nome do aluno, nome da trilha (cabeçalho) e título das janelas de confirmação. Os cartões de dados (ID, datas) e a lista de etapas trocaram reticências por esmaecimento.
- Logo da Gestão: arquivo único `crias-logo-gestao.svg` (e `crias-logo-gestao-branco.svg` no escuro), 132×22 px, com wordmark, barra verde de 2px e "Gestão" em Manrope 400 já posicionados (deslocamento de 2,05px do wordmark incluído). Não montar mais com três peças. Também no design system (`assets/`).

**1.1.26 Trava da v1.1 e revisão geral** (15/10/2026)

A v1.1 está **travada** neste ponto (`Crias Aluno v1.1.dc.html` e `Crias Gestao v1.1.dc.html`). Nada muda nela sem pedido explícito; mudanças novas entram numa v1.1.

Revisão completa feita nos dois produtos antes da trava:

- Vocabulário: nenhuma ocorrência visível de "Passo", "Maria", "parceiro de estudos", "questão", "tutor", "bloco" ou "Crias Painel". Os nomes internos de código (`passos`, `maria`, `isPainel`) não aparecem na interface e ficam como estão. "Painel" aparece só como página de dados do aluno.
- Texto: sem travessão nem "–". "Não informado" substituído por "N/A" em tudo. Mensagens do menu sem ponto final.
- Tipografia: só Outfit (títulos) e Manrope (texto); monoespaçada apenas em código na página API e documentação.
- Cor: nenhum texto em verde #00be85 ou amarelo #ffd500 sobre fundo claro. Ação principal verde com texto branco em todos os botões principais.
- Formas: botões em pílula (999px); exceções intencionais são ações de texto e opções de lista (8 a 12px) e cartões (16px).
- Esmaecimento: nenhuma reticência (`text-overflow`) ou `line-clamp` restante; títulos, células e áreas com rolagem seguem 1.1.25.
- **Corrigido na revisão:** campos da Gestão (`input`, `select`, `textarea`, 43 ocorrências) estavam com 13 a 14px; passam a **16px**, como exige F-regras (evita zoom no celular). No Aluno já estavam em 16px.
- **Corrigido na revisão:** subtítulo de Dados da Gestão dizia "Painel com informações de uso dos alunos."; agora "Informações de uso dos alunos." ("Painel" é só a página do aluno).
- Logo: Aluno usa o wordmark em arquivo; Gestão usa o SVG único `crias-logo-gestao.svg` (1.1.25). Nenhum "Crias" em texto no lugar do logo.

## Base v1.0 travada

A v1.0 do aluno (`Crias Aluno v1.0.dc.html`, no repositório `crias-redesign/prototipo/Crias Aluno.dc.html`) e o painel v1.0 (`Crias Painel v1.0.dc.html`, no repositório `.../Crias Painel.dc.html`) são a base de identidade visual. Esta seção vale sobre as regras antigas abaixo. Mudanças só a pedido.

**Substitui nas regras antigas**

- Regras 3, 6, 10, 22 e F20 (Maria como parceiro de estudos, avatar animado, barra com Maria ao lado): o tutor é o **monitor**. Não há Maria animada, emojis ou reações. A barra de mensagem não tem figura ao lado.
- Regra 10 (menu): grupo "Acompanhamento" com "Painel" (subtítulo "Ver seus dados de estudo") e "Monitoria" (subtítulo "Conversar com seu monitor"), depois grupo "Trilhas".
- Regra 12 (início): cards sem órbita nem ícone. Estrutura em 1.0.5 abaixo.
- Regra 15 (progresso): vale, e o menu e os cards mostram só a barra em degradê e "Atividade X de Y" (sem porcentagem).
- Regra 23 (entrada): campos Login e Senha vazios, sem texto de exemplo e sem preenchimento automático.
- Regra 24 (Horizonte): na v1.0 o fundo é a malha 3D (1.0.2). O Horizonte antigo não é mais usado.
- Tema: **claro é o padrão ao abrir**. O escuro (preto #000) vem pelo botão do menu.
- Textos com "Maria" viram "monitor" (ver 1.0.1).

**1.0.1 Texto**

- Rótulo das mensagens: "Monitor". Placeholder: "Pergunte ao monitor…". Botão: "Enviar pergunta ao monitor". Mensagem inicial: "Oi, eu sou o monitor. Pode me perguntar sobre qualquer trilha ou assunto."
- Vazio na home: "Nenhuma trilha liberada para você." No menu: "Nenhuma trilha liberada" e "Não foi possível carregar suas trilhas", sem ponto final. Erro na home sem negrito.

**1.0.2 Fundo**

- Malha 3D na entrada e na home, bem lenta (ciclo de 150s, `vGrid`). Sem seletor de fundo.
- Conversas: só a névoa, a 70% da intensidade. No escuro, o verde da névoa é um pouco mais suave (`--v-rimGlow` .24, `--v-aurA` .26).
- Fundo escuro `--v-bg` = #000. `theme-color` do escuro = #000000.
- Topo e base do conteúdo começam na cor sólida do fundo e transitam em degradê suave (curva com várias paradas) até os tons atuais: 60px no topo e 80px na base, mais a área segura. No menu lateral, o retângulo bege tem cantos arredondados (raio 59px na horizontal; 89px no topo e 114px na base na vertical), desfoque de 6,5px na borda e a mesma máscara de transição. Em computador e celular.

**1.0.3 Menu lateral**

- Rótulos "Acompanhamento" e "Trilhas": caixa alta, 11px, peso 700, espaçamento .1em, cor `--v-lab` (#00593d no claro, #5fe3b5 no escuro), com linha de 1px (meio pixel visual, 25% de opacidade) até o fim. Espaço de 28px acima de "Trilhas".
- Linha de trilha: nome (uma linha, esmaece), barra de progresso de 4px em degradê #ffd500 para #00be85 e "Atividade X de Y". Sem ícone ou órbita.
- Rodapé: seletor Claro/Escuro e, abaixo, linha de 38px: avatar "A" (32px, #00593d) alinhado ao início do botão Claro, nome "Ana" (13px, 700), seta à direita (abrir perfil) e, na ponta, o ícone de sair (21px, sem círculo), com o mesmo tamanho e a mesma margem do botão de recolher menu do topo, para alinhar os centros.

**1.0.4 Entrada**

- Malha 3D ao fundo, wordmark, campos Login e Senha vazios (sem texto de exemplo, `autocomplete="off"`/`new-password`) e botão Entrar.

**1.0.5 Início**

- Saudação alternada, até 3 trilhas (tweak 1 a 3), barra "Pergunte ao monitor…".
- Card de trilha: linha do título com nome (19px, 700, uma linha, esmaece) e, à direita, a seta ">" verde #00be85 (a mesma da seta do menu) de 19px, sem caixa; abaixo a barra de progresso e "Atividade X de Y"; depois "AGORA" com o nome da atividade (esmaece se longo; o tweak "nome longo" também alonga esse nome). Brilho de hover amarelo a 3%. Borda verde no hover.
- Celular: cards mais baixos (padding 14/16/12, espaço interno 12, entre cards 10) para caber 3 trilhas sem rolar.

**1.0.6 Conversa**

- Mensagens do monitor com avatar "M" amarelo #ffd500 com letra escura (30px). Mensagens de trilha com o símbolo do Crias (arquivo `crias-symbol.png`).
- No celular, a barra de mensagem não tem sombra externa.

**1.0.7 Protótipo**

- Botão de opções no canto superior direito (aluno e painel). Menu: "Telas do protótipo" (Entrada, Início, Conversa), "Painel" (Início, Dados, Alunos, Visão por instituição, Trilhas, Gabaritos, Usuários e permissões, API e documentação) e, só embaixo, "Atualizar". Painel e aluno se apontam (v1.0 para v1.0).
- Tweaks do aluno: estado, trilhasNaHome (1 a 3), nomeLongo, efeitos3d e celular. O tweak "celular" mostra um iPhone 17 (402×874, ilha dinâmica e barra de status) em um painel de 460px à direita, com a versão web ao lado, e acompanha os outros tweaks.
- A terceira trilha de exemplo é "Ciências da natureza" (2 atividades).

**1.0.8 Histórico e Início** (alterado direto no código, registrado aqui para acompanhamento)

- A conversa da trilha mostra o histórico inteiro numa conversa só, com todas as atividades em sequência. Ao rolar para cima, a conversa sobe sozinha para a atividade anterior.
- O Início mostra 2 trilhas, apenas as não concluídas. Trilha concluída sai da lista.

## Base de referência

- Repositório: `thiagocrias/crias-web`, branch `main`. Versões do frontend: v0 (original), v1.0 (já no repositório, `src/styles/crias-v1-0.css`) e v1.1 (esta).
- Os protótipos `Crias Aluno.dc.html` e `Crias Gestao.dc.html` (em `frontend/crias-aluno/design/prototipo/`) são a referência visual e de comportamento em computador e celular. A implementação final é feita no código.
- Crias Aluno: `frontend/crias-aluno` (`src/pages`, `src/layouts`, `src/components`, `src/styles`).
- Crias Gestão: `frontend/crias-gestao` (`src/design`, `src/pages`, `src/layouts`).
- Só camada visual. Nada de API, Firestore, rotas, autenticação ou permissões.
- Quando um item exige lógica, ele está marcado como **CONFLITO**. Esses itens param e pedem aval antes de mexer no código.

## Vocabulário (banco para interface)

Hierarquia: trilha > atividade > etapa (no banco: trails > question > stage).

| Banco | Interface |
| --- | --- |
| tutor | monitor |
| trail | trilha |
| question | atividade |
| stage | etapa |

Dentro de uma atividade, a etapa que pede resposta chama-se **exercício**. As demais etapas são texto, imagem, vídeo e link. O rótulo no cartão é "Exercício".

Exemplo: "Matemática básica" é a trilha. "Atividade 2 de 5" é a segunda atividade. "Etapa 3 de 4" é a terceira etapa dentro da atividade.

## Regras invioláveis

0. No painel, a conclusão (Dados, indicadores e gráficos) é medida por **atividade**, nunca por etapa.


1. Fundo branco. Bege (`#fcfbf6`, `#f7f5ec`, `#fefdfa`) só em destaques, campos e balões. O menu lateral usa #fdfcf9 no claro (1.1.22).
2. Ação principal: verde `#00be85` com texto e ícone brancos. Hover `#00a974`, pressionado `#00925f`. Vale para Continuar, Enviar, Entrar, avatar e botões de criar.
3. Maria é o **parceiro de estudos** (tutor). Ela conversa dentro das trilhas e também fora delas.
4. Nunca usar "Passo". Usar "Etapa" (ex.: "Etapa 3 de 12").
5. Nunca usar travessão (—) nem "–" em textos de interface.
6. Nenhuma conversa mostra a tag "MARIA" no topo.
7. Questão: o campo fica travado com "Selecione uma alternativa e continue...". Continuar só ativa com alternativa marcada. Depois de responder, as alternativas ficam travadas.
8. Continuar fica no lugar do botão Enviar, dentro da barra de mensagem, enquanto o campo está vazio. Ao digitar, aparece Enviar no lugar. Ao apagar, volta Continuar.
9. Continuar tem o efeito de destaque (halo verde pulsante) na primeira vez que a pessoa abre cada trilha, até avançar pela primeira vez. Não há balão de texto sobre o botão. Além disso, todo botão Continuar (quando ativo), todo botão Enviar e o botão Entrar mostram o mesmo halo ao passar o mouse, em qualquer momento: entrada, trilhas, tela inicial e Conversar com Maria.
10. Menu lateral: grupo "Parceiro de estudos" com "Conversar com Maria" e grupo "Trilhas" com a lista. Não há "Minhas trilhas" nem "Continuar aula" no menu.
11. Logo: wordmark "Crias" no topo do menu, sempre o arquivo `crias-logo-dark-green.svg` (traço mais fino). Sem símbolo no menu lateral.
12. Tela inicial: fundo Horizonte (regra 24) e símbolo do Crias parado, sem pulsar. Mostra até 3 trilhas, na ordem da última aberta primeiro.
    - Cada card tem a mesma estrutura do menu: nome da trilha com seta verde à direita, barra de progresso e "Atividade X de Y". Altura natural, sem formato quadrado.
    - 1 trilha: card mais largo, centralizado. 2 ou 3 trilhas: dividem a largura.
    - "Outras trilhas no menu ao lado" aparece só com mais de 3 trilhas.
    - Abaixo dos cards fica a barra "Pergunte à Maria…".
13. Toda tela tem estados de carregando, vazio e erro.
14. Português do Brasil em todos os textos.
15. Cada trilha no menu mostra: nome, barra de progresso geral e o texto "Atividade 1 de 5". A barra é um degradê do amarelo para o verde (`#ffd500` para `#00be85`).
16. Seta à direita do nome da trilha, sempre verde `#00be85`. Fechada, aponta para a direita. Aberta, aponta para baixo e mostra a lista de atividades. A seta alterna abrir e recolher: se a trilha já está aberta, um clique recolhe, e outro clique abre de novo.
17. Clicar no nome da trilha abre imediatamente o ponto onde o aluno parou e expande a lista de atividades.
18. Clicar em outra atividade mostra o histórico dela. O histórico é dividido por atividade e a conversa abre na última mensagem, como se tivesse parado ali. Ao rever uma atividade anterior, a barra de mensagem dá lugar a "Voltar para a atividade atual". Atividades ainda não alcançadas ficam desativadas.
19a. Alinhamento: as mensagens e o cartão de exercício ficam centralizados em relação à barra de mensagem, com margem de 10% em cada lado.
20. Avatar do usuário: verde escuro `#00593d` com letra branca.
21. A saudação da tela inicial alterna a cada visita: "Vamos avançar mais, Ana?", "Olá, Ana. Continue sua atividade...", "Oi, Ana. Vamos aprender mais hoje?", "Qual trilha você quer seguir, Ana?", "Ei, Ana. Vamos em frente nos estudos...".
22. A barra "Pergunte à Maria…" tem o botão de enviar visível desde o início, na tela inicial e em "Conversar com Maria". Ele é sempre verde.
23. Entrada (proposta "Horizonte"): dois campos, **Login** e **Senha**. O campo Login aceita DDD + telefone, e-mail ou ID da escola, com o texto de apoio "DDD + telefone, e-mail ou ID da escola". Não há campo "Código da escola". Não há título nem texto de apoio, e não há logo no topo (problema de espaço no celular). No centro, o wordmark "Crias" (40px de altura) sobre os campos (52px, bege claro, borda verde no foco) e o botão Entrar verde com seta. Ao fundo, o Horizonte (regra 24).
24. **Horizonte** (fundo padrão de todas as telas do aluno: entrada, início, trilhas e Conversar com Maria). Na área de conteúdo, à direita do menu. O menu lateral não recebe o efeito.
    - Brilho: círculo de 900px, centro 520px abaixo da borda inferior, `radial-gradient(circle, rgba(0,190,133,.10) 0%, rgba(0,190,133,.04) 14%, rgba(255,213,0,.05) 50%, transparent 68%)`, `blur(8px)`. Verde baixo e bem transparente, para não brigar com o texto das respostas. Amarelo acima.
    - Linha verde: círculo de 460px, 1px `rgba(0,190,133,.065)`, centro 360px abaixo da borda inferior.
    - Arco que pulsa: círculo de 460px, 1px `rgba(255,213,0,.34)`, cresce até 1,18x e some, ciclo de 11s.
    - Entrada: brilho e linha sobem 80px em 2,6s ao abrir a tela.
    - Quem usa "reduzir movimento" vê o efeito parado.
25. Respiro entre a última mensagem e a barra de mensagem: 52px.
19. O topo da conversa mostra o nome da trilha e "Atividade X de Y · Etapa A de B".

## Regras de front-end (web e celular)

Valem para o app e para o protótipo. A meta é abrir no celular com a mesma firmeza de um app de conversa: nada mexe, nada amplia, nada vaza da tela.

**Ponto de quebra**

F1. Um ponto de quebra só: `max-width: 768px`, mais paisagem baixa (`max-height: 600px` e `orientation: landscape`). É o mesmo que o `app.css` já usa. Acima disso é computador.

**Tela e zoom**

F2. Viewport de app em `index.html`: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content`.
F3. Nenhum campo (`input`, `textarea`, `select`) com fonte menor que 16px. Abaixo disso o iPhone amplia a tela ao tocar no campo.
F4. `touch-action: manipulation` no `html` (sem zoom por duplo toque) e `-webkit-tap-highlight-color: transparent` em tudo (sem o retângulo cinza ao tocar).
F5. A moldura do app usa a altura visível da tela: `var(--vv-height, 100dvh)`, que `lib/visualViewport.ts` já calcula. Nunca `100vh`. Com o teclado aberto, a barra de mensagem fica logo acima dele.
F6. A página nunca rola. Só rolam a conversa, a tela inicial e a lista do menu, cada uma com `overscroll-behavior: contain`.
F7. Áreas seguras (`env(safe-area-inset-*)`) no topo, no rodapé da barra de mensagem e no rodapé do menu.

**Foco**

F8. O anel de foco fica na **caixa**, nunca no campo de texto dentro dela. A caixa ganha borda verde e halo de 4px. O `textarea` da barra de mensagem e os `input` da entrada ficam com `outline: none`. Era essa a "caixa retangular dentro da caixa": a regra `.chat-composer__input:focus-visible { outline: 2px solid }` do `app.css` desenhava um retângulo dentro da barra arredondada. Botões e links mantêm o `:focus-visible`.

**Nomes de trilha e títulos**

F9. Nome de trilha, título do topo, título de atividade e "Atividade X de Y" ficam sempre em **uma linha**. Quando não cabem, o fim **esmaece** (máscara de 40px), como na referência enviada. Nunca reticências, nunca duas linhas, nunca aumentam a altura do card.
F10. Para o esmaecimento funcionar, o elemento ocupa toda a largura disponível (`flex: 1; min-width: 0; display: block`) e recebe `white-space: nowrap; overflow: hidden; mask-image: linear-gradient(90deg, #000 calc(100% - 40px), transparent)`. Nome curto não chega na faixa esmaecida. O nome completo vai no `title`.
F11. A altura de cada card é dada pela estrutura (nome, progresso, atividade), nunca pelo tamanho do nome. Grades usam `minmax(0, 1fr)`.

**Menu**

F12. Computador: menu lateral fixo de 272px (protótipo 280px), recolhível pelo botão do topo.
F13. Celular: o menu abre **em tela cheia**, por cima de tudo, com o X no canto. Fecha ao tocar no X, em uma trilha, em uma atividade, no logo ou em Conversar com Maria. A seta de abrir atividades não fecha o menu.
F14. Celular: nomes de trilha em 16px, apoio em 13px, atividades em 15px, alvos de toque de 44px no mínimo.

**Topo**

F15. Computador: 60px, nome da trilha e, ao lado, os pontos de etapa e "Atividade X de Y · Etapa A de B".
F16. Celular: 56px. Botão de menu (três linhas) à esquerda. Nome da trilha em cima (16px) e a linha de etapa embaixo (12px).

**Conversa**

F17. Computador: largura máxima de 760px, coluna de 32px para o símbolo, exercício recuado 46px.
F18. Celular: sem coluna de avatar. O símbolo de 20px fica ao lado do rótulo, e o texto ocupa a largura toda. Margem lateral de 14px. Exercício sem recuo, com 16px de respiro interno e enunciado em 17px. Balão do aluno até 86% da largura.
F19. Texto longo (link, palavra grande) quebra a linha (`overflow-wrap: anywhere`). Todo `fieldset` e item flex com texto leva `min-width: 0`, para nada empurrar a tela para o lado.

**Barra de mensagem**

F20. Maria fica ao lado da barra: 50px no computador, 46px no celular.
F21. Travada no exercício, a barra mostra "Selecione uma alternativa e continue..." em texto que quebra em até duas linhas (14px no celular). No celular, o Continuar desativado vira só a seta (40px). Ao marcar uma alternativa, volta o botão verde com "Continuar".
F22. O campo cresce com o texto até 160px e depois rola.
F23. Computador: Enter envia e Shift+Enter quebra linha. Celular: Enter quebra linha e o envio é pelo botão.

**Tela inicial**

F24. Celular: cards em uma coluna, saudação em 30px e a barra "Pergunte à Maria…" fixa no rodapé, acima da área segura. Computador: cards lado a lado e a barra logo abaixo deles.

**Imagens e arquivos**

F25. Logo e símbolo são sempre arquivos, nunca texto "Crias" nem desenho refeito. App: `frontend/cria-frontend/public/`. Protótipo: `crias-redesign/prototipo/assets/`. Design system: `crias-redesign/design-system/assets/`.
F26. Wordmark: sempre `crias-logo-dark-green.svg`. No tema escuro o CSS o deixa branco (`filter: brightness(0) invert(1)`), como no protótipo. Favicon: `crias-simbolo-luz.svg`.
F27. Todo arquivo referenciado precisa estar na mesma pasta do pacote. Nenhuma imagem aponta para outro projeto ou para fora do repositório.
F28. No app, caminhos públicos usam a base do Vite: `` `${import.meta.env.BASE_URL}crias-logo-branco.svg` `` (a base é `/aluno/`).

**Movimento**

F29. Com "reduzir movimento" ligado, tudo fica parado.

### Checklist de teste no celular

Aparelhos: iPhone SE (375×667), iPhone 14 (390×844), Android pequeno (360×800), iPad (768×1024), notebook (1280×800) e monitor (1440×900).

- Tocar na barra de mensagem e na entrada não amplia a tela.
- Pinça e duplo toque não ampliam.
- Com o teclado aberto, a barra fica visível e a conversa rola até a última mensagem.
- O menu abre em tela cheia e fecha ao escolher uma trilha.
- Uma trilha com nome longo (ex.: "[CRIAS] Conversão OLITEF Demonstração") esmaece no fim, no menu, no card e no topo, sem mudar a altura de nada.
- Ao tocar no campo não aparece retângulo dentro da barra.
- Nada rola para o lado em nenhuma tela.
- O logo aparece na entrada, no menu e na aba do navegador.

## Correções no app atual

Feitas no pacote, sem mexer em lógica. O app passa a ter o mesmo visual do protótipo: escuro por padrão, claro pelo botão do menu.

| Problema | Onde estava | Correção |
| --- | --- | --- |
| Retângulo dentro da barra ao digitar | `.chat-composer__input:focus-visible` (outline 2px) | `outline: none` no campo. Anel na `.chat-composer__form:focus-within` |
| Retângulo de toque e zoom | global | `tap-highlight` transparente, `touch-action: manipulation`, campos com 16px, viewport sem zoom |
| Nome da trilha em 2 linhas, aumentando o card | `.trail-card__id` (`-webkit-line-clamp: 2`) | Uma linha com esmaecimento |
| Título do topo com reticências | `.chat-topbar__title` | Esmaecimento |
| Menu do celular estreito | `.chat-sidebar` em `max-width: 768px` | Tela cheia |
| Visual antigo (azul-escuro, verde-neon, Fraunces) | tokens de `:root` em `app.css` | `crias-tema.css` redefine os tokens e os componentes |
| Logo em texto | `.brand`, `.chat-sidebar__brand`, `.chat-topbar__brand` | Arquivo `crias-logo-dark-green.svg` no menu e na entrada |
| "Passo" e travessão em textos | `ChatLayout`, `TrailsPage`, `PlayerPage`, `trailMessages` | "Etapa" e pontuação comum |
| Tag MARIA no topo | `chat-topbar__maria` | Removida |

Observação: os comentários do código ainda dizem "passo" e o nome interno `primaryPasso` continua. São invisíveis para o aluno e não foram alterados.

## Conflitos com o repositório atual

| Item | Situação no repo | Ação |
| --- | --- | --- |
| Histórico por atividade | A conversa é um rolo único por trilha (`PlayerPage.tsx`, mensagens por célula) | **CONFLITO de lógica**: dividir o histórico por atividade muda como as mensagens são carregadas e exibidas. Parar e avisar. |
| Lista de atividades no menu | `ChatLayout.tsx` só conhece trilhas e o total de etapas (`fetchTrailStageTotals`) | **CONFLITO de dados**: precisa da lista de atividades (question) de cada trilha. Hoje o app não expõe isso. |
| Vocabulário | O app usa "passo" para o que o banco chama de stage | Usar "etapa" para stage e "atividade" para question. Só texto. |
| Entrada sem código da escola e campo Login | `LoginPage.tsx` envia telefone, código da escola e senha. O campo de telefone só aceita número | **CONFLITO de lógica e API**: tirar o código e aceitar telefone, e-mail ou ID da escola muda o login no servidor. Só o texto do rótulo ("Login") e do texto de apoio é visual. Parar e avisar. Ver decisão 9 em DECISOES.md. |
| Tema | `styles/app.css` usa o tema escuro antigo | **Resolvido** pelo `crias-tema.css`: escuro novo por padrão e claro pelo botão. O `app.css` antigo não foi alterado. |
| Menu "Minhas trilhas" e "Continuar aula" | `ChatLayout.tsx` monta o menu com esses itens | Ajustar o JSX do menu. A rota `/` continua como está. |
| Maria fora da trilha | A conversa existe só dentro de trilha (sidechat por célula) | **CONFLITO de lógica**: precisa de fluxo sem `trail_id`. Parar e avisar. |
| Barra "Pergunte à Maria" na tela inicial | Hoje não existe na tela inicial | **CONFLITO de lógica**: mesmo motivo acima. |
| Halo na primeira abertura de cada trilha | Não há controle de "primeira vez" | **CONFLITO de lógica**: precisa guardar a primeira abertura (localStorage ou dado do servidor). |
| Ordem por última aberta e limite de 3 | Não há registro de última abertura | **CONFLITO de lógica**: mesmo tipo de persistência. |
| Texto "Passo" | Textos visíveis | **Resolvido** no pacote. |
| Travessão em textos | Título, `trailMessages.ts`, `PlayerPage.tsx`, `aria-label` do menu | **Resolvido** no pacote. |
| Tag "MARIA" no topo | `chat-topbar__maria` | **Resolvido** no pacote. |
| Símbolo do Crias | `cria-frontend` não tinha símbolo nem favicon | Arquivos em `public/` e favicon no pacote. Falta usar o símbolo na tela inicial (item 5 da orientação). |
| Entrada ainda com texto antigo | `LoginPage.tsx` mostra título "Entre na sua trilha", "Telefone" e "Código da escola" | Depende do **CONFLITO** do login (decisão 9). Só o logo foi trocado. |

## Orientação para o Cursor

Aplicar nesta ordem. Pular os itens marcados como CONFLITO até o aval.

0. **Pacote:** copiar o pacote por cima da raiz do repositório. Conferir que `public/` tem os SVG e que `main.tsx` importa `crias-ajustes.css`. Rodar o checklist de teste no celular.
1. **Tema:** já está no pacote (`crias-tema.css`). Conferir os dois temas.
2. **Texto:** já está no pacote. Conferir que não sobrou "Passo" nem travessão em textos visíveis.
3. **Topo:** já está no pacote.
4. **Menu:** em `ChatLayout.tsx`, remover "Minhas trilhas" e "Continuar aula". Criar o grupo "Parceiro de estudos" com "Conversar com Maria" (link para a rota da Maria, a definir após o aval).
5. **Tela inicial (`TrailsPage.tsx`):** montar o layout do protótipo: fundo Horizonte, saudação, cards de 1 a 3 trilhas e barra de pergunta. Aplicar a regra 12 e as regras F9 a F11 e F24.
6. **Player (`PlayerPage.tsx`):** Continuar dentro da barra de envio, sem balão. Regras F17 a F23. Halo na primeira abertura (depende do aval).
7. **Conflitos:** só depois do aval.

## Histórico de decisões

- Revisão 8: histórico da trilha inteira numa conversa só, que sobe sozinha para a atividade anterior. Início com 2 trilhas, só as não concluídas. Ver 1.0.8.

- Revisão 7 (v1.0 travada): monitor no lugar da Maria, sem emojis, símbolo do Crias, barra de progresso em degradê, malha 3D lenta, tema claro por padrão e escuro preto, menu com Acompanhamento e Painel, rodapé do menu padronizado, topo e base com transição suave e cantos arredondados, cards da home com seta amarela, menu de protótipo com páginas do painel, tweaks de trilhas e celular. Ver "Base v1.0 travada".
- Revisão 6: varredura de web e celular. Menu em tela cheia no celular. Nomes de trilha em uma linha com esmaecimento no fim. Anel de foco só na caixa (fim do retângulo dentro da barra). Viewport de app, sem zoom. Barra "Pergunte à Maria" fixa no rodapé da tela inicial no celular. Logos e favicon entram no repositório. Regras F1 a F29. Protótipo v4.
- Revisão 1: Continuar no lugar do Enviar, com halo na primeira abertura. Questão travada com texto próprio. Número de etapa sobe a cada Continuar.
- Revisão 5: Horizonte vira o fundo padrão de todas as telas do aluno. Verde do brilho mais baixo e transparente. Símbolo da tela inicial sem pulsar. Respiro de 52px acima da barra.
- Revisão 4: entrada só com Login e Senha. Login aceita telefone, e-mail ou ID da escola. Entrada refeita. Foram testadas três propostas (A · Logo, B · Horizonte, C · Dois tempos). Escolhida a B · Horizonte.
- Revisão 3: hierarquia trilha > atividade > etapa. Menu com seta abrir/recolher e lista de atividades. Histórico por atividade. Trilha Frações removida do exemplo; Matemática básica com 5 atividades e Leitura e interpretação com 3.
- Revisão 2b: esfumaçado centralizado na tela inicial. Símbolo removido do menu lateral.
- Revisão 2: Maria vira "Parceiro de estudos". Tela inicial em estilo Gemini, com até 3 trilhas e barra de pergunta.
