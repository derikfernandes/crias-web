# Decisões do redesign do aluno (Crias)

Documento para o sócio. Explica o que já foi feito no protótipo e o que ainda precisa de decisão. Base do trabalho: repositório `thiagocrias/crias-gpt`, branch `design/interface`.

## Como ler este documento

- **Protótipo:** arquivo `Crias Aluno.dc.html`. Ele mostra como a tela deve ficar. Ainda não é código.
- **Regras:** `INTERFACE.md` tem as regras que valem para o código, numeradas.
- **Conflito:** item que exige mudança de lógica no app (não só visual). Esses itens esperam uma decisão antes de serem feitos.

## O que já foi feito (no protótipo)

**Identidade visual**
- Fundo branco. Bege só em destaques, menu, campos e balões.
- Verde `#00be85` para ação principal, com texto branco. Vale para Continuar, Enviar e Entrar.
- Títulos em Outfit, texto em Manrope. Botões em pílula.
- Símbolo do Crias na tela inicial. O menu lateral mostra só o wordmark.

**Vocabulário e hierarquia**
- Trilha contém atividades, e cada atividade contém etapas. Nomes no banco e na interface:
  - tutor: parceiro de estudos
  - trail: trilha
  - question: atividade
  - stage: etapa
- Matemática básica tem 5 atividades e Leitura e interpretação tem 3 (conteúdo ilustrativo).
- A trilha Frações saiu. Ela virou a atividade 2 de Matemática básica.

**Menu e progresso**
- Cada trilha mostra o nome, uma barra de progresso (degradê de amarelo para verde) e "Atividade 1 de 5".
- A seta verde à direita abre e recolhe a lista de atividades. Clicar no nome da trilha abre no ponto onde o aluno parou e já expande a lista.
- Clicar em outra atividade mostra o histórico dela, sempre na última mensagem. A barra de mensagem dá lugar a "Voltar para a atividade atual".
- Atividades que o aluno ainda não alcançou ficam desativadas.

**Conversa (trilha)**
- Continuar fica no lugar do botão Enviar. Aparece com o campo vazio. Ao digitar, vira Enviar.
- Quando há um exercício, o campo fica travado com "Selecione uma alternativa e continue...". Continuar só ativa depois de escolher uma alternativa.
- Na primeira abertura de cada trilha, o Continuar pulsa em verde para chamar atenção. Sem balão de texto.
- A palavra "Passo" saiu. O topo mostra "Atividade 2 de 5 · Etapa 3 de 3".
- Dentro de uma atividade, a etapa que pede resposta se chama "Exercício".
- Trilhas de exemplo com imagem, vídeo, exercício e link. O conteúdo é ilustrativo, não é o banco real.

**Parceiro de estudos (Maria)**
- A Maria deixou de ser só um recurso da trilha. Agora há uma conversa própria, acessível pelo menu, fora das trilhas.
- A tag "MARIA" no topo foi removida.

**Menu lateral**
- Dois grupos: **Parceiro de estudos** (Conversar com Maria) e **Trilhas** (lista das trilhas).
- "Minhas trilhas" e "Continuar aula" saíram do menu.

**Tela inicial**
- Fundo Horizonte, o mesmo da entrada. Símbolo do Crias parado no centro.
- Saudação que alterna a cada visita (cinco frases).
- Cards das trilhas.
- Barra "Pergunte à Maria…" logo abaixo dos cards.
- Cards:
  - Mesma estrutura do menu: nome com seta verde, barra de progresso e "Atividade X de Y".
  - 1 trilha: card centralizado. 2 ou 3 trilhas: dividem a largura.
  - Até 3 trilhas, na ordem da última aberta. Com mais de 3, aparece "Outras trilhas no menu ao lado".

**Horizonte (fundo de todas as telas do aluno)**
- Um brilho suave sobe da parte de baixo da tela, como um nascer do sol. Verde bem transparente perto da base, amarelo acima, uma linha verde quase invisível e um arco amarelo que pulsa devagar.
- Vale para entrada, início, trilhas e Conversar com Maria. O menu lateral fica de fora.
- O verde foi baixado e deixado mais transparente para não brigar com o texto das respostas.

**Painel da escola (PAINEL)**
- Menu, Instituições, Trilhas e Alunos adaptados ao mesmo visual.
- As demais telas aparecem com aviso de que ainda não foram adaptadas.

**Entrada (login)**
- O campo "Código da escola" saiu da tela de entrada.
- O campo "Telefone" virou "Login", e aceita DDD + telefone, e-mail ou ID da escola. O aluno entra com login e senha.
- Visual "Horizonte": sem título e sem logo no topo, o que resolve o espaço no celular. O wordmark fica no centro, sobre os campos, e ao fundo um brilho amarelo e verde sobe da parte de baixo da tela, como um nascer do sol. Foi escolhido entre três propostas.

## O que precisa de decisão

