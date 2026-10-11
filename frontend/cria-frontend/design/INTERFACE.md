# Interface Crias: regras e orientações

Este arquivo guarda as regras da interface. Cada regra inviolável definida na revisão entra aqui.

## Como aplicar este pacote

O pacote (`export/repo/`) espelha a raiz do repositório `thiagocrias/crias-gpt`, branch `design/interface`. Em `crias-web`, os documentos e o design system ficam em `frontend/cria-frontend/design/` (espelho de `crias-redesign/`). Copie por cima e faça o commit. Nada é apagado. Decisões aprovadas (Maria fora da trilha, login sem código, home com cards + barra Maria, halo/última aberta) permanecem; tema escuro é o padrão do zip/protótipo (claro pelo botão). O TSX do pacote que regride essas decisões não se aplica cegamente. Lista de atividades aninhada no menu: **não** aplicar (decisão de produto).

| Caminho no pacote | Em crias-web | O que é |
| --- | --- | --- |
| `crias-redesign/INTERFACE.md` | `frontend/cria-frontend/design/INTERFACE.md` | Este arquivo. Regras de interface e de front-end |
| `crias-redesign/DECISOES.md` | `frontend/cria-frontend/design/DECISOES.md` | Decisões em aberto, para o sócio |
| `crias-redesign/prototipo/Crias Aluno (offline).html` | `.../design/prototipo/` | Protótipo em arquivo único. Abre com duplo clique, sem internet |
| `crias-redesign/prototipo/Crias Aluno.dc.html` | idem | Fonte do protótipo. Precisa de `support.js` e `assets/` |
| `crias-redesign/design-system/` | `.../design/design-system/` | Tokens (`styles.css`), guia (`readme.md`) e logotipos |
| `frontend/cria-frontend/public/` | igual | Logotipos e favicon do app |
| `frontend/cria-frontend/index.html` | igual | Viewport de app, título sem travessão, favicon e fontes |
| `frontend/cria-frontend/src/styles/crias-tema.css` | igual | Visual do app: **escuro por padrão** (zip/protótipo v4), claro pelo botão Claro/Escuro (fundo branco). Outfit/Manrope, pílula verde, Horizonte, Maria sem balão |
| `frontend/cria-frontend/src/styles/crias-ajustes.css` | igual | Correções de front-end (foco, toque, zoom, menu em tela cheia, nomes esmaecidos) |
| `frontend/cria-frontend/src/components/ThemeToggle.tsx` | igual | Botão Claro/Escuro do menu (`crias-aluno-v2-tema`) |
| `frontend/cria-frontend/src/main.tsx` | igual | Importa `crias-tema.css` e `crias-ajustes.css` depois de `app.css` |
| `frontend/cria-frontend/src/layouts/ChatLayout.tsx` | igual (incremental) | Logo, ThemeToggle, sem tag MARIA, "Passo", sem travessão no `aria-label`. Mantém menu Maria + Trilhas |
| `frontend/cria-frontend/src/pages/LoginPage.tsx` | igual (incremental) | Logo em arquivo; mantém Login sem código + seletor multi-escola |
| `frontend/cria-frontend/src/pages/TrailsPage.tsx`, `PlayerPage.tsx`, `lib/trailMessages.ts` | igual (incremental) | Vocabulário "Passo"; home cards + barra Maria já no app |

Por que o logo não aparecia: o protótipo aponta para `assets/crias-logo-dark-green.svg`, e esse arquivo não estava no repositório (só os PNG antigos). O app (`cria-frontend`) não tinha pasta `public/` e escrevia "Crias" em texto. Agora cada pasta leva as imagens que usa, e o protótipo offline carrega tudo dentro do próprio arquivo.

## Base de referência

