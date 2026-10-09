# Crias · design system

Design system do Crias, **Tecnologia Educacional: inteligência da escola para o estudante**. A escola define as habilidades, o professor direciona, o aluno estuda conversando com o parceiro de estudos e os dados voltam para quem ensina. A IA nunca aparece como protagonista.

O visual é claro e calmo. O fundo é branco e o bege aparece só em destaques. O verde da marca fica na ação principal, com texto branco, e o amarelo é reservado para a Maria e para marcações pontuais. As peças têm cantos arredondados, e os botões são em pílula. Ao fundo das telas do aluno nasce o Horizonte, um sol discreto que sobe da base da tela.

Referência visual: protótipo `Crias Aluno.dc.html` do projeto [CRIAS] Front End. Quando houver diferença, vale o protótipo.

## Como usar

- Ligue `styles.css` em toda página e tire os valores das variáveis (`var(--color-*)`, `var(--font-*)`, `var(--space-*)`, `var(--radius-*)`).
- Use as classes da tabela de componentes em vez de criar outras.
- Logotipo e símbolo ficam em `assets/`. Use sempre os arquivos, sem redesenhar.
- O wordmark padrão é `assets/crias-logo-dark-green.svg`, o traço mais fino. Ele vale para o menu lateral, a entrada e o painel.

## Vocabulário

Hierarquia: **trilha > atividade > passo**.

| Banco | Interface | Exemplo |
| --- | --- | --- |
| tutor | parceiro de estudos | Maria |
| trail | trilha | Matemática básica |
| question | atividade | Atividade 2 de 5 |
| stage | passo | Passo 3 de 4 |

- Dentro de uma atividade, o passo que pede resposta se chama **exercício**. Os outros passos são texto, imagem, vídeo e link.
- Nunca usar "etapa" nem "bloco" na interface.
- "Parceiro de estudos" sempre no plural.
- Campo vazio: "Não informado".
- Português do Brasil, sem travessão (—) e sem "–".

## Cor

**Fundos.** O branco `--color-bg` é o fundo principal. O bege é só destaque:

| Token | Valor | Uso |
| --- | --- | --- |
| `--color-highlight-1` | #fcfbf6 | Menu lateral, campos, barra de mensagem, balão do aluno, cards de trilha, indicadores |
| `--color-highlight-2` | #f7f5ec | Bordas finas, item ativo, hover sobre destaque, botão desativado |
| `--color-highlight-3` | #fefdfa | Cartão de exercício |
| `--color-track` | #f1eee3 | Trilho da barra de progresso, borda de campo |
| `--color-border` | #efebdd | Card flutuante e botão secundário |
| `--color-selected` | #e6f8f1 | Alternativa marcada, etiqueta Exercício |

**Texto.** Principal `#001c0e`, texto 2 `#3d4d43`, secundário `#5b6b60` e apoio `#6b7a70`. O link é `#00875e`. O erro tem fundo `#fdecea` e texto `#8a1c12`, sempre com palavra.

**Marca.**
- Ação principal em verde `#00be85`, com **texto e ícone brancos**. Hover `#00a974`, pressionado `#00925f`.
- Avatar do usuário em verde escuro `#00593d`, com letra branca.
- Maria em amarelo `#ffd500`, com letra escura.
- Barra de progresso em degradê do amarelo para o verde.

## Tipografia

- **Outfit** nos títulos, peso 600. A saudação da tela inicial e o título da entrada usam peso 400.
- **Manrope** no texto, nos campos e nos botões, pesos 400 a 700.
- Escala: título 32, subtítulo 24, card 19, corpo 16, pequeno 14, apoio 12 e 13.

## Formas

| Peça | Raio |
| --- | --- |
| Botões e etiquetas | pílula |
| Campos | 12px (entrada 14px) |
| Cartões e exercício | 16px |
| Balão do aluno | 20px |
| Barra de mensagem | 28px |

## Movimento

**Horizonte (fundo padrão)**
- Aparece na entrada, no início, nas trilhas e em Conversar com Maria. Fica só na área de conteúdo, nunca no menu lateral.
- Tem três camadas:
  - **Brilho:** 900px, base em -520px, verde 10% no centro, amarelo 5% acima, blur de 8px.
  - **Linha verde:** 460px, base em -360px, 1px a 6,5%.
  - **Arco amarelo:** 460px, base em -300px, 1px a 34%. Cresce até 1,18x e some num ciclo de 11s.
- Brilho e linha sobem 80px em 2,6s ao abrir a tela.
- O verde fica sempre embaixo e o amarelo em cima. Linha verde forte não deve ser usada.
- Ver `foundations/horizonte.html`.

**Halo verde**
- Pulso de 2,2s no botão Continuar na primeira abertura de cada trilha (`.btn-halo`).
- Em todo botão principal no hover: Continuar, Enviar e Entrar.

**Foco**
- Campos e barra de mensagem ganham borda verde e halo suave ao receber o clique.

**Símbolo**
- Na tela inicial, fica parado. Uma animação de fundo por tela.

**Movimento reduzido**
- Com movimento reduzido, tudo fica parado.

## Componentes

| Classe | O que é |
| --- | --- |
| `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-sm`, `.btn-icon`, `.btn-halo` | Botões em pílula. O principal é verde com texto branco |
| `.tag`, `.tag-on`, `.tag-maria` | Etiquetas em pílula |
| `.card`, `.card-destaque`, `.indicador` | Cartões e números do painel |
| `.field`, `.input` | Campos |
| `.composer`, `.composer-dica` | Barra de mensagem com Continuar ou Enviar |
| `.conversa`, `.msg`, `.msg-avatar`, `.msg-avatar-maria`, `.msg-rotulo`, `.balao-aluno` | Conversa com o parceiro de estudos |
| `.exercicio`, `.alternativa` | Exercício dentro da atividade |
| `.progresso`, `.seta-trilha`, `.passo-num` | Trilha no menu e lista de atividades |
| `.avatar-usuario` | Avatar do aluno |
| `.horizonte` com `.hz-brilho`, `.hz-linha`, `.hz-arco` | Fundo Horizonte |

## Regras da conversa

- O parceiro de estudos fala sem balão, com o símbolo de 32px à esquerda. O aluno fala num balão bege à direita.
- O Continuar fica dentro da barra de mensagem, no lugar do Enviar. Ao digitar, vira Enviar. Ao apagar, volta Continuar.
- Durante o exercício, a barra fica travada com "Selecione uma alternativa e continue...". O Continuar só ativa com uma alternativa marcada.
- A conversa tem margem de 10% de cada lado e 52px de respiro até a barra.

## Não faça

- Não use creme como fundo de página.
- Não escreva em verde ou amarelo da marca sobre fundo claro. Para texto verde, use `#00875e` ou `#00744f`.
- Não use "etapa" nem "bloco".
- Não anime o logotipo.

## Arquivos

- `styles.css`: tokens e componentes.
- `readme.md`: este guia.
- `theme.json`: parâmetros do tema.
- `foundations/horizonte.html`: o Horizonte.
- `components/buttons.html`, `chat.html`, `markers.html`: componentes.
- `assets/`: logotipo e símbolo.