1. **Maria fora da trilha.** Hoje a conversa só existe dentro de uma trilha. Para funcionar fora, o app precisa de um fluxo de conversa sem trilha. *Decidir:* aprovar esse fluxo? Ele precisa de nova lógica no servidor.
2. **Barra "Pergunte à Maria" na tela inicial.** Depende do item 1.
3. **Halo na primeira abertura e ordem por última aberta.** Precisam guardar, por aluno, quais trilhas já foram abertas e quando. *Decidir:* guardar no navegador (localStorage), ou no servidor, junto com o aluno?
4. **Exercícios por atividade.** No protótipo, cada atividade tem um exercício no último etapa. *Decidir:* toda atividade termina com exercício, ou pode haver atividades sem exercício e com mais de um?
5. **Ilustrações.** As imagens são espaços reservados. *Decidir:* quem fornece as ilustrações finais, e em que formato?
6. **Histórico por atividade.** Hoje a conversa é um rolo único por trilha. No novo modelo ela é dividida por atividade. *Decidir:* aprovar essa mudança na forma de carregar e guardar as mensagens (afeta a lógica do player).
7. **Lista de atividades no app.** O app só conhece as trilhas e o total de etapas. Para mostrar as atividades no menu, ele precisa receber a lista de atividades (question) de cada trilha. *Decidir:* quem expõe esse dado e em qual formato.
8. **Pular atividades.** No protótipo, o aluno só abre atividades já alcançadas. *Decidir:* manter assim, ou permitir abrir qualquer atividade?
9. **Entrada sem código da escola.** O campo saiu da tela de entrada, e o assunto já está sendo tratado em paralelo. Falta formalizar. Hoje o login do aluno usa telefone, código da escola e senha. Sem o código, o servidor precisa identificar a escola só pelo telefone. Isso exige que o telefone seja único entre escolas, ou alguma outra regra para alunos com o mesmo telefone em mais de uma escola. Além disso, o campo Login passa a aceitar telefone, e-mail ou ID da escola, e o servidor precisa reconhecer os três. *Decidir:* aprovar a entrada com login e senha, quais formatos de login valem, e a regra para login repetido em mais de uma escola.
10. **Gemini como referência.** O visual do Gemini é escuro. O Crias segue claro, com o Horizonte como fundo de todas as telas do aluno. *Decidir:* manter assim?

## Próximos etapas

- Aprovar as decisões acima.
- Depois, o Cursor aplica as mudanças no código, na ordem da seção "Orientação para o Cursor" em `INTERFACE.md`.
- Os itens marcados como conflito só entram depois da decisão.

## Base v1.0 travada (antiga v6)

A v1.0 do aluno e do painel é a base de identidade visual. Itens que mudam o que foi decidido antes e precisam de aval antes de ir ao código:

- **Maria vira monitor.** Texto, menu ("Acompanhamento") e rótulos usam "monitor". Confirmar o nome com o sócio e se o vocabulário do banco (tutor) segue igual.
- **Painel dentro do menu do aluno.** Item "Painel / Ver seus dados de estudo" abre o painel. Depende de permissão: definir quem enxerga o item.
- **Tema claro como padrão** (antes escuro). O app atual usa escuro como padrão.
- **Malha 3D** como fundo da entrada e da home, no lugar do Horizonte. Conversas só com névoa.
- **Terceira trilha de exemplo** ("Ciências da natureza") existe só no protótipo.


## v1.1 (antiga v7, 13 e 14/10/2026)

- Menu lateral sempre aberto na web, inclusive dentro das trilhas.
- Largura única de 780px (a dos cards da home) para barra de mensagem e conversa; o texto ocupa a largura toda da barra.
- Alternativas sempre uma por linha, letra fixa no topo à esquerda.
- Topo e menu acompanham a atividade e a etapa visíveis ao rolar.
- Símbolo do Crias no carregamento inicial.
- Painel com a mesma identidade do aluno (cores, tema claro e escuro, menu, rodapé, fundo).
- Detalhes em INTERFACE.md, seção "Base v1.1".
- Seletor Aluno / Gestão acima do perfil para quem não é só aluno.
- Painel do aluno individual em formato de conversa, com filtro por trilha e barra do monitor embaixo.
- Vocabulário unificado: trilha, atividade, etapa, exercício e monitor em todo o aluno e o painel.
- Gestão reorganizada: perfis super admin e instituição, menu Início/Dados/Trilhas, gabarito dentro da trilha, cadastro da instituição no topo de Administração, Voltar sempre para a tela anterior.
- Gestão: telas Senhas dos alunos e Prompts (só Master) e checkbox Master em Permissões.
- Gestão: grupo do menu "Configurações" com Usuários (Senhas, Permissões) e Sistema (Prompts, API e documentação).
- Versões renomeadas: v6 vira v1.0 e v7 vira v1.1. Anteriores em `historico/`.
- Protótipo sem menu de opções: só o botão "Atualizar" (versão de teste). Fundo único e tela solta de Gabaritos removidos.


## v1.1 (15/10/2026)

- Início do Super admin: "+ Nova instituição" na mesma linha do filtro; filtro estendido até 16px do botão.
- Exemplos: toda instituição com 3 trilhas e dados completos.
- "Não informado" vira "N/A" em todo o Crias.
- Esmaecimento vale para qualquer texto ou rolagem que não caiba (horizontal ou vertical); reticências removidas da Gestão.
- Logo da Gestão passa a ser um SVG único, também no design system.

- v1.1 travada em 15/10/2026 após revisão geral (INTERFACE.md 1.1.26). Corrigidos: campos da Gestão em 16px e subtítulo de Dados sem "Painel". Próximas mudanças em v1.2.

## v1.2 (em andamento, 15/10/2026)

- Gestão no celular com os mesmos padrões do Aluno: viewport sem zoom, altura pela área visível, áreas seguras, margens de 16px, títulos de 24px, alvos de 44px, filtro do Início em duas linhas. Tweak "celular" na Gestão mostra o iPhone 17 ao lado. Ver INTERFACE.md 1.2.1.
- Personagem do monitor definido (INTERFACE.md 1.2.2): esfera azul clara com anel amarelo e olhos pretos; sequência carregando, pulo, parado e estático no histórico. Aplicação no Aluno pendente de aval.
- Personagem do monitor aplicado no Crias Aluno v1.2 e no design system. Símbolo do Crias na conversa ampliado para 32 px (22 px no celular), mesmo raio do monitor.