- A revisão parte do repositório funcional atual: `thiagocrias/crias-gpt`, branch `design/interface`. Não usar a `main`.
- O protótipo `Crias Aluno v4.dc.html` (no repositório: `crias-redesign/prototipo/Crias Aluno.dc.html`) é a referência visual e de comportamento em computador e celular. A implementação final é feita no código, sobre o repositório atual.
- Aluno: `frontend/cria-frontend` (`src/pages`, `src/layouts`, `src/components`, `src/styles/app.css`). É o app em uso.
- O design novo (design system, protótipo e estes documentos) fica em `frontend/cria-frontend/design/` neste repositório. A pasta raiz `crias-redesign/` fica como histórico: não apagar nem alterar.
- Painel: `frontend/trilha-admin/src/design/**` e `public/**`.
- Só camada visual. Nada de API, Firestore, rotas, autenticação ou permissões.
- Quando um item exige lógica, ele está marcado como **CONFLITO**. Esses itens param e pedem aval antes de mexer no código.

## Vocabulário (banco para interface)

Hierarquia: trilha > atividade > passo (no banco: trails > question > stage).

| Banco | Interface |
| --- | --- |
| tutor | parceiro de estudos |
| trail | trilha |
| question | atividade |
| stage | passo |

Dentro de uma atividade, o passo que pede resposta chama-se **exercício**. Os demais passos são texto, imagem, vídeo e link. O rótulo no cartão é "Exercício".

Exemplo: "Matemática básica" é a trilha. "Atividade 2 de 5" é a segunda atividade. "Passo 3 de 4" é o terceiro passo dentro da atividade.

## Regras invioláveis

0. No painel, a conclusão (dashboard, indicadores e gráficos) é medida por **atividade**, nunca por passo.


1. Fundo branco. Bege (`#fcfbf6`, `#f7f5ec`, `#fefdfa`) só em destaques, menu lateral, campos e balões.
2. Ação principal: verde `#00be85` com texto e ícone brancos. Hover `#00a974`, pressionado `#00925f`. Vale para Continuar, Enviar, Entrar, avatar e botões de criar.
3. Maria é o **parceiro de estudos** (tutor). Ela conversa dentro das trilhas e também fora delas.
4. Nunca usar "Etapa". Usar "Passo" (ex.: "Passo 3 de 12").
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
19. O topo da conversa mostra o nome da trilha e "Atividade X de Y · Passo A de B".

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

F15. Computador: 60px, nome da trilha e, ao lado, os pontos de passo e "Atividade X de Y · Passo A de B".
F16. Celular: 56px. Botão de menu (três linhas) à esquerda. Nome da trilha em cima (16px) e a linha de passo embaixo (12px).

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
| "Etapa" e travessão em textos | `ChatLayout`, `TrailsPage`, `PlayerPage`, `trailMessages` | "Passo" e pontuação comum |
| Tag MARIA no topo | `chat-topbar__maria` | Removida |

Observação: os comentários do código ainda dizem "etapa" e o nome interno `primaryEtapa` continua. São invisíveis para o aluno e não foram alterados.

## Conflitos com o repositório atual

| Item | Situação no repo | Ação |
| --- | --- | --- |
| Histórico por atividade | A conversa é um rolo único por trilha (`PlayerPage.tsx`, mensagens por célula) | **CONFLITO de lógica**: dividir o histórico por atividade muda como as mensagens são carregadas e exibidas. Parar e avisar. |
| Lista de atividades no menu | `ChatLayout.tsx` só conhece trilhas e o total de passos (`fetchTrailStageTotals`) | **CONFLITO de dados**: precisa da lista de atividades (question) de cada trilha. Hoje o app não expõe isso. |
| Vocabulário | O app usa "etapa" para o que o banco chama de stage | Usar "passo" para stage e "atividade" para question. Só texto. |
| Entrada sem código da escola e campo Login | `LoginPage.tsx` envia telefone, código da escola e senha. O campo de telefone só aceita número | **CONFLITO de lógica e API**: tirar o código e aceitar telefone, e-mail ou ID da escola muda o login no servidor. Só o texto do rótulo ("Login") e do texto de apoio é visual. Parar e avisar. Ver decisão 9 em DECISOES.md. |
| Tema | `styles/app.css` usa o tema escuro antigo | **Resolvido** pelo `crias-tema.css`: escuro novo por padrão e claro pelo botão. O `app.css` antigo não foi alterado. |
| Menu "Minhas trilhas" e "Continuar aula" | `ChatLayout.tsx` monta o menu com esses itens | Ajustar o JSX do menu. A rota `/` continua como está. |
| Maria fora da trilha | A conversa existe só dentro de trilha (sidechat por célula) | **CONFLITO de lógica**: precisa de fluxo sem `trail_id`. Parar e avisar. |
| Barra "Pergunte à Maria" na tela inicial | Hoje não existe na tela inicial | **CONFLITO de lógica**: mesmo motivo acima. |
| Halo na primeira abertura de cada trilha | Não há controle de "primeira vez" | **CONFLITO de lógica**: precisa guardar a primeira abertura (localStorage ou dado do servidor). |
| Ordem por última aberta e limite de 3 | Não há registro de última abertura | **CONFLITO de lógica**: mesmo tipo de persistência. |
| Texto "Etapa" | Textos visíveis | **Resolvido** no pacote. |
| Travessão em textos | Título, `trailMessages.ts`, `PlayerPage.tsx`, `aria-label` do menu | **Resolvido** no pacote. |
| Tag "MARIA" no topo | `chat-topbar__maria` | **Resolvido** no pacote. |
| Símbolo do Crias | `cria-frontend` não tinha símbolo nem favicon | Arquivos em `public/` e favicon no pacote. Falta usar o símbolo na tela inicial (item 5 da orientação). |
| Entrada ainda com texto antigo | `LoginPage.tsx` mostra título "Entre na sua trilha", "Telefone" e "Código da escola" | Depende do **CONFLITO** do login (decisão 9). Só o logo foi trocado. |

