# Atualização do design system Crias

Este documento lista o que precisa mudar no design system "Crias" (projeto `e18a5f31…`) para ele ficar igual ao protótipo `Crias Aluno.dc.html`. Quando houver diferença, vale o protótipo.

O teste de aplicar o design system atual no protótipo foi descartado. O protótipo voltou exatamente ao estado anterior, e a cópia do teste ficou em `historico/`.

## 1. Vocabulário (prioridade máxima)

O design system usa "etapa" e "bloco". Os dois saem.

Hierarquia: **trilha > atividade > passo**.

| Banco | Interface | Exemplo |
| --- | --- | --- |
| tutor | parceiro de estudos | Maria |
| trail | trilha | Matemática básica |
| question | atividade | Atividade 2 de 5 |
| stage | passo | Passo 3 de 4 |

- Dentro de uma atividade, o passo que pede resposta se chama **exercício**. Os demais passos são texto, imagem, vídeo e link.
- Nunca usar "etapa" em interface.
- "Parceiro de estudos" vai no plural ("estudos"). O design system hoje usa "parceiro de estudo".
- Sem travessão (—) e sem "–" em textos de interface.
- Campos vazios mostram "Não informado".

**Trocar no design system:**
- No readme, a frase "números de etapa" vira "números de passo".
- Em "Escrita", a lista de termos fixos fica "escola, professor, aluno, trilha, atividade, passo, exercício, habilidade, parceiro de estudos".
- As classes `.etapas` e `.etapa-num` viram `.passos` e `.passo-num`.
- Em `components/chat.html`, o rótulo "Conteúdo" sai, e o rótulo do exercício fica "Exercício".

## 2. Fundos e tons

O branco é o fundo principal. O bege é só destaque. O creme `#fdfbed` sai como fundo de página.

| Papel | Valor | Onde |
| --- | --- | --- |
| Fundo de conteúdo | `#ffffff` | Toda a área à direita do menu, a entrada e o painel |
| Destaque 1 | `#fcfbf6` | Menu lateral, barra de mensagem, campos, balão do aluno, cards de trilha, indicadores do painel, cabeçalho de tabela |
| Destaque 2 | `#f7f5ec` | Bordas finas, divisória do menu, item ativo no menu, hover sobre o destaque 1, botão desativado |
| Destaque 3 | `#fefdfa` | Fundo do cartão de exercício |
| Trilho de barra | `#f1eee3` | Fundo da barra de progresso, bordas de campo |
| Borda média | `#efebdd` | Bordas de cards flutuantes e de botões secundários |
| Seleção | `#e6f8f1` | Alternativa marcada e etiqueta "Exercício" |

**Texto**

| Papel | Valor |
| --- | --- |
| Texto principal | `#001c0e` |
| Texto 2 | `#3d4d43` |
| Secundário | `#5b6b60` |
| Apoio e placeholder | `#6b7a70` |
| Link | `#00875e`, hover `#006b4a` |
| Texto verde sobre seleção | `#00744f` |
| Erro | fundo `#fdecea`, texto `#8a1c12` |

**Trocar no design system:** `--color-bg` passa a `#ffffff`. Entram os tokens `--color-highlight-1`, `--color-highlight-2` e `--color-highlight-3` com os valores acima. `--color-surface` e `--color-sheet` deixam de ser usados como fundo de página.

## 3. Ação principal

- Verde `#00be85` com **texto e ícone brancos**.
- Hover `#00a974`, pressionado `#00925f`.
- Vale para Continuar, Enviar, Entrar, setas de ação e botões de criar no painel.
- Avatar do usuário: verde escuro `#00593d` com letra branca.
- Maria: avatar e marca em amarelo `#ffd500` com letra escura.

**Trocar no design system:** `.btn-primary` usa `color: #fff`. O design system hoje usa texto escuro, e esse item foi testado e descartado.

## 4. Tipografia

| Uso | Fonte | Peso |
| --- | --- | --- |
| Títulos | Outfit | 600 (saudação da tela inicial e título da entrada em 400) |
| Texto corrido, campos e botões | Manrope | 400 a 700 |

**Trocar no design system:** Barlow sai e Manrope entra no texto. Os títulos ficam em Outfit 600, sem o 800 e sem o espaçamento negativo forte.

## 5. Formas

| Peça | Raio |
| --- | --- |
| Botões, etiquetas, barra de mensagem, botão Continuar | pílula (999px) |
| Campos | 12px (entrada 14px) |
| Cartões | 16px |
| Balão do aluno | 20px |
| Barra de mensagem | 28px |

**Trocar no design system:** `--radius-sm` 12px, `--radius-md` 16px, `--radius-lg` 28px. A regra "não arredonde cantos" sai.

## 6. Horizonte (animação de fundo)

O Horizonte é o fundo padrão de todas as telas do aluno: entrada, início, trilhas e Conversar com Maria. Ele fica na área de conteúdo, à direita do menu. O menu lateral não recebe o efeito. A ideia é um nascer do sol discreto: luz verde rente ao chão, amarelo acima e um arco fino que pulsa devagar.

