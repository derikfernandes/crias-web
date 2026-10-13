# Crias · design system

Design system do Crias, **Tecnologia Educacional: inteligência da escola para o estudante**. A escola define as habilidades, o professor direciona, o aluno estuda conversando com o parceiro de estudo e os dados voltam para quem ensina. Toda peça deixa claro que quem está no comando é quem ensina; a IA nunca aparece como protagonista.

O visual é sóbrio e editorial: fundo creme, texto em verde muito escuro, peças retas com borda fina, o verde da marca no botão principal e o amarelo em pequenas doses. Por cima das peças retas aparecem círculos, a forma do símbolo. Quadrados marcam tópicos, porque cada tópico é um bloco de conteúdo.

## Como usar

- Ligue a folha de estilo em toda página: `<link rel="stylesheet" href="styles.css">` (ajuste o caminho). Tire cor, fonte, espaço, raio e sombra das variáveis (`var(--color-*)`, `var(--font-*)`, `var(--space-*)`, `var(--radius-*)`, `var(--shadow-*)`). Não escreva hex, nome de fonte ou px que os tokens já têm.
- Construa com as classes abaixo em vez de inventar outras. As páginas de `components/` e `foundations/` são HTML simples: veja o código e copie.
- Logotipo e símbolo estão em `assets/`. Use os arquivos, nunca redesenhe.

## Cor

Fundo `--color-bg` #fdfbed (creme), superfície `--color-surface` #f3f1e2, cartões em `--color-sheet` #fffef8, texto `--color-text` #072014 e texto secundário `--color-muted` #4c594e. O verde da marca `--color-accent` #00be85 vai no botão principal, nos círculos de conteúdo, selos e áreas grandes; o amarelo `--color-accent-2` #ffd500 vai em exercícios, números de etapa e marcações, sempre em pequenas doses.

O verde e o amarelo nunca são texto sobre o creme (2,3:1 e 1,4:1). Texto sobre eles é sempre `--color-text`. Para texto verde, links e sobretítulos, use `--color-accent-ink` #006743 (6,7:1). Erro em `--color-error` #9a2737, sempre com palavra ou ícone.

As cores de apoio do manual (`--tropical-breeze`, `--candy-pink`, `--butterfly`, `--solitary-star`, `--good-gray`) ficam fora da interface: só ilustração, gráficos com muitas categorias e a barra da marca. Cada papel tem rampa de 100 a 900 em OKLCH (`--color-neutral-*`, `--color-accent-*`, `--color-accent-2-*`) para fundos suaves, hover e estados pressionados.

## Tipografia

**Outfit** nos títulos (800 no display, 700 nos demais, espaçamento negativo), números de impacto, sobretítulos e botões. **Barlow** no texto corrido, etiquetas e legendas. Escala: display 56/60, número 60/60, título 1 44/48, título 2 24/28, sobretítulo 13/20 em caixa alta com 0,18em, abertura 20/30, corpo 16/24, pequeno 14/21. Caixa alta só no sobretítulo. A assinatura usa Manrope 600.

## Formas

Três formas com papéis fixos:

- **Retângulo** para as peças: botões, cartões, etiquetas, campos e fotos. Cantos retos (`--radius-md` é 0) e borda de 1 px em `--color-border`.
- **Círculo** como elemento gráfico: o símbolo, a trilha e composições por cima das peças retas (`--radius-full`).
- **Quadrado** como marcador de tópico: quadradinho verde antes do sobretítulo e nos itens de lista, número de etapa dentro de quadrado amarelo.

Sombra só para o que flutua (`--shadow-lg`, longa e suave). Cartões comuns usam só borda.

## Componentes

| Classe | O que é | Onde ver |
| --- | --- | --- |
| `.btn` com `.btn-primary`, `.btn-secondary`, `.btn-dark`, `.btn-sm` | Botões. O principal é verde com texto escuro | components/buttons.html |
| `.tag`, `.tag-sm`, `.tag-selected`, `.selo` | Etiquetas com borda; selecionada em fundo escuro; selo verde | components/buttons.html |
| `.card`, `.card-flutuante`, `.card-kicker`, `.card-title`, `.card-body` | Cartões em folha com borda fina | components/cards.html |
| `.indicador` com `-rotulo`, `-valor`, `-legenda` | Números do painel | components/cards.html |
| `.field`, `.input` | Campos de formulário | components/cards.html |
| `.sobretitulo`, `.lista`, `.etapas`, `.etapa-num` | Marcadores de tópico em quadrado | components/markers.html |
| `.trilha` com `i.conteudo`, `i.exercicio`, `i.atual` | Progresso da atividade em círculos | components/markers.html |
| `.balao`, `.balao-aluno`, `.balao-exercicio`, `.balao-rotulo` | Conversa com o parceiro de estudo | components/chat.html |
| `.assinatura` | Logotipo, barra verde e "Tecnologia Educacional" | foundations/brand.html |
| `.barra-marca` | Degradê da paleta no rodapé de slides e capas | foundations/brand.html |
| `.simbolo` com `.simbolo-respirar`, `.simbolo-pulsar` | Símbolo animado | foundations/symbol.html |

## Símbolo em movimento

O símbolo respira em repouso (ciclo de 4 s) e pulsa enquanto o parceiro de estudo prepara a resposta (1,4 s, com o anel se abrindo e sumindo). Fica estático com movimento reduzido, na impressão e abaixo de 32 px. Uma animação por tela; nunca anime o logotipo.

## Escrita

Frases diretas e afirmativas que dizem quem faz cada coisa ("A escola define. O professor direciona."). Sem travessões e sem clichês. Mesmo termo para a mesma coisa: escola, professor, aluno, trilha, atividade, bloco, habilidade, parceiro de estudo.

## Faça

- Deixe o creme dominar; verde no botão e nos blocos de conteúdo, amarelo pontual.
- Use círculos por cima de peças retas e quadrados para marcar tópicos.
- Coloque a barra da marca no rodapé de slides e capas.

## Não faça

- Não arredonde cantos de botões, cartões ou etiquetas.
- Não use cubos.
- Não escreva em verde ou amarelo da marca sobre fundo claro.
- Não use azul, rosa ou verde claro na interface.

## Arquivos

- `styles.css`: tokens e camada de componentes. Ligue em toda página.
- `readme.md`: este guia.
- `theme.json`: parâmetros do tema.
- `thumbnail.html`: capa do sistema.
- `foundations/color.html`, `type.html`, `layout.html`, `brand.html`, `symbol.html`: cor, tipografia, espaço e formas, marca e símbolo.
- `components/buttons.html`, `cards.html`, `markers.html`, `chat.html`: componentes.
- `assets/`: logotipo em Dark Green, Tech Green e branco, e o símbolo.

Fonte de verdade completa, com o guia de decisões: o artifact [CRIAS] Design System no claude.ai.