## Orientação para o Cursor

Aplicar nesta ordem. Pular os itens marcados como CONFLITO até o aval.

0. **Pacote:** copiar o pacote por cima da raiz do repositório. Conferir que `public/` tem os SVG e que `main.tsx` importa `crias-ajustes.css`. Rodar o checklist de teste no celular.
1. **Tema:** já está no pacote (`crias-tema.css`). Conferir os dois temas.
2. **Texto:** já está no pacote. Conferir que não sobrou "Etapa" nem travessão em textos visíveis.
3. **Topo:** já está no pacote.
4. **Menu:** em `ChatLayout.tsx`, remover "Minhas trilhas" e "Continuar aula". Criar o grupo "Parceiro de estudos" com "Conversar com Maria" (link para a rota da Maria, a definir após o aval).
5. **Tela inicial (`TrailsPage.tsx`):** montar o layout do protótipo: fundo Horizonte, saudação, cards de 1 a 3 trilhas e barra de pergunta. Aplicar a regra 12 e as regras F9 a F11 e F24.
6. **Player (`PlayerPage.tsx`):** Continuar dentro da barra de envio, sem balão. Regras F17 a F23. Halo na primeira abertura (depende do aval).
7. **Conflitos:** só depois do aval.

## Histórico de decisões

- Revisão 6: varredura de web e celular. Menu em tela cheia no celular. Nomes de trilha em uma linha com esmaecimento no fim. Anel de foco só na caixa (fim do retângulo dentro da barra). Viewport de app, sem zoom. Barra "Pergunte à Maria" fixa no rodapé da tela inicial no celular. Logos e favicon entram no repositório. Regras F1 a F29. Protótipo v4.
- Revisão 1: Continuar no lugar do Enviar, com halo na primeira abertura. Questão travada com texto próprio. Número de passo sobe a cada Continuar.
- Revisão 5: Horizonte vira o fundo padrão de todas as telas do aluno. Verde do brilho mais baixo e transparente. Símbolo da tela inicial sem pulsar. Respiro de 52px acima da barra.
- Revisão 4: entrada só com Login e Senha. Login aceita telefone, e-mail ou ID da escola. Entrada refeita. Foram testadas três propostas (A · Logo, B · Horizonte, C · Dois tempos). Escolhida a B · Horizonte.
- Revisão 3: hierarquia trilha > atividade > passo. Menu com seta abrir/recolher e lista de atividades. Histórico por atividade. Trilha Frações removida do exemplo; Matemática básica com 5 atividades e Leitura e interpretação com 3.
- Revisão 2b: esfumaçado centralizado na tela inicial. Símbolo removido do menu lateral.
- Revisão 2: Maria vira "Parceiro de estudos". Tela inicial em estilo Gemini, com até 3 trilhas e barra de pergunta.
