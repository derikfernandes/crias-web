# Regras do projeto Crias (redesign)

- **Responder sempre em português do Brasil.**

## Base atual: v1.1 (fechada em 16/10/2026)

- Versões: **v1.1** é a versão atual, fechada em 16/10/2026 (`Crias Aluno v1.1.dc.html` e `Crias Gestao v1.1.dc.html`). **v1.0** é a base anterior (`Crias Aluno v1.0.dc.html` e `Crias Painel v1.0.dc.html`). Não existe v1.1. Nada muda sem pedido explícito. No repositório: `frontend/crias-aluno/design/prototipo/Crias Aluno.dc.html` e `Crias Gestao.dc.html`. Versões e telas antigas ficam em `historico/`.
- As regras completas estão em `INTERFACE.md`, seções "Base v1.1: fechamento" (1.1.27 a 1.1.38), "Base v1.1: primeira parte" (1.1.1 a 1.1.26) e "Base v1.0 travada". Onde houver conflito, vale o fechamento, depois a primeira parte, depois a v1.0.

## Pacote 1.2.5

- `Crias Aluno.dc.html` (28/10/2026): retomada no Início, régua da atividade, monitor em destaque e corrigindo exercícios, fechamento da atividade e constância no Painel. Regras em INTERFACE.md, "Pacote 1.2.5" (1.2.5.1 a 1.2.5.12; a revisão mais nova vale sobre as anteriores). Aplicação no app: ver `frontend/crias-aluno/design/RELATORIO-1.2.5.md`.
- Exercícios: enunciado, alternativas e gabarito têm uma regra única (A) em diante é alternativa; gabarito abaixo ou na etapa seguinte, nunca exibido). Ver `docs/REGRA-EXERCICIOS.md`.

## Repositório e escopo

- Repositório: thiagocrias/crias-web, branch main. Versões do frontend: v0 (original), v1.0 (já no repositório) e v1.1 (atual).
- Apps: frontend/crias-aluno e frontend/crias-gestao. O design (INTERFACE.md, DECISOES.md, LEIA-ME.md, design-system/, prototipo/) fica em frontend/crias-aluno/design/.
- Só camada visual: estilos e JSX de apresentação. Lógica, API, estado e navegação não mudam. Itens que exigem lógica estão marcados como CONFLITO em INTERFACE.md.
- Pacote de entrega: export/repo/ espelha a raiz do repositório. Atualizar sempre que o protótipo ou INTERFACE.md mudarem. No pacote, os arquivos do protótipo perdem o sufixo de versão (os links internos são ajustados) e há uma versão offline de cada um.

## Texto e vocabulário

- Português do Brasil. Nunca usar travessão (—) nem "–" em textos de interface.
- Nunca usar a palavra "Passo" na interface. Sempre "Etapa" (ex.: "Etapa 3 de 12"). Exercícios sempre "exercício" (ex.: "Responda o exercício").
- Ausência de dado: "N/A" (campo vazio, telefone, % sem base, vínculo inexistente), em todo o Crias.
- Vocabulário banco para interface: tutor = monitor, trail = trilha, question = atividade, stage = etapa. Hierarquia: trilha > atividade > etapa (banco: trails > question > stage). Conclusão no painel é por atividade.
- O tutor se chama **monitor** (área: Monitoria), nunca Maria nem "parceiro de estudos", no aluno e no painel. Grupo do menu: "Acompanhamento". Menu: "Monitoria" (subtítulo "Conversar com seu monitor") e "Painel" (subtítulo "Ver seus dados de estudo"). Textos, "Pergunte ao monitor…", "Enviar pergunta ao monitor". Rótulo das mensagens: "Monitor".
- Estados: vazio na home "Nenhuma trilha liberada para você."; no menu "Nenhuma trilha liberada" e "Não foi possível carregar suas trilhas" (sem ponto final); texto de erro na home sem negrito.

## Tema e cor

