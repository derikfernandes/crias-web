# Interface Crias: regras e orientações

Este arquivo guarda as regras da interface. Cada regra inviolável definida na revisão entra aqui.

## Base de referência

- A revisão parte do repositório funcional atual: `thiagocrias/crias-gpt`, branch `design/interface`. Não usar a `main`.
- O protótipo `Crias Aluno.dc.html` é a referência visual. A implementação final é feita no código, sobre o repositório atual.
- Aluno: `frontend/cria-frontend` (`src/pages`, `src/layouts`, `src/components`, `src/styles/app.css`). É o app em uso.
- O design (design system, protótipo e estes documentos) fica em `frontend/cria-frontend/design/`. A pasta `crias-redesign/` fica como histórico: não apagar nem alterar.
- Painel: `frontend/trilha-admin/src/design/**` e `public/**`.
- Só camada visual. Nada de API, Firestore, rotas, autenticação ou permissões.
- Quando um item exige lógica, ele está marcado como **CONFLITO**. Esses itens param e pedem aval antes de mexer no código.

## Vocabulário (banco para interface)

Hierarquia: trilha > atividade > passo.

| Banco | Interface |
| --- | --- |
| tutor | parceiro de estudos |
| trail | trilha |
| question | atividade |
| stage | passo |

Dentro de uma atividade, o passo que pede resposta chama-se **exercício**. Os demais passos são texto, imagem, vídeo e link. O rótulo no cartão é "Exercício".

Exemplo: "Matemática básica" é a trilha. "Atividade 2 de 5" é a segunda atividade. "Passo 3 de 4" é o terceiro passo dentro da atividade.

## Regras invioláveis

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

## Conflitos com o repositório atual

| Item | Situação no repo | Ação |
| --- | --- | --- |
| Histórico por atividade | A conversa é um rolo único por trilha (`PlayerPage.tsx`, mensagens por célula) | **CONFLITO de lógica**: dividir o histórico por atividade muda como as mensagens são carregadas e exibidas. Parar e avisar. |
| Lista de atividades no menu | `ChatLayout.tsx` só conhece trilhas e o total de passos (`fetchTrailStageTotals`) | **CONFLITO de dados**: precisa da lista de atividades (question) de cada trilha. Hoje o app não expõe isso. |
| Vocabulário | O app usa "etapa" para o que o banco chama de stage | Usar "passo" para stage e "atividade" para question. Só texto. |
| Entrada sem código da escola e campo Login | `LoginPage.tsx` envia telefone, código da escola e senha. O campo de telefone só aceita número | **CONFLITO de lógica e API**: tirar o código e aceitar telefone, e-mail ou ID da escola muda o login no servidor. Só o texto do rótulo ("Login") e do texto de apoio é visual. Parar e avisar. Ver decisão 9 em DECISOES.md. |
| Fundo claro | `styles/app.css` usa tema escuro (`--main #171c27`, body com gradientes escuros) | Trocar tokens do aluno para claros. Só CSS. |
| Menu "Minhas trilhas" e "Continuar aula" | `ChatLayout.tsx` monta o menu com esses itens | Ajustar o JSX do menu. A rota `/` continua como está. |
| Maria fora da trilha | A conversa existe só dentro de trilha (sidechat por célula) | **CONFLITO de lógica**: precisa de fluxo sem `trail_id`. Parar e avisar. |
| Barra "Pergunte à Maria" na tela inicial | Hoje não existe na tela inicial | **CONFLITO de lógica**: mesmo motivo acima. |
| Halo na primeira abertura de cada trilha | Não há controle de "primeira vez" | **CONFLITO de lógica**: precisa guardar a primeira abertura (localStorage ou dado do servidor). |
| Ordem por última aberta e limite de 3 | Não há registro de última abertura | **CONFLITO de lógica**: mesmo tipo de persistência. |
| Texto "Etapa" | Aparece em `ChatLayout.tsx` e `PlayerPage.tsx` | Trocar por "Passo". Só texto. Buscar `Etapa` em `src/`. |
| Tag "MARIA" no topo | `chat-topbar__maria` em `ChatLayout.tsx` | Remover o span. Só JSX. |
| Símbolo do Crias | `cria-frontend` não tem símbolo nem favicon | Adicionar o arquivo em `public/` e usar na tela inicial. Não usar no menu. |

## Orientação para o Cursor

Aplicar nesta ordem. Pular os itens marcados como CONFLITO até o aval.

1. **Tokens (CSS):** em `src/styles/app.css`, trocar as variáveis de `:root` para o tema claro: `--main` e `--composer` para `#fff` e `#faf8f0`, `--sidebar` para `#faf8f0`, `--ink` para `#001c0e`, `--accent` para `#00be85`, `--accent-ink` para `#fff`. Trocar também o `body` e o `.chat-main` por fundo branco. O esfumaçado da tela inicial usa os gradientes do protótipo (verde no canto superior esquerdo, amarelo no inferior direito).
2. **Texto:** trocar "Etapa" por "Passo" em todo `src/`.
3. **Topo:** remover a tag `chat-topbar__maria` em `ChatLayout.tsx`.
4. **Menu:** em `ChatLayout.tsx`, remover "Minhas trilhas" e "Continuar aula". Criar o grupo "Parceiro de estudos" com "Conversar com Maria" (link para a rota da Maria, a definir após o aval).
5. **Tela inicial (`TrailsPage.tsx`):** montar o layout do protótipo: fundo Horizonte, saudação, cards de 1 a 3 trilhas e barra de pergunta. Aplicar a regra 12.
6. **Player (`PlayerPage.tsx`):** Continuar dentro da barra de envio, sem balão. Halo na primeira abertura (depende do aval).
7. **Conflitos:** só depois do aval.

## Histórico de decisões

- Revisão 1: Continuar no lugar do Enviar, com halo na primeira abertura. Questão travada com texto próprio. Número de passo sobe a cada Continuar.
- Revisão 5: Horizonte vira o fundo padrão de todas as telas do aluno. Verde do brilho mais baixo e transparente. Símbolo da tela inicial sem pulsar. Respiro de 52px acima da barra.
- Revisão 4: entrada só com Login e Senha. Login aceita telefone, e-mail ou ID da escola. Entrada refeita. Foram testadas três propostas (A · Logo, B · Horizonte, C · Dois tempos). Escolhida a B · Horizonte.
- Revisão 3: hierarquia trilha > atividade > passo. Menu com seta abrir/recolher e lista de atividades. Histórico por atividade. Trilha Frações removida do exemplo; Matemática básica com 5 atividades e Leitura e interpretação com 3.
- Revisão 2b: esfumaçado centralizado na tela inicial. Símbolo removido do menu lateral.
- Revisão 2: Maria vira "Parceiro de estudos". Tela inicial em estilo Gemini, com até 3 trilhas e barra de pergunta.