Três camadas, todas centralizadas na horizontal (`left: 50%`, `translateX(-50%)`), `border-radius: 999px` e `pointer-events: none`. O contêiner usa `position: relative` e `overflow: hidden`.

**Camada 1 · Brilho**
- Círculo de 900 × 900px, com `bottom: -520px`.
- Fundo: `radial-gradient(circle, rgba(0,190,133,.10) 0%, rgba(0,190,133,.04) 14%, rgba(255,213,0,.05) 50%, rgba(255,255,255,0) 68%)`.
- `filter: blur(8px)`.
- Entrada: `crRise 2.6s cubic-bezier(.16,1,.3,1) both`.

**Camada 2 · Linha verde**
- Círculo de 460 × 460px, com `bottom: -360px`.
- Borda `1px solid rgba(0,190,133,.065)`, quase invisível.
- Entrada: `crRise 2.6s cubic-bezier(.16,1,.3,1) .2s both`.

**Camada 3 · Arco que pulsa**
- Círculo de 460 × 460px, com `bottom: -300px`.
- Borda `1px solid rgba(255,213,0,.34)`, com `opacity: 0` no início.
- Animação: `crHorizonRing 11s cubic-bezier(.33,0,.2,1) 2.8s infinite`.

**Keyframes**

```css
@keyframes crRise {
  0%   { opacity: 0; transform: translate(-50%, 80px); }
  100% { opacity: 1; transform: translate(-50%, 0); }
}
@keyframes crHorizonRing {
  0%   { opacity: 0;  transform: translate(-50%, 0) scale(1); }
  30%  { opacity: .5; }
  100% { opacity: 0;  transform: translate(-50%, 0) scale(1.18); }
}
@media (prefers-reduced-motion: reduce) {
  .horizonte * { animation: none !important; opacity: 1; }
}
```

**Regras do Horizonte**
- O verde fica baixo e bem transparente, para não brigar com o texto das respostas. O amarelo fica acima.
- A cor não inverte: o verde fica sempre embaixo e o amarelo em cima.
- Não usar linha verde forte. Ela já foi testada a 22% e conflitou.
- Uma animação de fundo por tela. Com o Horizonte ativo, o símbolo da tela inicial fica parado.
- Quem usa "reduzir movimento" vê o brilho e as linhas parados.

**Adicionar ao design system:**
- Uma classe `.horizonte` com as três camadas e os keyframes.
- Uma página `foundations/horizonte.html` com a demonstração.
- Uma linha na tabela de componentes do readme.

## 7. Outros movimentos

**Halo do Continuar**
- Na primeira abertura de cada trilha, até o aluno avançar pela primeira vez.
- Animação: `crHalo 2.2s ease-out 1.4s infinite`.
- `@keyframes crHalo { 0% { box-shadow: 0 0 0 0 rgba(0,190,133,.45) } 70% { box-shadow: 0 0 0 12px rgba(0,190,133,0) } 100% { box-shadow: 0 0 0 0 rgba(0,190,133,0) } }`
- Sem balão de texto sobre o botão.
- No hover, todo Continuar ativo, todo Enviar e o Entrar mostram o mesmo halo (`crHalo 2.2s ease-out infinite`), junto com o fundo `#00a974`.

**Foco da barra de mensagem**
- Ao clicar, a borda fica `#00be85`, com halo `0 0 0 3px rgba(0,190,133,.14)`.
- Vale também para campos, com halo de 4px a 12%.

**Símbolo**
- Na tela inicial, fica parado (64px).
- O "respirar" e o "pulsar" do design system atual ficam reservados. Não usar junto com o Horizonte.

## 8. Componentes que mudam

- **Balão do aluno:** fundo `#fcfbf6`, raio 20px, alinhado à direita. Sai o verde claro do design system.
- **Mensagem do parceiro de estudos:** sem balão, com o símbolo de 32px à esquerda e o rótulo com o nome da trilha ou "Maria".
- **Exercício:** bloco `#fefdfa`, raio 16px, com a etiqueta "Exercício" em `#e6f8f1` e texto `#00744f`. As alternativas ficam em branco com borda `#f7f5ec`. A marcada usa borda 2px `#00be85`, fundo `#e6f8f1` e letra branca no círculo verde.
- **Barra de progresso da trilha:** 4px, trilho `#f1eee3`, preenchimento `linear-gradient(90deg, #ffd500, #00be85)`.
- **Seta da trilha:** sempre verde `#00be85`, traço 2,6. Aponta para a direita quando fechada e para baixo quando aberta.

## 8b. Logotipo

- O wordmark padrão é `assets/crias-logo-dark-green.svg`, o de traço mais fino do design system.
- Ele substitui o PNG mais grosso que o protótipo usava. Vale para o menu lateral, a entrada e o painel.

## 9. Como aplicar

1. Atualizar `styles.css` com os tokens das seções 2 a 5.
2. Trocar os termos da seção 1 no readme e nas páginas.
3. Criar `.horizonte` e `foundations/horizonte.html` (seção 6).
4. Atualizar `components/chat.html` e `components/markers.html` (seção 8).
5. Conferir o resultado contra `Crias Aluno.dc.html`.
