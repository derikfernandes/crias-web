# Claude Code: entrada nova e carregamento do Crias (v1.1)

Atualização pequena da v1.1. Copie o conteúdo desta pasta por cima da raiz do repositório `thiagocrias/crias-web` (branch `main`) e cole no Claude Code o texto abaixo da linha.

## O que vem no pacote

| Caminho | O que é |
| --- | --- |
| `CLAUDE.md` | Regras do projeto (v1.1 fechada em 16/10/2026) |
| `frontend/crias-aluno/design/INTERFACE.md` | Regras. Novas: **1.1.37** (entrada) e **1.1.38** (carregamento) |
| `frontend/crias-aluno/design/DECISOES.md` | Registro das decisões |
| `frontend/crias-aluno/design/prototipo/Crias Aluno.dc.html` e `Crias Gestao.dc.html` | Protótipos atualizados (abra `#login` no Aluno para ver a entrada) |
| `frontend/crias-aluno/design/prototipo/Crias Aluno offline.html` e `Crias Gestao offline.html` | Os mesmos protótipos em arquivo único, sem internet |
| `frontend/crias-aluno/public/` | `crias-logo-site.svg`, `crias-logo-site-branco.svg`, `crias-symbol-192.png` |
| `frontend/crias-gestao/public/` | `crias-symbol-192.png` |

---

Aplique duas mudanças visuais da v1.1 nos apps `frontend/crias-aluno` e `frontend/crias-gestao`. Só camada visual: não mude lógica de login, API, estado nem rotas.

**Fonte de verdade:** `frontend/crias-aluno/design/INTERFACE.md`, regras 1.1.37 e 1.1.38, e o protótipo `frontend/crias-aluno/design/prototipo/Crias Aluno.dc.html#login` (ou a versão offline). Regras gerais em `CLAUDE.md`.

**1. Página de entrada (Crias Aluno, regra 1.1.37)**
- Cabeçalho do site crias.org fixo no topo: 64px, conteúdo com largura máxima de 1240px e margem lateral `clamp(20px,5vw,40px)`, linha de 1px embaixo, cantos retos. Fundo na cor do menu lateral: `#fdfcf9` no claro, `#0a1711` no escuro.
- Logo à esquerda (`/crias-logo-site.svg`; no escuro `/crias-logo-site-branco.svg`), 25px de altura, dentro de `<a href="https://www.crias.org">` na mesma aba (sem `target="_blank"`). Troque o arquivo pelo `src` conforme o tema, nunca por `content: url()` no CSS.
- À direita só o botão de trocar tema (40×40, borda 1px, cantos retos, ícone sol no claro e lua no escuro), ligado ao tema que o app já usa. Sem "Agendar conversa" e sem "Entrar".
- Acima da caixa de login só o símbolo do Crias (72px) pulsando, com o mesmo componente do carregamento (item 2). Tire o wordmark de cima da caixa.
- Rodapé do site: LinkedIn (https://www.linkedin.com/company/criasorg/) e Instagram (https://www.instagram.com/criasorg), em botões 40×40 com borda, à esquerda; "© Crias Tecnologia LTDA · 48.188.712/0001-02" à direita (Barlow 13px; no celular até 560px, alinhado à esquerda). Fundo branco no claro (preto no escuro), linha de 1px em cima. Links externos do rodapé abrem em nova aba.
- A malha 3D fica só entre o cabeçalho e o rodapé. Caixa de login, campos, botão Entrar e textos não mudam.
- Cores do cabeçalho e do rodapé: copie as variáveis de texto e linha do protótipo (`--s-ink`, `--s-ink2`, `--s-muted`, `--s-line`, `--s-line2`, claro e escuro).
- Fonte Barlow 400/500 entra junto do Outfit e do Manrope no carregamento das fontes.

**2. Carregamento com o símbolo (Aluno e Gestão, regra 1.1.38)**
- Problema: no primeiro instante aparecia só o brilho (esfumaçado) e o símbolo entrava depois, porque `crias-symbol.png` tem 1000×1000 e 443 KB.
- Use `/crias-symbol-192.png` em todo carregamento com o símbolo: abertura de cada app, troca pelo seletor Aluno/Gestão (que abre o outro app), estado carregando das páginas, "Tentar de novo" na Gestão e o símbolo da entrada.
- Adicione `<link rel="preload" as="image" href="/crias-symbol-192.png">` no `index.html` dos dois apps (no Aluno também os dois logos do site).
- Se houver tela de carregamento antes do React montar (no `index.html`), coloque o símbolo nela também, para não piscar entre o HTML e o app.
- O brilho só aparece depois que a imagem carregou (estado ou classe no `onLoad` da `<img>`; considere `img.complete` para cache).
- Animação e tempos conforme 1.1.38 (2,4 s; mínimo de 1,1 s na tela na abertura; saída em 0,4 s; parado com movimento reduzido).
- Procure no código todos os usos de `crias-symbol.png` em carregamentos e troque. Os usos fora de carregamento (avatar das mensagens da trilha) podem continuar como estão.

**Entrega**
- Commits pequenos, mensagem em português.
- Ao final, gere `frontend/crias-aluno/design/RELATORIO-v1.1-entrada.md` com o que foi aplicado, os arquivos alterados e as diferenças que ficaram em relação ao protótipo.
- Não apague arquivos de `design/`.