- Tema: **claro é o padrão ao abrir** (entrada e páginas); escuro pelo botão do menu. Fundo escuro é **preto (#000)**.
- No tema claro o fundo da área de conteúdo é branco. Bege (#fcfbf6, #f7f5ec, #fefdfa) só em destaques, campos e balões. O menu lateral usa #fdfcf9 no claro (v1.1); no escuro segue #0a1711.
- Ação principal: verde #00be85 com texto e ícone brancos (hover #00a974, pressionado #00925f). Vale para botões e setas de ação. Avatar do usuário: verde escuro #00593d com letra branca.
- Seta de abrir trilha na home: verde #00be85 (o mesmo da seta do menu), sem caixa de botão, do tamanho da fonte do título (19px), alinhada à direita da linha do título.
- Avatar do monitor nas mensagens (38px na web, 33px no celular): personagem do monitor (`crias-monitor.js`, ver abaixo); o círculo amarelo "M" saiu na v1.1. Sem Maria animada, sem emojis, sem reações. O símbolo do Crias (arquivo) aparece na entrada e na trilha concluída. No Início do aluno (v1.2.1, INTERFACE.md 1.2.1.1) fica o personagem do monitor em movimento (`entrada`, 128px, 60% da velocidade).
- Rótulos "Acompanhamento" e "Trilhas" no menu: caixa alta, 11px, verde escuro #00593d (no escuro #5fe3b5), com linha fina ao lado.
- Títulos em Outfit, texto em Manrope. Cantos 12px (cartões 16px), botões em pílula.

## Personagem do monitor

- Definido em `Monitor Personagem.dc.html` (INTERFACE.md 1.1.28). Substitui o "M" amarelo nas mensagens do monitor; mensagens de conteúdo da trilha mantêm o símbolo do Crias.
- Sequência: carregando (anel orbita da direita para a esquerda), pulo único e suave (anel assenta abaixo dos olhos), parado com movimento leve só na última mensagem; mensagens anteriores ficam estáticas.

## Fundo

- Efeito de fundo único: **malha 3D**, na entrada e na home, lenta (um ciclo de 150s). Sem opções de fundo no menu do protótipo. Nas conversas fica só a névoa, a 70% da intensidade. No escuro a névoa verde é mais suave que no claro (aurora a 18%, brilho a 17%).
- Topo e base do Crias começam na cor sólida do fundo (branco no claro, preto no escuro) e transitam em degradê suave para os tons atuais. No menu lateral, o retângulo (#fdfcf9 no claro) tem cantos arredondados (59px na horizontal, 89px no topo e 114px na base na vertical) com borda levemente esfumada; as posições da transição não mudam.

## Esmaecimento e exemplos

- Texto que não cabe (linha, coluna, título, e-mail, arquivo) **esmaece no fim**, nunca reticências nem 2 linhas. Áreas com rolagem (tabelas na horizontal, listas na vertical) esmaecem na borda que ainda tem conteúdo. Ver INTERFACE.md 1.1.25.
- Exemplos da Gestão: toda instituição tem 3 trilhas e todos os campos preenchidos.
- Logo da Gestão: arquivo único `crias-logo-gestao.svg` (e `-branco`), 132×22 px, no design system.
- Posição inicial (Gestão): todo conteúdo começa 36px abaixo do subtítulo, na altura do botão Dados do Início da Instituição, em qualquer página (INTERFACE.md 1.1.30).
- Super admin, Início: "+ Nova instituição" na mesma linha do filtro, que ocupa a largura livre com 16px de respiro.

## Componentes

- Progresso: barra em degradê do amarelo #ffd500 para o verde #00be85, sem ícones ou órbitas, nos cards da home e no menu. O texto é só "Atividade X de Y".
- Em questão, o composer fica travado: "Selecione uma alternativa e continue...". Continuar só ativa com alternativa marcada.
- Menu lateral: Acompanhamento (Painel / Ver seus dados de estudo, e Monitoria / Conversar com seu monitor), Trilhas. Rodapé: Claro/Escuro e linha de 38px com avatar "A", nome "Ana" (13px, 700), seta à direita e, na ponta, o ícone de sair (21px) alinhado ao botão de recolher menu do topo. Avatar alinhado ao início do botão Claro.
- Home: cards com nome, seta amarela, barra, "Atividade X de Y" e "AGORA" com o nome da atividade; textos longos esmaecem no fim. Brilho de hover em amarelo a 3%. No celular os cards são levemente mais baixos para caber 3 trilhas sem rolar.
- Carregamento: símbolo completo desde o primeiro quadro (crias-symbol-192.png, brilho só depois da imagem), em toda tela de carregamento e na troca Aluno/Gestão (INTERFACE.md 1.1.38).
- Entrada: campos Login e Senha vazios, sem texto de exemplo, sem preenchimento automático. Cabeçalho e rodapé do site crias.org (INTERFACE.md 1.1.37): logo leva a https://www.crias.org na mesma aba, só o botão de tema (sem Agendar conversa), símbolo pulsando acima da caixa, rodapé com fundo branco, cabeçalho na cor do menu lateral (#fdfcf9 no claro, #0a1711 no escuro), malha só entre cabeçalho e rodapé.
- No celular a barra de mensagem não tem sombra externa (evita faixa de tom diferente na base).

## Web e celular

- Seguir as regras F1 a F29 de INTERFACE.md. Resumo: viewport de app sem zoom, campos com no mínimo 16px, anel de foco só na caixa (nunca retângulo dentro dela), nomes de trilha e títulos em uma linha com o fim esmaecendo (nunca reticências nem 2 linhas), menu em tela cheia no celular, altura pela var(--vv-height) (nunca 100vh), áreas seguras, página nunca rola.
- Referência de celular: iPhone 17 (402×874). O tweak "celular" do protótipo mostra o app nesse formato ao lado da versão web, no Aluno e na Gestão (v1.1). A Gestão segue os mesmos padrões de celular do Aluno (INTERFACE.md 1.1.27).

## Imagens

- Logo e símbolo sempre como arquivo (app: public/, protótipo: prototipo/assets/, design system: design-system/assets/). Nunca texto "Crias" no lugar do logo. Todo arquivo referenciado precisa estar no pacote.

## Protótipo

- Protótipo: no Aluno, no canto superior direito há só o botão de atualizar, redondo e só com ícone, com borda tracejada (só na versão de teste). Na Gestão (v1.1) o atualizar e o "S" saíram; o perfil muda pelos tweaks. A navegação é feita pelo próprio produto (menu lateral e seletor Aluno/Gestão).
- Gestão (v1.1): "Filtrar instituições" (Super admin) ou a etiqueta com o nome da escola (Instituição) ficam no topo da página, à direita, na linha do Voltar e com a mesma altura (36px, pílula); a largura acompanha o conteúdo. Saíram dos cabeçalhos das páginas.
- Tweaks do aluno: estado (normal, carregando, vazio, erro), trilhas na home (1 a 3), nome longo, efeitos 3D, celular e acessoPainel (mostra o seletor Aluno/Gestão).
- Nomes: os dois produtos são **Crias Aluno** e **Crias Gestão** (antes "Crias Painel"). O seletor do menu para quem tem acesso mostra "Aluno" e "Gestão" (na Gestão, Gestão vem primeiro). "Painel" passa a ser só a página de dados do aluno dentro do Crias Aluno.
- Painel do aluno (menu "Painel"): individual, só dados do aluno logado, em layout de conversa com a barra do monitor embaixo. Ver INTERFACE.md 1.1.8.

## Gestão (v1.1)

- Regras consolidadas e orientações para o backend em INTERFACE.md (1.1.35, 1.1.36 e "Orientações para o backend (Cursor), v1.1").
- Trilha: abas Configuração, Conteúdo, Alunos, Gabarito. Nova trilha: só Configuração (passos 1 a 6) e Prévia; geração sempre por prompt fixo do sistema + Configuração de geração.
- Prévia (nova trilha e Adicionar atividades com IA): lista de atividades recolhidas com seta, blocos e conteúdo das etapas ao abrir, e Resumo à direita (Feedback instantâneo e Bloco conclusivo, uma linha cada). Tempo aproximado só no frontend: 1 min por bloco de conteúdo, feedback ou conclusão, 2 min por exercício. Etapa conclusiva ligada por padrão. Na Prévia da nova trilha o botão do topo é "Salvar trilha" e Adicionar alunos fica com contorno verde (INTERFACE.md 1.1.1.b.41 a 44).
- Importar planilha sempre adiciona. Remoções e exclusões pedem DELETAR.
- Botões 36px/13px; todo conteúdo começa em 203px (alinhado ao item selecionado do menu); esmaecimento com 18px de respiro.

## Gestão

- Perfis Super admin (todas as instituições) e Instituição (só a sua). Menu: Início, Dados, Trilhas; grupo **Configurações** com os subtítulos Usuários (Senhas, Permissões) e Sistema (Prompts, API e documentação). Senhas e Prompts só para Master. Gabarito é aba da trilha. Todo "Voltar" volta para a tela anterior (histórico). Ver INTERFACE.md 1.1.12 e 1.1.15.
