# Interface Crias: regras e orientações

Regras de interface do Crias Aluno e do Crias Educação (antes Crias Gestão). Para o pacote 1.1.1.b, a seção "Pacote 1.1.1.b: regras consolidadas" é a fonte única. As seções seguintes ficam como histórico e detalhe.

## Versões

| Versão | Arquivos no projeto | Situação |
| --- | --- | --- |
| **1.1.1.b (atual, 25/10/2026)** | `Crias Aluno v1.1.1b.dc.html`, `Crias Gestao v1.1.1b.dc.html` | Pacote de melhorias, exportado sozinho. O Claude Code junta com o 1.1.1.a para formar a v1.1.1 |
| 1.1.1.a | (correções, ver "Correções v1.1.1.a") | Aplicado sobre a v1.1 |
| v1.1 (fechada em 16/10/2026) | `Crias Aluno v1.1.dc.html`, `Crias Gestao v1.1.dc.html` | Base oficial, intacta |
| v1.0 (travada) | `Crias Aluno v1.0.dc.html`, `Crias Painel v1.0.dc.html` | Base anterior |
| Histórico | pasta `historico/` | Versões e telas antigas |

No repositório os arquivos não levam o sufixo de versão (`Crias Aluno.dc.html`, `Crias Gestao.dc.html`). O arquivo da Educação continua com o nome `Crias Gestao` e a pasta do app continua `frontend/crias-gestao`; só o nome exibido e o logo mudaram.

## Como aplicar este pacote

O pacote (`export/repo/`) espelha a raiz do repositório `thiagocrias/crias-web`, branch `main`. Copie por cima da raiz e faça o commit. O passo a passo para o Claude Code está em `PROMPT-CLAUDE-CODE.md`.

| Caminho no pacote | O que é |
| --- | --- |
| `CLAUDE.md` | Regras do projeto para o Claude Code |
| `PROMPT-CLAUDE-CODE.md` | Texto para colar no Claude Code |
| `frontend/crias-aluno/design/INTERFACE.md` | Este arquivo |
| `frontend/crias-aluno/design/LEIA-ME.md`, `DECISOES.md` | Guia da pasta e decisões |
| `frontend/crias-aluno/design/prototipo/Crias Aluno.dc.html`, `Crias Gestao.dc.html` | Protótipos 1.1.1.b (precisam de `support.js`, `crias-monitor.js` e `assets/` na mesma pasta) |
| `frontend/crias-aluno/design/prototipo/* offline.html` | Os mesmos protótipos em arquivo único, sem internet |
| `frontend/crias-aluno/design/design-system/` | Tokens, guia e logotipos (inclui `crias-logo-educacao.svg` e `-branco`) |

Ao subir, apague do repositório `prototipo/assets/crias-logo-gestao.svg` e `crias-logo-gestao-branco.svg` (substituídos pelos arquivos `crias-logo-educacao`).

## Pacote 1.1.1.b: regras consolidadas (leia primeiro)

Vale sobre todas as seções abaixo onde houver diferença. Cada regra aqui está aplicada nos protótipos 1.1.1.b; quando o protótipo e o texto divergirem, avise antes de escolher.

### A. Identidade

- **Nomes:** Crias Aluno e Crias Educação. Logo da Educação: "Crias | Educação", arquivo `crias-logo-educacao.svg` (claro) e `crias-logo-educacao-branco.svg` (escuro), 150×22 px. Nunca texto no lugar do logo.
- **Cores:** ação principal verde `#00be85` com texto e ícone brancos (hover `#00a974`, pressionado `#00925f`). Texto verde sobre fundo claro: `--v-gink` (`#00744f`). Erro: texto `--v-err`, fundo `--v-errSoft`, contorno de ação destrutiva `#d9534a`. Amarelo `#ffd500` só no botão neutro dos pop-ups, na barra de progresso e em marcações pontuais. Bege só em destaques, campos e balões.
- **Tipografia:** títulos em Outfit 600; texto, campos e botões em Manrope. Títulos de página 28px (24px no celular); títulos de cartão 19px; subtítulos de cartão 16px.
- **Cantos:** campos 12px, cartões 16px, pop-ups 20px, botões e etiquetas em pílula.
- **Texto:** português do Brasil, sem travessão. "Etapa", nunca "passo" nem "bloco". Dado ausente: "N/A", exceto nos resumos recolhidos da Nova trilha, onde campo vazio fica em branco. Texto que não cabe esmaece no fim (sem reticências).

### B. Componentes padrão

**Botões (Educação, 36px, 13px, pílula)**

| Tipo | Visual | Onde |
| --- | --- | --- |
| Principal | Verde sólido, texto branco, 700 | Salvar, Criar trilha, + Nova instituição, + Adicionar aluno, + Atividade |
| Secundário | Branco, contorno bege `--v-line` 1px, texto `--v-ink`, 600 | Cancelar, Anterior, Próxima, Baixar planilha, Carregar planilha |
| Abrir / navegação de linha | Branco, contorno verde 1.5px, texto `--v-ink`, 700 | Abrir, Dados / Trilhas / Alunos no cartão da instituição, Gerar / Salvar senha |
| Destrutivo de linha | Branco, contorno `#d9534a` 1.5px, texto `--v-err`, 700 | Excluir, Desvincular |
| Editar no título | Lápis 18px, sem caixa; com texto "Editar" em verde 700 quando for o único acesso à edição | Cadastro da trilha, atividade, Usuários, Permissões, blocos recolhidos da Nova trilha |
| Contador − / + | Sempre redondo 36px, contorno bege `--v-line`, fundo branco, sinal 18px `--v-ink` (nunca verde) | Número de conteúdos, exercícios, alternativas e atividades |
| Seta de recolher | Redonda, contorno bege, fundo branco, seta `--v-t2`; 34px nos painéis, 26 a 28px nas linhas | Painéis de ação em massa, Adicionar com IA, linhas de atividade, Menor/Maior acerto |

Botão principal bloqueado: fundo `--v-soft2`, texto `--v-t3`, sem halo; libera ao editar e volta a bloquear depois de salvo.

No Crias Aluno os botões seguem o tamanho de toque do app: 46px nas ações da página, 54px na entrada, 44px nos pop-ups.

**Voltar:** único em toda a Educação, sempre no topo à esquerda da área de conteúdo, na linha do filtro de instituições. Manrope 12px, 400 (sem negrito), cinza `--v-t3`, seta de 14px com traço 1.8; hover `--v-t2`. Volta para a tela anterior (histórico). No Aluno, o Voltar das telas de entrada segue o mesmo desenho (13px).

**Cabeçalho fixo e esmaecimento:** todo conteúdo começa 36px abaixo do subtítulo. Parado no topo, não há esmaecimento. Ao rolar, a faixa abaixo do cabeçalho cresce até 72px (metade cor sólida do fundo, metade degradê). A mesma regra vale no Painel do aluno, abaixo dos filtros por trilha.

**Abas segmentadas:** trilho `--v-soft`, aba marcada branca com sombra leve, 32px de altura. Trocar as abas Alunos / Exercícios de Dados nunca move a tela. **Toda página, aba ou etapa aberta começa do topo**, sem exceção (inclusive Prévia → Adicionar alunos na Nova trilha).

**Tabelas:** linha de títulos com a altura do texto (inclusive no celular); nome ocupa o espaço livre; IDs e ações à direita; rolagem horizontal esmaece na borda com conteúdo.

### C. Confirmações

Há três padrões. Nenhum outro.

**1. Pop-up de confirmação** (fundo da página esmaecido e desfocado; cartão 420px, cantos 20px, 24px de respiro; título Outfit 22px; texto 15px; dois botões de 38px dividindo a largura).

| Situação | Título | Texto | Botões (neutro / ação) |
| --- | --- | --- | --- |
| Salvar edição no topo | Tem certeza que deseja salvar? | Essa ação não pode ser desfeita. | Continuar editando / Salvar |
| Cancelar edição no topo | Tem certeza que deseja cancelar a edição? | Essa ação não pode ser desfeita. | Continuar editando / Cancelar edição (destrutivo) |
| Sair com alteração não salva | Tem certeza que deseja sair? | | Continuar editando / Salvar; abaixo, Sair sem salvar (destrutivo, largura total) |
| Alterar cadastro | Tem certeza que deseja alterar o cadastro? | Essa ação não pode ser desfeita. | Continuar editando / Alterar |
| Desativar trilha | Tem certeza que deseja desativar a trilha? | Os alunos deixam de ver a trilha até ela ser ativada de novo. Conteúdo, gabarito e progresso continuam salvos. | Cancelar / Desativar trilha (destrutivo) |
| Senhas: gerar | Tem certeza que deseja gerar nova senha para (nome)? / gerar senhas para N alunos sem senha? | Consequência em uma frase | Cancelar / Gerar nova senha ou Gerar senhas |
| Sair da conta (Aluno e Educação) | Tem certeza que deseja sair da conta? | Aluno: "Seu progresso fica salvo." Educação: "Suas alterações salvas continuam guardadas." | Cancelar / Sair |

Cores dos botões do pop-up: **neutro** branco com contorno amarelo `#ffd500` 1.5px; **ação** verde sólido com texto branco; **destrutivo** branco com contorno `#d9534a` e texto vermelho.

**2. Exclusão com DELETAR** (mesmo cartão): título "Tem certeza que deseja excluir (o quê)?", texto "Essa ação não pode ser desfeita.", caixa vermelho-claro com "Envie DELETAR para excluir." e o campo. Botões: Cancelar (neutro, amarelo) e Excluir em vermelho sólido, que só ativa com DELETAR digitado (sem diferença de maiúsculas). Vale para excluir trilha, instituição, aluno, usuário e atividade.

**3. Confirmação em linha** (ações em massa): faixa bege logo abaixo do painel, com o título em negrito e a contagem do que vai acontecer em uma frase ("N alunos serão…, M ficam como estão."). Botões de 36px: Cancelar (secundário) e a ação em verde claro com contorno verde vivo (Cadastrar, Confirmar, Alterar senhas) ou, para remover, vermelho claro com contorno vermelho (Remover). Depois de aplicar: mensagem "Planilha aplicada: …" com o resultado.

**Sem confirmação:** ativar a trilha (o switch liga direto; só desativar confirma); navegar entre abas sem alteração pendente; voltar da Prévia para a Configuração na Nova trilha; salvar cada atividade no botão Salvar da própria atividade.

### D. Ações em massa (planilhas)

Regras comuns: painel recolhível com título, seta bege e uma linha de orientação; sequência sempre **Baixar planilha (modelo ou base) → Carregar planilha → botão da ação → confirmação em linha com contagem → "Planilha aplicada: …"**. Importar sempre adiciona (nunca apaga o que não está na planilha). Só as colunas indicadas são lidas; as demais são ignoradas.

| Onde | Ação | Planilha | Colunas lidas | Confirmação |
| --- | --- | --- | --- | --- |
| Alunos / Instituição | Cadastrar alunos em massa | Modelo (ID da instituição já vem preenchido) | Nome, Telefone | "Cadastrar alunos em massa?" N serão cadastrados; telefones já cadastrados ficam de fora |
| Alunos | Editar alunos em massa | Base com os dados atuais | Campos preenchidos; em branco não muda | Confirmação em linha com contagem |
| Alunos / Instituição | Remover alunos em massa | Base: ID Instituição, ID Aluno, Nome, Telefone, Remover (sim / não) | Remover | "Remover alunos em massa?" (botão vermelho claro) |
| Trilha > Alunos | Ativar ou inativar em massa | Base da trilha | Só a coluna "ativo" | "Ativar ou inativar em massa?" N ativados, M inativados, K ficam como estão |
| Trilha > Conteúdo | Adicionar atividades em massa | Modelo de atividades | Colunas do modelo | Adicionar atividades |
| Trilha > Gabarito | Alterar gabarito em massa | Base: ID Trilha, Trilha, Atividade, Exercício, Gabarito, Anular (sim / não) | Só "gabarito" e "anular" | "Alterar gabarito em massa?" N alterados, M anulados, K ficam como estão |
| Senhas | Alterar senhas em massa | Base com os alunos | Só senhas preenchidas | "Alterar senhas em massa?" + "Essa ação não pode ser desfeita." |
| Usuários | Adicionar / Remover usuários em massa | Modelo / base, com a seleção de instituição no formato do botão "Baixar planilha modelo" | Colunas do modelo | Confirmação em linha com contagem |

Vocabulário: sempre "em massa" (nunca "em lote"); alunos são **ativados ou inativados** na trilha; a trilha é **ativada ou desativada**.

### E. Salvar, cancelar e sair

- Qualquer edição de página mostra **Cancelar** e **Salvar** no topo, na linha do título. Salvar pede o pop-up "Tem certeza que deseja salvar?"; Cancelar pede "Tem certeza que deseja cancelar a edição?".
- Salvamentos intermediários (cada atividade) não pedem pop-up; o Salvar da atividade começa bege e libera ao editar.
- Sair da página (menu, Voltar, outra aba) com alteração pendente abre "Tem certeza que deseja sair?".
- Usuários e Permissões: só edita depois de "Editar" (lápis com texto, ao lado do título). Super admin edita a seleção de menus dos perfis direto; Instituição (Admin) só visualiza.
- Cadastro (Educação e Aluno, qualquer perfil): nome obrigatório e e-mail ou telefone; sem os dois, "Informe o nome e o e-mail ou o telefone."

### F. Educação, por página

- **Topo:** o logo começa alinhado ao Voltar e ao conteúdo da página (mesma margem esquerda); o menu acompanha. Logo, menu (Início, Dados, Trilhas, Alunos, Configurações), filtro de instituições (Super admin) ou nome da escola (Instituição), tema, avatar e sair. Abaixo de 860px o filtro desce para a linha do Voltar.
- **Configurações:** Usuários (Senhas, Usuários) e Sistema (Prompts, API e documentação). Senhas e Prompts só para Master.
- **Dados:** filtros fixos em uma linha, divididos em duas colunas: Filtrar trilhas e Pesquisar nome ou telefone do aluno. Cartões: Conclusão das atividades (com "Filtro por % de conclusão" no espaço livre abaixo das barras, encostado na base do cartão; a linha "Até" fica alinhada à linha "Concluiu" de Situação dos alunos; o filtro vale para a página toda), Situação dos alunos, Uso do monitor, Alunos por atividade concluída, **Desempenho** (Menor acerto e Maior acerto), tabela Alunos / Exercícios.
- **Dados > Alunos:** exportação com os seletores **Atividades** ("Atividade N - nome") e **Etapas** ("Atividade N · Etapa K - nome"), e colunas "Atividades liberadas", "Atividades feitas", "% conclusão (atividades)", "Etapas liberadas", "Etapas feitas", "% conclusão (etapas)". Não existem mais "aulas" nem "tópicos".
- **Dados, abas Alunos / Exercícios:** trocar de aba só troca a tabela; todos os cartões acima (resumo, Conclusão das atividades, Situação dos alunos, Uso do monitor, Alunos por atividade concluída, Desempenho) ficam iguais.
- **Dados > Exercícios:** clicar em qualquer ponto da linha abre ou fecha o enunciado logo abaixo. O nome da trilha não abre outra página.
- **Alunos (tabela):** colunas Nome, ID Aluno, Trilha atual, Atividade, Etapa, **Status** (Não iniciada, Em andamento, Concluída), Telefone, Escolaridade, Nível pedagógico, Criado em, Atualizado em, Ativo.
- **Trilha aberta:** abas Configuração, Conteúdo, Alunos, Gabarito à esquerda, 36px abaixo do subtítulo; Trilha ativa à direita na mesma linha. Em Conteúdo: acima das atividades, o rótulo **NOVAS ATIVIDADES** (mesmo padrão de "ATIVIDADES") e, numa linha, dois painéis recolhíveis com seta bege, nesta ordem: **Adicionar atividades em massa** e **Adicionar atividades com Inteligência Artificial** (com "Gerar prévia" à esquerda da seta, bloqueado até preencher Habilidades / Conteúdos). Recolher não apaga o que foi preenchido; ao expandir, volta como estava. Na coluna de atividades fica só "+ Atividade" (verde), alinhado à direita.
- **Trilha nova nasce ativa** (switch ligado), na criação e depois de salva. Ativar não pede confirmação; desativar pede.
- **Nova trilha:** etapas 1 Configuração, 2 Prévia, 3 Adicionar alunos (opcional). Topo: Cancelar e Criar trilha → Cancelar e Continuar → Cancelar e Salvar trilha. Configuração em três blocos (Cadastro, Estrutura, Criar com IA) com índice lateral na web; sem índice no celular. Recolhimento pela rolagem: um bloco recolhe quando a pessoa passou por ele inteiro e ele saiu da tela, tendo a linha que separa os blocos como marco; Criar com IA também recolhe ao sair inteiro pela base. Bloco recolhido mostra o resumo e o lápis colado ao título. No resumo de Criar com IA, cada item é uma linha só que esmaece no fim (Habilidades; Orientações com as tags depois, separadas por vírgula; Arquivos separados por vírgula), sem caixa. Sem texto de orientação abaixo do índice lateral.
- **Prévia (Nova trilha):** no topo, a Configuração exatamente como os blocos recolhidos da etapa 1 (mesmos títulos 01/02/03 e mesmos resumos), em três colunas iguais: Cadastro, Estrutura e Criar com IA, com linha fina abaixo. Em telas menores, duas colunas; no celular, uma. Depois, as atividades **idênticas à aba Conteúdo** da trilha criada (coluna de atividades com a mesma largura, atividade aberta e "Como o aluno vê"); a única diferença é que os botões "+ Atividade", "+ Adicionar em massa" e "+ Criar com IA" não aparecem. Sem Trilha ativa.
- **Perfil:** Cadastro à esquerda; Suporte numa coluna à direita (desce no celular).

### G. Aluno, por página

- **Menu:** Acompanhamento (Painel, "Ver seus dados de estudo"; Monitoria, "Conversar com seu monitor") e Trilhas.
- **Painel:** dashboard com filtro por trilha. Progresso, Desempenho (com Mais erros e Mais acertos no formato de Menor/Maior acerto da Educação) e Uso do monitor, cada um numa linha inteira. Barra do monitor embaixo: enviar leva à Monitoria e a pergunta entra lá como mensagem do aluno, com o carregamento no topo e a resposta abaixo.
- **Trilha:** o carregamento aparece uma vez e some quando o conteúdo aparece, no mesmo instante; atividades anteriores só carregam quando o aluno rola para cima.

### H. Celular (Educação)

- Voltar e filtro/nome da instituição sempre abaixo do botão de menu.
- Dados: cartões um abaixo do outro; gráfico de barras rola dentro do cartão.
- Trilha aberta: Salvar na linha do título; Trilha ativa; as quatro abas numa linha; os dois painéis de adicionar um abaixo do outro; "+ Atividade" à direita; lista de atividades na largura útil.
- Nova trilha: sem índice lateral; "Como o aluno vê" centralizado.
- Toques de 44px, exceto as setas de ordenação das tabelas.

### I. Pontos para validação

1. **Pedidos de 25/10 ainda não aplicados** (aguardam nova rodada): botão Excluir ao lado de "Aluno ativo"; trilha que já nasce ativa e configuração só para visualização depois de criada (exceto Cadastro); setas de recolher nos blocos abertos da Configuração; novo texto do pop-up de criar trilha ("Tem certeza que deseja criar a trilha? A configuração de estrutura não poderá ser alterada depois." / Continuar editando / Salvar); "Criar atividades" e prévia com atividades recolhidas ao criar com IA numa trilha existente; Editar ao lado do título da tabela em Usuários.
2. **Excluir em Usuários:** já pede DELETAR, mas o botão só fica ativo depois de "Editar". Liberar sem o modo de edição?

## Histórico do pacote 1.1.1.b

As entradas abaixo registram a ordem em que as decisões foram tomadas. Onde divergirem da seção consolidada, vale a consolidada.

## Melhorias v1.1.1.b (em andamento, desde 20/10/2026)

Pacote de melhorias no Crias Aluno e no Crias Gestão. Junto com o 1.1.1.a, forma a v1.1.1. Itens numerados como 1.1.1.b.N.

**1.1.1.b.1 Carregamento da Gestão sem texto** (22/10/2026)
- Ao abrir o Crias Gestão, o carregamento mostra só o símbolo pulsando no centro (1.1.38). O texto "Carregando…" no topo, à esquerda, ao lado do menu, saiu.

**1.1.1.b.2 Menu lateral fica aberto na web** (22/10/2026)
- Na versão web do Aluno e da Gestão, escolher uma opção do menu lateral não fecha o menu. Ele só fecha pelo botão de recolher. No celular, o menu em tela cheia continua fechando ao escolher.

**1.1.1.b.3 Carregamento da página Dados** (22/10/2026)
- Depois do símbolo pulsando, enquanto os dados não estiverem completos, a página mostra só o título e o subtítulo ("Dados" / "Informações de uso dos alunos."). Nada abaixo deles aparece, nem números zerados nem a barra de filtros.
- No centro da área livre: o texto "Aguarde, carregando informações…", abaixo dele uma barra de 6px (trilho `--v-line`, preenchimento em degradê do amarelo #ffd500 para o verde #00be85, largura máxima 360px) e o percentual (13px, 700).
- O percentual avança em partes proporcionais às etapas reais do carregamento (ex.: cada consulta concluída soma sua fatia) e pode parar em alguns valores no caminho. Só chega a 100% quando todos os dados estiverem prontos; então a página mostra o conteúdo. A animação da barra dura 0,35s por avanço.
- No protótipo: 9, 21, 34, (pausa), 47, 58, 66, (pausa), 78, 89, 94, 100.

**1.1.1.b.4 Gráficos da página Dados** (22/10/2026)
- "Situação dos alunos" passa a ser um gráfico de pizza (168px), com a legenda ao lado: bolinha da cor, nome, número e percentual. Cores: Não iniciou `--v-keyEdge`, Em andamento #ffd500, Concluiu #00be85.
- Primeira linha: "Conclusão das atividades" e "Situação dos alunos", lado a lado (empilham em tela estreita).
- "Alunos por atividade concluída" fica sozinho na linha de baixo, num único box com a largura toda. Cada barra tem 34px, com 14px de espaço entre elas; acima, o número de alunos; abaixo, só o número da atividade (1, 2, 3…), sem texto, para não sobrepor. Quando as barras não cabem, o box rola na horizontal e esmaece na borda que ainda tem conteúdo (1.1.25).

**1.1.1.b.5 Barra fixa de filtros da página Dados** (22/10/2026)
- Na mesma linha de "Filtrar trilhas", à direita: a etiqueta "Aluno" (pílula, mesmo estilo da etiqueta com o nome da instituição, 40px de altura) e o campo de busca com o texto "Nome ou telefone…", que ocupa o resto da linha.
- Ao digitar, aparece uma etiqueta dentro do campo, à direita, com o total de alunos encontrados ("12 alunos", "1 aluno").
- A busca vale para a página toda (números, gráficos e tabela), como o filtro de trilhas. Telefone é comparado só pelos dígitos.

**1.1.1.b.6 Linha de exportação da tabela de alunos** (22/10/2026)
- O "Filtrar alunos" e o botão "Exportar histórico" saíram. No lugar, uma linha única: "Exportação" à esquerda (texto, 1.1.1.b.10); botões "Aulas", "Tópicos" e "Colunas" (36px, pílula, com a contagem selecionada, ex.: "12/15"); e, à direita, o botão verde "Exportar planilha" (texto verde escuro, 1.1.39).
- Cada botão abre uma lista com busca, "Selecionar tudo", "Limpar tudo" e caixas de marcar, no padrão dos filtros da Gestão.
  - Aulas: quais aulas da trilha entram na planilha.
  - Tópicos: quais tópicos da trilha entram na planilha.
  - Colunas: Telefone, Tópicos liberados, Tópicos feitos, % conclusão (tópicos), Aulas liberadas, Aulas realizadas, % conclusão (aulas), Acertos, Erros, % de acerto.
- Exportar planilha gera o arquivo com os alunos filtrados na barra fixa e as aulas, tópicos e colunas marcados. Sem nenhuma aula ou coluna marcada, avisa "Selecione ao menos uma aula e uma coluna para exportar."
- CONFLITO: a exportação por aulas, tópicos e colunas e o percentual real do carregamento dependem de API. A camada visual segue esta regra; os dados vêm do backend.

**1.1.1.b.7 Busca de aluno e contagem** (22/10/2026)
- Substitui parte do 1.1.1.b.5: a etiqueta "Aluno" saiu. A busca é um campo único, do mesmo tamanho e estilo do "Filtrar trilhas" (metade da linha cada), com o texto "Pesquisar aluno".
- A etiqueta de resultado conta todos os alunos encontrados, ativos e inativos, porque a tabela mostra os dois. Quando houver inativos no resultado, ela mostra também os ativos, para bater com o número "Alunos ativos": "16 alunos (15 ativos)". O telefone é comparado pelos dígitos em qualquer posição (ex.: "31" encontra o DDD 31 e finais com 31).

**1.1.1.b.8 Pizza com valores ao passar o mouse** (22/10/2026)
- Em "Situação dos alunos", passar o mouse sobre uma fatia (ou sobre a linha da legenda) destaca essa fatia, esmaece as outras (45%) e mostra um balão no centro da fatia com o nome, o número de alunos e o percentual. A linha da legenda correspondente ganha fundo `--v-soft`. Fatias separadas por um traço de 2px na cor do cartão.

**1.1.1.b.9 Oportunidades mais leves** (22/10/2026)
- Cada coluna mostra só os 3 primeiros, com 22px entre eles.
- Na linha do título, à direita, um link "Ver mais" (verde escuro, 13px, 700, com seta). Em "Menor acerto", abre a aba Exercícios ordenada por % de acerto do menor para o maior. Em "Maior acerto", ordenada do maior para o menor. A página rola até as abas.

**1.1.1.b.10 Tabela de alunos da página Dados** (22/10/2026)
- A aba Alunos é sempre a aberta ao entrar na página.
- Itens por página: 50, 100, 300, 500 e 1000. Padrão: 50.
- Linha de exportação: "Exportação" passa a ser só texto (13px, 700, verde escuro `--v-gink`), sem etiqueta. Em Colunas, "Nome" é o primeiro item, acima de Telefone.

**1.1.1.b.11 Paginação: Anterior e Próxima** (22/10/2026)
- Em toda lista paginada do Crias Gestão, "Anterior" fica ativo sempre que existe página antes da atual e "Próxima" sempre que existe página depois. Nenhuma outra condição desativa os botões (antes, as trilhas do Início da Instituição e as listas de Trilhas e Alunos desativavam os dois quando havia até 10 itens, mesmo com 5 por página).
- A quantidade de itens por página de cada lista não mudou.

**1.1.1.b.12 Busca e alunos inativos (página Dados)** (22/10/2026)
- "Pesquisar aluno" usa a mesma formatação de "Filtrar trilhas": 14px, peso 600, cor do texto principal (também no texto de exemplo), ícone à esquerda em `--v-t3`.
- Substitui a contagem de 1.1.1.b.7: a etiqueta da busca mostra só o total encontrado ("16 alunos"). O card "Alunos ativos" ganha, abaixo do número, uma linha pequena (12px, 600, `--v-t3`) com os inativos: "1 inativo", "3 inativos".

**1.1.1.b.13 Cadastro da nova trilha** (22/10/2026)
- Nome, Matéria e Descrição são obrigatórios e levam asterisco (`--v-err`). Saiu o "(opcional)" de Matéria e Descrição, também na trilha já criada (Salvar só ativa com os três preenchidos).
- O botão "Gerar prévia" fica sempre no topo, à direita do título. Desativado (fundo `--v-soft2`, sem brilho) até Nome, Matéria e Descrição estarem preenchidos; aí fica verde, clicável e com o halo.
- Objetivo entra no box Cadastro, abaixo de Descrição, como "Objetivo (opcional)". Começa sem nenhum marcado; clicar no marcado desmarca. O box Objetivo separado sai da nova trilha; os passos passam a ser 1 Cadastro, 2 Estrutura, 3 Habilidades, 4 Orientações, 5 Arquivos. Na trilha já criada, o box Objetivo continua como está.
- Opções de objetivo no padrão dos botões secundários: pílula de 36px, 13px, peso 600, borda `--v-line`, fundo `--v-raise`. Marcada: fundo `--v-gsoft`, borda verde a 45%, texto `--v-gink`, peso 700. Campo "Outro objetivo" na mesma altura e forma, verde quando preenchido. Quebram linha naturalmente, sem quebra fixa.

**1.1.1.b.14 Estrutura e feedback imediato** (22/10/2026)
- "Número de atividades" sai de Estrutura (vai para 1.1.1.b.15).
- Ordem: Profundidade (Baixa, Média, Alta, Personalizado), depois o box de quantidades, depois os blocos e a legenda.
- Box de quantidades em duas linhas: 1ª, só Conteúdos; 2ª, Exercícios, Múltipla escolha e o switch "Feedback imediato" (à direita). A etiqueta fixa "Feedback imediato" saiu.
- Feedback imediato vem ligado por padrão. Ligado, cada exercício ganha logo depois um bloco de feedback, que é uma etapa de conteúdo a mais e sempre acompanha o seu exercício. Cor: azul claro do Crias (#88cde7, sombra #5aa9c8). Na legenda: "feedback". Exercício e feedback aparecem colados (3px), com cantos internos de 4px.
- No Personalizado, a seta para a esquerda fica no bloco de exercício e a seta para a direita no bloco de feedback. Arrastar ou mover leva os dois juntos. Conteúdo sozinho mantém as duas setas. Com o feedback desligado, o exercício volta a ter as duas.
- Contagem: o total de etapas inclui os feedbacks. Profundidade mostra "3 + 1 + 1", "5 + 2 + 2", "8 + 3 + 3" (conteúdos + exercícios + feedbacks); sem feedback, "3 + 1". Na geração, cada feedback vira uma etapa "Feedback do exercício N", logo após o exercício, e a prévia mostra o bloco azul.
- Backend: guardar `feedback_imediato` (booleano, padrão verdadeiro) na configuração; a geração insere uma etapa de conteúdo de feedback após cada exercício e conta essas etapas no total.

**1.1.1.b.15 Geração por IA** (22/10/2026)
- Acima de Habilidades, uma linha de título no padrão do título da página (texto + linha fina), menor: "Geração por IA", Outfit 19px, peso 600, verde escuro `--v-lab` (#00593d; no escuro #5fe3b5), linha a 25%. Na ponta direita da linha, "Número de atividades" com − e +. Padrão: 1.
- Textos de apoio "Envie as habilidades ou conteúdos em texto…" (Habilidades) e "Os conteúdos são gerados por padrão pela sequência abaixo…" (Orientações) no mesmo formato de "Número de atividades": 14px, peso 600, cor do texto principal.
- A sequência "Contextualização > Introdução > …" em verde escuro `--v-lab`: número, texto e setas.
- Texto digitado nos campos de Habilidades e Orientações: 13px na web (`--g-area`); no celular continua 16px (F-regras, sem zoom).

**1.1.1.b.16 Ajustes da nova trilha** (22/10/2026)
- Sem os cartões "Configuração / Prévia" no topo da nova trilha. Eles só aparecem depois que a prévia é gerada, para voltar à Configuração.
- Os 5 passos vêm abertos por padrão.
- Estrutura: sem o título "Profundidade". Opções renomeadas: Simples (3 + 1), Padrão (5 + 2), Completa (8 + 3). Padrão vem marcada.
- Saem as etiquetas "IA" (Habilidades, Orientações, Arquivos) e "opcional".
- Botões − e + de "Número de atividades" com contorno verde #00be85 e sinal `--v-gink`.
- Abaixo de "Geração por IA": "Defina quantas atividades e preencha pelo menos um dos blocos." (14px, `--v-t2`).
- Cadastro: 20px entre os campos; Objetivo com 8px a mais acima e 10px entre as opções. O rótulo fica só "Objetivo". "Outro objetivo" com o mesmo texto das opções (13px na web, 16px no celular), largura até 240px e o texto de exemplo "Escreva outro objetivo".
- Sem a etiqueta "padrão" ao lado de Estrutura.
- Quantidades: os rótulos Conteúdos e Exercícios têm largura fixa (104px), para os botões − das duas linhas começarem no mesmo ponto.
- Número de atividades: campo sem as setas do navegador, número centralizado.
- Orientações: 12px a mais entre a sequência e o campo de texto.

**1.1.1.b.17 Nova trilha: sem círculo nas setas** (22/10/2026)
- Em Orientações e Arquivos, saiu o círculo vazio que aparecia ao lado das setas (sobra da etiqueta retirada em 1.1.1.b.16).

**1.1.1.b.18 Trilha aberta: Habilidades e Arquivos na Configuração** (22/10/2026)
- Na Configuração da trilha já criada, entram dois boxes no padrão da nova trilha, sempre com a etiqueta "Somente visualização": Habilidades, acima de Orientações (texto usado na geração, 13px, fundo `--v-soft`), e Arquivos, abaixo de Orientações (nome de cada documento em pílula, com ícone de arquivo). Sem dado: "N/A".

**1.1.1.b.19 Adicionar atividades com inteligência artificial (trilha aberta)** (22/10/2026)
- Habilidades, Orientações e Arquivos com o mesmo formato de "Número de atividades": 14px, peso 600, cor do texto principal. Saiu o "(opcional)".
- Botões − e + com contorno verde #00be85 e sinal `--v-gink`, como na nova trilha.
- À esquerda, na linha do número de atividades, a etiqueta "Defina quantas atividades e preencha pelo menos um dos blocos." (pílula `--v-gsoft`, 12px, 700, `--v-gink`). O número fica à direita.
- "Gerar prévia" ativa com pelo menos um bloco preenchido (Habilidades, Orientações ou um arquivo).
- Texto digitado nos campos: 13px na web (`--g-area`).

**1.1.1.b.20 Títulos das etapas e alternativas** (22/10/2026)
- Título padrão de cada etapa gerada:
  - Conteúdo: "Conteúdo X de Y". X é a posição entre os blocos de conteúdo da atividade e Y o total de conteúdos. Exercícios e feedbacks não entram nessa conta.
  - Exercício: "Exercício X de Y", contando só exercícios.
  - Feedback: só "Feedback", sem número.
  - Ex.: Padrão com feedback = Conteúdo 1 de 5 … Conteúdo 5 de 5, Exercício 1 de 2, Feedback, Exercício 2 de 2, Feedback. O título do conteúdo pode ser editado depois.
- Na aba Conteúdo, cada exercício lista as alternativas (A, B, C…), na quantidade definida em "Múltipla escolha" da Estrutura. A alternativa do gabarito fica verde com a etiqueta "Gabarito" e acompanha o gabarito escolhido. O enunciado padrão não cita letra nem quantidade de alternativas (antes dizia "quatro alternativas" e "letra B" fixos, mesmo com outro gabarito).
- Feedback: etiqueta azul (#e2f3fa, texto #1d5f78). O mesmo vale na prévia de "Adicionar atividades com IA".

**1.1.1.b.21 Busca de alunos** (22/10/2026)
- Campo "Pesquisar nome ou número do aluno" ao lado do filtro de alunos em: página Alunos, aba Alunos da trilha e página Dados (troca o texto de 1.1.1.b.12). Mesmo formato do "Filtrar trilhas", com a etiqueta do total encontrado dentro do campo, à direita.
- Encontra pelo nome (parte do texto), pelo telefone (dígitos em qualquer posição, mínimo 2) ou pelo código do aluno (número exato, sem zeros à esquerda).

**1.1.1.b.22 Adicionar ou remover alunos: marcar todos** (22/10/2026)
- Ao lado do texto de apoio, à direita: "Marcar todos" (verde) e "Desmarcar todos". Valem para a lista da aba aberta (Adicionar ou Remover). Como os outros ajustes, só salvam no botão Salvar do topo.

**1.1.1.b.23 Base de alunos da trilha e Atualizar em massa** (22/10/2026)
- Regra para o backend e o frontend (Claude Code), em "Ativar ou inativar em massa" da aba Alunos da trilha:
  1. "Baixar base de alunos ativos e inativos" gera uma planilha com todos os alunos da instituição, uma linha por aluno, inativos primeiro e depois ativos, com as colunas nesta ordem: **código**, **nome**, **telefone**, **ativo**.
  2. A coluna **ativo** vale "sim" ou "não" e vem da situação real do aluno nesta trilha no momento do download (vínculo aluno x trilha ativo no banco). Não é calculada por progresso nem por última interação.
  3. O botão "Importar em massa" passa a se chamar **"Atualizar em massa"**.
  4. Ao enviar o arquivo, o sistema identifica cada aluno pelo **código** e compara a coluna ativo com a situação atual:
     - igual: não muda nada;
     - "sim" e hoje inativo: ativa o aluno na trilha;
     - "não" e hoje ativo: inativa o aluno na trilha (o progresso fica guardado).
  5. Nome e telefone da planilha não alteram o cadastro; servem só para conferência. Código inexistente, código repetido ou valor de ativo diferente de sim/não: a linha é ignorada e listada no aviso final.
  6. Antes de aplicar, confirmação com o resumo: "Atualizar a trilha em massa? X alunos serão ativados, Y inativados e Z ficam como estão." Depois: "Base atualizada: X ativados, Y inativados, Z sem mudança."
- CONFLITO: a comparação e a atualização dependem de API. A camada visual segue esta regra.

**1.1.1.b.24 Aba Conteúdo da trilha aberta** (22/10/2026)
- Títulos dos boxes: "Adicionar com inteligência artificial" (sem a etiqueta IA) e "Adicionar em lote".
- Em Atividades da trilha, o botão passa a ser "+ Adicionar", e a lista numerada começa 10px mais abaixo do título.
- Box Habilidades da Configuração (somente visualização) no mesmo padrão do campo da nova trilha: campo de 5 linhas, borda verde, 13px, somente leitura. Em todos esses campos (Habilidades e Orientações, na nova trilha e na trilha aberta), texto maior que o campo mostra a barra de rolagem fina (`--v-line`).

**1.1.1.b.25 Título das etapas de conteúdo** (22/10/2026)
- Substitui o padrão de conteúdo de 1.1.1.b.20: "Etapa X de Y" (X e Y contando só os blocos de conteúdo). Exercício continua "Exercício X de Y" e feedback, "Feedback".

**1.1.1.b.26 Adicionar ou remover alunos em lista única** (22/10/2026)
- Saem as abas "Adicionar alunos" e "Remover alunos". Todos os alunos da instituição ficam numa lista única, cada um com o switch Ativo/Inativo nesta trilha.
- No topo, filtro em três opções com contagem: Todos, Ativos, Inativos (situação salva no momento). "Marcar todos" e "Desmarcar todos" valem para a lista filtrada.

**1.1.1.b.27 Crias Aluno no celular: Início e barra de mensagem** (22/10/2026)
- O bloco do Início (símbolo, saudação e trilhas) sobe cerca de 28px, para o centro visual ficar um pouco acima do meio da tela: respiro inferior do Início no celular de 24px para 80px (`--r-home-pb`).
- Barra de mensagem no celular com 22px até a base (antes 10px), `--r-comp-pb`; com área segura maior, vale a área segura. Vale também na conversa da trilha e no Painel.

**1.1.1.b.28 Menu do aluno: trilhas recolhidas ao abrir** (22/10/2026)
- No Crias Aluno, toda vez que o menu lateral é aberto (botão de abrir menu, na web ou no celular), todas as trilhas da lista aparecem recolhidas. Enquanto o menu continua aberto, a trilha que o aluno abriu fica aberta; ao fechar e abrir o menu de novo, volta tudo recolhido. Na primeira carga da web, com o menu já aberto, também começa recolhido.

**1.1.1.b.29 Painel do aluno: integração com o banco (orientação para o Claude Code)** (22/10/2026)
- Problema atual no app: clicar em "Painel" no menu do Crias Aluno faz logout. Verificar e corrigir antes de qualquer ajuste visual:
  1. A rota do Painel deve ficar dentro da área autenticada do aluno, com a mesma sessão/token das outras páginas. Conferir se a rota existe no roteador, se o guard de autenticação aceita o perfil aluno e se a chamada de dados não devolve 401/403 que dispare o logout automático. Erro ao carregar dados do Painel nunca desloga: mostra o estado de erro da página.
  2. O Painel não pode ser só a página visual. Precisa de um endpoint de leitura dos dados individuais do aluno logado, com o id do aluno tirado da sessão no servidor (nunca de parâmetro enviado pelo cliente). Um aluno nunca vê dados de outro.
  3. Dados que o endpoint devolve, no formato já desenhado no protótipo (INTERFACE.md 1.1.8): trilhas liberadas e, por trilha, atividade atual / total, % de conclusão, acertos, erros, % de acerto, últimas interações e exercícios com mais erro. Vocabulário do banco: trails > question > stage.
  4. O monitor da conversa do Painel ("Pergunte ao monitor sobre o seu desempenho…") deve receber esses mesmos dados como contexto, só do aluno logado, para responder sobre progresso e desempenho reais (ex.: "em qual atividade estou?", "onde mais errei?"). Sem dados: o monitor diz que ainda não há informações suficientes.
  5. Estados: carregando (símbolo, 1.1.38), vazio ("Nenhuma trilha liberada para você.") e erro, como no protótipo.
- CONFLITO: rota, autenticação, endpoint e contexto do monitor são lógica/API. Fora do escopo visual, mas obrigatórios para o Painel funcionar.

**1.1.1.b.30 Seletor Aluno/Gestão: quem vê e o que abre** (22/10/2026)
- O seletor "Aluno / Gestão" no rodapé do menu só aparece para contas com acesso à Gestão (perfis Super admin ou Instituição). Conta só de aluno nunca vê o seletor, nem o espaço dele. Hoje o app mostra o seletor para alunos: corrigir lendo o perfil da sessão, não um valor fixo.
- Ao trocar de Gestão para Aluno, abre o Crias Aluno da mesma conta logada na Gestão (mesmo usuário e sessão), nunca outra conta de aluno que esteja salva no navegador. Ao voltar de Aluno para Gestão, abre a Gestão dessa mesma conta. Se houver sessões de contas diferentes no mesmo navegador, o seletor sempre segue a conta da página em que ele foi clicado.
- No protótipo, o tweak acessoPainel continua simulando quem tem acesso; o padrão passa a ser desligado (aluno comum).

**1.1.1.b.31 Salvar na trilha aberta** (22/10/2026)
- Configuração: o único bloco editável é o Cadastro (lápis, depois Cancelar / Salvar no próprio box; o botão passa de "Salvar trilha" para "Salvar"). Estrutura, Habilidades, Orientações e Arquivos ficam em "Somente visualização" em qualquer trilha já criada, ativa ou não. Nessa aba, o botão do topo não aparece.
- Objetivo entra no Cadastro, como na nova trilha, e é editado junto com Nome, Matéria e Descrição (mesmo lápis, mesmo Salvar). Clicar no objetivo marcado desmarca. O box Objetivo separado sai da trilha aberta.
- Conteúdo, Alunos e Gabarito seguem a mesma regra:
  - Qualquer alteração (texto ou título de etapa, gabarito, liberar/bloquear atividade, adicionar atividade, adicionar em lote ou com IA, excluir atividade, ativar/inativar aluno, marcar gabarito) não é gravada na hora. O botão "Salvar" do topo fica verde e pisca (halo) e, ao lado esquerdo, aparece "Cancelar" (pílula de 36px, fundo claro `--v-raise`, borda `--v-line`).
  - Só grava ao clicar em Salvar. Cancelar desfaz tudo desde o último salvamento.
  - Na aba Conteúdo os campos das etapas ficam sempre editáveis (saem o lápis e o Cancelar/Salvar do box da atividade). As alterações de várias atividades se acumulam até o Salvar do topo.
- Sair com alteração não salva (trocar de aba, Voltar, menu lateral ou qualquer link) abre a confirmação no padrão das janelas do Crias: "Você não salvou as alterações, deseja sair mesmo assim?", com "Sair sem salvar" (claro) e "Salvar alterações" (verde). Clicar fora fecha e mantém na página. Sair sem salvar descarta e segue; Salvar alterações grava e segue.

**1.1.1.b.32 Dados: cabeçalho da tabela de alunos em duas linhas** (23/10/2026)
- "Atividades liberadas" e "Atividades feitas" quebram em duas linhas no cabeçalho ("Atividades" / "liberadas", "Atividades" / "feitas"), com as setas de ordenação ao lado, para estreitar essas colunas. As demais colunas seguem em uma linha, centralizadas na vertical do cabeçalho.

**1.1.1.b.33 Gestão: trilha, gabarito, dados e planilhas** (23/10/2026)

*Trilha aberta*
- Abrir uma trilha (lista, Início, Voltar de etapas) leva direto para a aba **Conteúdo**, com "Adicionar com inteligência artificial" e "Adicionar em lote" sempre recolhidos. "Adicionar em lote" passou a recolher como o bloco de IA.
- **Desativar trilha:** o botão "Trilha ativa" do Cadastro funciona sem entrar em edição. Desligar abre a confirmação "Desativar a trilha?" (Cancelar / Desativar trilha); os alunos deixam de ver a trilha e conteúdo, gabarito e progresso continuam salvos. Ligar de novo ativa direto. O resto da Configuração continua como está (Estrutura, Geração por IA e Arquivos seguem somente visualização).
- **Alunos:** filtro só com **Ativos** e **Inativos** (saiu "Todos"; abre em Ativos). "Ativar ou desativar em massa" abre o bloco "Ativar ou desativar alunos", idêntico ao "Remover alunos" (título, subtítulo, Colunas, Baixar planilha base com alunos, Enviar planilha, botão de ação que só ativa com arquivo, nome do arquivo). Ao enviar, pede confirmação com o resumo (ativados, desativados, sem mudança) e só então aplica.
- **Gabarito:** colunas Atividade #, Exercício #, Atividade, Título, Gabarito, % de acerto, Respostas, Acertos, Erros. Gabarito editável (seleção N/A, A a F conforme o número de alternativas), com etiqueta "Faltando" ou "Anulado". Botões "Alterar em massa" e "Exportar histórico" (CSV com todas as colunas). "Alterar em massa" abre "Alterar gabarito", com a mesma lógica de "Ativar ou desativar alunos": baixa a base, envia a planilha, confirma e só então altera.

*Numeração de exercício (toda a aplicação)*
- Etapa é a posição do bloco dentro da atividade (conteúdo, exercício ou feedback). Exercício é numerado à parte: 1, 2, 3, conforme a quantidade de exercícios da atividade, **nunca** pelo número da etapa. Ex.: estrutura Padrão (5 conteúdos + 2 exercícios + 2 feedbacks) tem Exercício 1 na etapa 6 e Exercício 2 na etapa 8.
- Vale em Conteúdo ("Exercício 1 de 2"), Gabarito, Dados > Exercícios, planilhas e exportações. Chave do gabarito: trilha + atividade # + exercício #.
- **Dados > Exercícios:** uma linha por exercício (não por atividade), com as colunas Trilha, **Atividade #**, **Exercício #**, Título, % de acerto, Respostas, Acertos, Erros, Gabarito.

*Nova trilha (refletido na Configuração da trilha aberta)*
- Etapas de criação: 1 Cadastro, 2 Estrutura, **3 Geração por IA**. Dentro da 3, os blocos são **A Habilidades / Conteúdos**, **B Orientações** e **C Arquivos**, com marcador de letra em quadrado arredondado com contorno verde (diferente do círculo numerado das etapas 1 a 3).
- Geração por IA, à direita: Número de atividades e, abaixo, **Nível** (Básico verde, Intermediário amarelo, Avançado azul), seleção única em etiqueta com a cor do nível. Padrão: Intermediário.
- O subtítulo de A, B e C usa a mesma etiqueta verde de "Adicionar com inteligência artificial" (fundo verde claro, texto verde escuro, 13px, 700).
- A: "Habilidades / Conteúdos *", obrigatório. Etiqueta em duas linhas: "Habilidades ou conteúdos usados para gerar as atividades." / "Você pode enviar os códigos das habilidades da BNCC." Sem esse campo, "Gerar prévia" fica desativado.
- B: etiqueta "Os conteúdos são gerados por padrão pela sequência abaixo." / "Você pode enviar orientações específicas ou selecionar as tags abaixo." Sequência padrão em azul (#e2f3fa, texto e números #1d5f78). Abaixo do campo, 8 tags de seleção múltipla (azul quando marcadas): Exemplos do cotidiano, Linguagem acessível, Situações-problema, Explicação passo a passo, Retomar pré-requisitos, Erros comuns, Conexão entre disciplinas, Pensamento crítico. As tags marcadas entram na Configuração de geração ("Tags de orientação").
- C: etiqueta "Documentos de texto ou PDF que apoiam a geração das atividades."
- "* obrigatório" no canto inferior direito do Cadastro (quando editável) e do bloco B, com asterisco e palavra no mesmo vermelho de erro (var(--v-err)), 13px.
- Tipografia da criação revista sem exagero: títulos das etapas 18px, blocos A a C 16px, rótulos de campo 14px, rótulos de Estrutura 15px, opções de Objetivo 14px, etiquetas 13px. Botões seguem 36px/13px.
- Na trilha aberta, a mesma estrutura aparece em somente visualização: Geração por IA com número de atividades, Nível, A, B (sequência, orientações e tags marcadas) e C.

*Planilhas modelo (regra geral para o Claude Code)*
- Formatos aceitos: CSV ou XLSX, primeira linha com os nomes das colunas exatamente como abaixo (sem acento obrigatório na leitura, sem diferenciar maiúsculas). Linhas vazias são ignoradas. Toda planilha mostra antes, na tela, a lista "Colunas".
- Fluxo comum: baixar a base ou o modelo, enviar a planilha (o botão de ação só ativa com arquivo escolhido e mostra o nome do arquivo), confirmar e aplicar. Linhas com erro não param a importação: são listadas com o motivo e o resto é aplicado.
- **Cadastrar alunos** (Alunos): nome, celular, senha (opcional), trilha (opcional). Sempre adiciona; celular já existente na instituição é erro da linha.
- **Remover alunos** (Alunos): nome, celular, remover (sim / não). A base traz todos os alunos com "não". Só "sim" remove, após digitar DELETAR.
- **Ativar ou desativar alunos** (aba Alunos da trilha): código, nome, celular, ativo (sim / não). A base traz todos os alunos da instituição, inativos primeiro, com a situação atual na trilha. Igual à base não muda; diferente é atualizado. Confirmação com resumo antes de aplicar.
- **Alterar gabarito** (aba Gabarito): atividade, exercício, gabarito, anular (sim / não). Atividade e exercício são os **números** (ex.: 3 e 1), sem "#". A base traz todos os exercícios da trilha com o gabarito atual e "não". A chave é atividade + exercício. Gabarito aceita A a F dentro do número de alternativas (vazio mantém o atual). Anular "sim" tira o exercício do cálculo de acerto; "não" reativa. Confirmação com resumo (alterados, anulados, sem mudança) antes de aplicar.
- **Adicionar em lote** (aba Conteúdo): mantém a planilha modelo atual, sem lista de colunas na tela. Regra: **sempre adiciona** atividades novas no topo, **nunca sobrescreve** nem altera atividades existentes.
- **Alterar senhas em massa** (Senhas): nome, celular, escola, trilha (opcional), senha (opcional). Senha vazia gera automaticamente.
- **Exportações** (Exportar histórico, Exportar planilha, Exportar CSV): CSV com as colunas da tabela exatamente como na tela, todas as linhas que passam pelos filtros, sem paginação.

**1.1.1.b.34 Gestão: Geração por IA unificada, alunos, gabarito e conteúdo** (23/10/2026). Vale sobre o 1.1.1.b.33 onde houver diferença.
- **Geração por IA** (nova trilha, Configuração da trilha aberta e "Adicionar com inteligência artificial" na aba Conteúdo) tem exatamente o mesmo conteúdo, textos, exemplos e tags:
  - Abaixo do título: "Os conteúdos são gerados por padrão pela sequência abaixo." com a sequência em azul (Contextualização > Introdução > Exemplos > Desenvolvimento > Conclusão). Saiu "Quantas atividades gerar, em que nível e a partir de quê."
  - Na nova trilha, à direita do título: etiqueta "opcional" e as setas de recolher.
  - Blocos: **A Número de atividades**, **B Nível**, **C Habilidades / Conteúdos**, **D Orientações**, **E Arquivos**, um abaixo do outro, todos no mesmo padrão (letra em quadrado arredondado com contorno verde, título 17px). Em A e B o controle fica logo ao lado do título.
  - Nível: Básico, Intermediário, Avançado. A etiqueta mantém sempre o fundo e o texto do estado não selecionado (fundo claro, ponto na cor do nível: verde, amarelo, azul). Selecionada, muda só o contorno (2px na cor do nível).
  - C: etiqueta em uma linha "Habilidades e conteúdos para geração das atividades. Você pode enviar os códigos da BNCC." e, abaixo do campo, à direita, "* obrigatório". Sem C preenchido, "Gerar prévia" não ativa (também em Adicionar com IA).
  - D: etiqueta "Você pode enviar orientações específicas ou selecionar as tags abaixo." e as tags (seleção múltipla): Exemplos do cotidiano, Linguagem simples, Termos técnicos, Explicação passo a passo, Situações-problema, Retomar pré-requisitos, Erros comuns, Pensamento crítico.
  - Tipografia da página da trilha harmonizada: títulos de etapa 19px, blocos 17px, rótulos e textos de apoio 15px, etiquetas, tags e sequência 14px, botões 36px/13px.
- **Conteúdo:** todo exercício mostra sempre as alternativas (A a F conforme a Estrutura), editáveis, com a marcação "Gabarito" na correta, além da seleção do gabarito. Nunca exibir exercício só com o gabarito.
- **Alunos da trilha, Adicionar ou remover:** no topo, "Filtrar alunos" e a pesquisa por nome ou número. Abaixo, uma tabela única com todos os alunos da instituição: Nome, Número e Situação (Ativo ou Inativo) ordenáveis, e a coluna **Alterar** com o switch. Saíram as abas Ativos e Inativos.
- **Gabarito:** a tabela é igual à de Dados > Exercícios, com as colunas Atividade, Exercício, Título (mesmo nome de Exercícios, "Exercício de …", com a seta para ver o enunciado e as alternativas) e Gabarito. Depois de Título só existe Gabarito: seleção na ordem A, B, C, D, N/A e o botão Anular (Reativar quando anulado). Ordena por Atividade, Título e Gabarito; Exercício não é ordenável.
- **Dados > Exercícios:** colunas sem "#" (Atividade, Exercício) e sem ordenação por Exercício.

**1.1.1.b.35 Gestão: ajustes de criação, confirmações e gabarito; Aluno: primeiro acesso e recuperar senha** (23/10/2026). Vale sobre 1.1.1.b.33 e 1.1.1.b.34 onde houver diferença.

*Gestão*
- Geração por IA (nova trilha, Configuração e Adicionar com IA, sempre iguais): saiu a explicação "Os conteúdos são gerados por padrão pela sequência abaixo." e a sequência numerada. D Orientações: "Você pode enviar orientações específicas e/ou selecionar as tags abaixo."
- Nível Intermediário usa o amarelo vivo do Crias (#ffd500) no ponto e no contorno de seleção.
- Confirmação de saída sem salvar: "Tem certeza que deseja sair sem salvar?", botões "Sair sem salvar" (só contorno amarelo #ffd500) e "Salvar alterações" (só contorno verde #00be85), ambos com fundo do cartão e texto escuro.
- Alunos da trilha (Adicionar ou remover): ao lado das ações, caixas "Só ativos" e "Só inativos" (uma desmarca a outra). As ações passam a "Ativar todos" e "Inativar todos".
- Gabarito: botão "Anular" só com contorno vermelho e texto vermelho; "Reativar" só com contorno verde. Etiqueta "Anulado" (e "Faltando") com fundo vermelho claro e texto vermelho, centralizada entre a seleção do gabarito e o botão.
- Cadastrar alunos (Instituição e Alunos): ao enviar, confirmação "Deseja cadastrar os alunos na instituição?" com Cancelar / Cadastrar (verde).
- Remover alunos: confirmação "Deseja remover os alunos da instituição?" com Cancelar / Remover (vermelho). Substitui o DELETAR neste fluxo.

*Aluno: entrada*
- **Primeiro acesso:** no primeiro login do usuário, sempre, depois de Entrar a mesma caixa da entrada vira "Primeiro acesso / Crie uma nova senha para continuar." com Nova senha, Confirmar senha (mínimo 6 caracteres, iguais) e "Salvar e entrar". Ao salvar, a nova senha é gravada no banco e o usuário segue para o Início. Erros: "A senha precisa ter pelo menos 6 caracteres." e "As senhas não conferem."
- **Recuperar senha:** botão de texto abaixo de Entrar. Abre, na mesma caixa, "Recuperar senha / Informe o telefone cadastrado." com o campo Telefone e Enviar (Voltar retorna). Depois de enviar: "Você receberá a senha em até 1 dia útil no seu telefone." e "Voltar para entrar". O pedido vai para a Gestão/backend; a senha é enviada por mensagem ao telefone. Erro: "Informe um telefone válido."
- Protótipo: tweak "primeiroAcesso" (padrão ligado) simula o primeiro login.
- **CONFLITO (backend, Claude Code):** como saber que é o primeiro acesso. Regra: o usuário (aluno e login da Gestão) ganha o campo `must_change_password` (booleano), `true` ao ser criado (cadastro manual, planilha "Cadastrar alunos", senha gerada automaticamente) e sempre que a senha é redefinida pela Gestão (Senhas, Alterar senhas em massa) ou pelo Recuperar senha. A resposta do login devolve esse campo; se `true`, o front mostra a etapa "Primeiro acesso" em vez de entrar. O endpoint de troca recebe a nova senha, grava o hash, põe `must_change_password = false` e registra `password_changed_at`. Não usar contagem de logins nem data de último acesso para isso. Recuperar senha cria um pedido (`password_reset_requests`: telefone, data, situação) para envio em até 1 dia útil.

**1.1.1.b.36 Gestão: geração opcional, botões e confirmações; Aluno: conversa, carregamento e Monitoria** (23/10/2026). Vale sobre as regras anteriores onde houver diferença.

*Gestão*
- **Geração por IA é opcional.** Com Nome, Matéria e Descrição preenchidos, "Gerar prévia" já ativa (prévia em branco com uma atividade). Habilidades / Conteúdos é obrigatório **só para gerar com IA**: basta preencher Habilidades para gerar com IA; Orientações, tags e Arquivos são sempre opcionais. Se o professor preencher Orientações, tags ou Arquivos sem Habilidades, "Gerar prévia" não ativa até preencher Habilidades. Em "Adicionar com IA" (aba Conteúdo) Habilidades é sempre obrigatório.
- Subtítulo da nova trilha: "Crie uma trilha de atividades com conteúdos e exercícios em poucos passos." (texto definido pelo usuário).
- **Prompt de geração (Claude Code / backend):** o sistema monta o prompt com o prompt fixo "Criar trilha com IA" + Configuração de geração. Além de habilidades / conteúdos, orientações e arquivos, entram obrigatoriamente: **nível de dificuldade** (Básico, Intermediário ou Avançado) e as **tags de orientação** selecionadas, junto às orientações. Vale para a nova trilha e para "Adicionar com IA".
- **Botões verdes:** texto e ícone brancos em toda a Gestão (substitui o verde escuro da 1.1.39).
- **Confirmação em linha (padrão único para ações em massa por planilha):** caixa abaixo dos botões, com a primeira frase em negrito ("Alterar gabarito em massa?") e o resto em texto normal, sempre com a contagem do que muda e do que fica igual. Botões Cancelar e confirmar; confirmar em verde claro (var(--v-gsoft)) com contorno verde vivo (#00be85) e texto verde escuro. Vale para: Cadastrar alunos ("Cadastrar alunos em massa?"), Remover alunos ("Remover alunos em massa?", botão Remover em vermelho claro com contorno e texto vermelhos), Ativar ou desativar alunos, Alterar gabarito e Alterar senhas em massa. Aparece em Alunos, na Instituição e na criação de instituição. Substitui as janelas de confirmação desses fluxos.

*Perfis (Claude Code)*
- O perfil **aluno** é só aluno: entra no Crias Aluno e não vê o seletor Aluno/Gestão. O perfil de **gestão** entra no Crias Gestão e pode abrir o próprio Crias Aluno como demonstração (seletor Aluno/Gestão no menu), com os seus dados de demonstração. Nunca dar acesso à Gestão a partir de um login de aluno.

*Aluno: conversa (envio de mensagem)*
- Ao enviar, a pergunta do aluno sobe até o topo da área de conversa (16px de respiro) e o carregamento do monitor aparece logo abaixo dela. Abaixo fica um espaço reservado para a resposta, para a pergunta poder subir mesmo quando a conversa é curta.
- A resposta aparece em digitação, de cima para baixo, **sem rolar a tela**. Quem rola é o aluno. Não há descida automática durante ou depois da resposta.
- Quando a resposta chega, a tela fica exatamente na mesma posição (pergunta no topo, resposta abaixo). Se a resposta for maior que o espaço visível, o aluno rola; ao terminar a digitação aparece a seta de descer.
- O espaço reservado some quando o aluno toca Continuar, troca de trilha ou de tela. Continuar e respostas de exercício seguem o comportamento de antes (descem para o fim).
- Vale nas trilhas e na Monitoria.

*Aluno: abertura e carregamento da trilha*
- Abrir uma trilha (card, menu, nome da trilha) leva sempre para o **fim** da conversa, já fixo na posição, sem subir e descer: a conversa só aparece depois de posicionada e as mensagens que já existiam entram sem animação.
- **Carregamento de 5 em 5 atividades.** Ao abrir, carregam a atividade atual e as 4 anteriores. Ao rolar até o topo, se houver atividades anteriores não carregadas, aparece no lugar da seta de subir o símbolo do Crias pulsando com "Carregando mensagens". Ao carregar, o bloco anterior (mais 5) entra acima sem mover o que o aluno está vendo, o aviso some e aparece a seta de subir.
- Se o conteúdo da atividade atual ainda não veio (inclusive na primeira atividade de uma trilha nova), o mesmo aviso aparece no lugar da seta de descer até carregar.
- Clicar numa atividade antiga ainda não carregada (menu) mostra o aviso no topo, carrega até ela e então vai para ela.
- **"Trilha indisponível" só aparece quando a API confirma** que a trilha não existe ou não está liberada para o aluno. Enquanto o conteúdo não chegou, sempre "Carregando mensagens".

*Aluno: Monitoria (fim do Painel)*
- O item "Painel" sai do menu. Fica só **Monitoria** ("Conversar com seu monitor"), e a Monitoria passa a ser exatamente o que era o Painel: perfil, filtros por trilha, progresso, desempenho, erros, dúvidas e a conversa com o monitor.
- Texto do convite: "Quer tirar alguma dúvida? Pergunte aqui embaixo." Barra: "Pergunte ao seu monitor…".
- **A barra do Início envia a pergunta para a Monitoria:** abre a Monitoria e a pergunta entra na conversa de lá.
- Exceção de rolagem só deste menu: **sempre abre no topo**. Trocar o filtro de trilha também volta ao topo. Ao conversar, a pergunta sobe e a resposta segue a regra de envio acima.
- **Conceito (Claude Code):** dentro de cada trilha o monitor fala da trilha, como antes. Fora das trilhas (Monitoria) o monitor fala do desempenho do aluno (com os dados individuais) **e** tira dúvidas sobre as matérias. O contexto enviado ao monitor da Monitoria inclui os dados do aluno logado do filtro atual.
- **CONFLITO (backend):** na versão publicada, abrir o antigo Painel levava ao logout. Provável falta de rota/endpoint para os dados individuais do aluno. Os dados existem no banco (progresso por trilha e atividade, acertos e erros por exercício, perguntas ao monitor) e devem ser expostos num endpoint autenticado do próprio aluno (só os dados dele), usado pela Monitoria. A rota da Monitoria não pode exigir perfil de gestão.

**1.1.1.b.37 Ajustes de texto e conversa da trilha** (23/10/2026)
- Gestão, Objetivo: o campo "Escreva outro objetivo" usa a mesma tipografia das opções (texto escuro, mesmo peso) e tem o dobro da largura (até 480px).
- Gestão, Orientações (nova trilha, Configuração e Adicionar com IA): "Você pode enviar orientações específicas e/ou selecionar uma ou mais tags abaixo."
- Gestão, Alunos da trilha: switch "Alterar estágio em lote" e botão "Exportar base".
- Aluno, conversa da trilha:
  - Separador entre atividades: no início de cada atividade, "Atividade X - Título da atividade" em verde escuro (var(--v-lab)), 13px, 700, com a linha fina ao lado até a borda (mesmo padrão dos rótulos do menu), com respiro de 12px acima e 26px abaixo.
  - Rótulo acima de cada mensagem da trilha: nome da **atividade** (não da trilha) seguido de "- Etapa X de Y" (conteúdos, contados só entre conteúdos), "- Exercício X de Y" (exercícios, contados só entre exercícios) ou "- Feedback". A etiqueta amarela do exercício mostra "Exercício X de Y". Mensagens do monitor seguem "Monitor".
  - Topo: só "Atividade X de Y" (saiu a etapa). Acompanha a atividade que está na tela ao rolar e muda ao avançar de atividade.
- Protótipo: trilha "Revisão de matemática" com 15 atividades concluídas para testar o carregamento de 5 em 5.

**1.1.1.b.38 Entrada, perfil, conversa e acessos separados** (23/10/2026). Vale sobre as regras anteriores onde houver diferença.

*Aluno: entrada*
- Abaixo de "Recuperar senha", o link "Solicitar demonstração" (mesmo estilo). Abre a caixa no mesmo formato: título "Solicitar demonstração", campos Nome, Telefone, E-mail, Organização e Cargo, botão "Enviar" e "Voltar". Nome, Telefone e E-mail são obrigatórios (asterisco em var(--v-err)). E-mail validado por expressão regular (`/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i`). Erros: "Preencha nome, telefone e e-mail.", "Informe um telefone válido.", "Informe um e-mail válido.".
- Confirmação: título "Solicitar demonstração", mensagem "Você receberá um contato por telefone em poucos dias." e botão "Voltar para página inicial" (volta para a entrada).
- Recuperar senha: saiu o subtítulo "Informe o telefone cadastrado.".
- Campo Telefone (Recuperar senha e Solicitar demonstração): máscara "(  )      -    " ao fundo, em tom de apoio; ao digitar, os números preenchem a máscara ("(11) 90000-0001", até 11 dígitos, algarismos tabulares).
- Primeiro acesso: abaixo de "Salvar e entrar", o texto "Voltar para página de login", alinhado à direita, 14px, 600, verde #00875e, sublinhado só no hover (texto, não botão).
- CONFLITO: o envio da solicitação de demonstração depende de API (endpoint público). A camada visual segue esta regra.

*Aluno: perfil*
- Em todo o Crias Aluno, tocar no nome do perfil no rodapé do menu abre a página **Perfil**: topo "Perfil", e o mesmo bloco de nome e telefone da Monitoria (avatar, nome, telefone e lápis para editar). Abaixo, o botão verde "Suporte" (pílula 46px, texto e ícone brancos), que abre https://wa.me/553197520152 em nova aba.

*Aluno: conversa da trilha*
- Topo: "Atividade X de Y - Nome da atividade".
- Rótulo das mensagens de conteúdo: só "Etapa X de Y". Feedback: "Feedback". Exercício sem rótulo e sem texto acima: vem direto o box do exercício. A etiqueta "Exercício X de Y" dentro do box passa para o azul do Crias (fundo #e2f3fa, texto #1d5f78; no escuro #0f2a36 e #8fd3ec).
- Número da atividade também quando concluída (menu e Monitoria): o círculo mostra o número, com fundo verde #00be85 e número branco. Saiu o ✓.
- **Carregamento:** "Carregando mensagens" sempre no topo, no lugar da seta de subir: o símbolo do Crias solto (28px, sem caixa), centralizado no mesmo ponto da seta, e o texto abaixo dele (13px, 600, texto de apoio). Vale para todos os casos (atividades anteriores, atividade atual ainda não carregada, abrir trilha nova).
- **Avanço de mensagens (mesmo mecanismo em tudo):** ao tocar Continuar ou responder o exercício, os três pontos de carregando sobem até o topo da conversa (16px de respiro). A mensagem nova aparece no lugar deles, de cima para baixo, sem rolar a tela. Se for maior que a área visível, aparece a seta de descer e o aluno rola; se for menor, o espaço abaixo continua. Na próxima mensagem, sobe de novo. Na conversa com o monitor (trilha e Monitoria) quem sobe é a pergunta do aluno, como em 1.1.1.b.36. Substitui a descida automática ao fim do Continuar e do exercício.

*Aluno: Monitoria*
- A seta de descer aparece desde a abertura (a Monitoria abre no topo) e fica até o aluno rolar; depois segue a regra normal. Vale também ao trocar o filtro de trilha.
- Trocar o filtro de trilha sempre leva a conversa ao topo, mesmo com a conversa no fim ou rolando.
- Números dos indicadores (progresso, desempenho, monitor) alinhados pela base: quando um rótulo ocupa duas linhas e outro uma, todos os números ficam na mesma linha, abaixo do rótulo mais baixo.

*Gestão: Dados*
- Subtítulo da página: "Informações sobre o progresso dos alunos".
- Uso do monitor: saiu o subtítulo "X monitores · X mensagens".

*Acessos separados*
- Saiu o seletor "Aluno / Gestão" do menu, no Aluno e na Gestão. Aluno e Gestão são acessos diferentes, cada um com o seu login. Substitui 1.1.1.b.30 e o trecho de perfis de 1.1.1.b.36. O tweak acessoPainel saiu do protótipo.

**1.1.1.b.39 Envio por e-mail, perfil, conversa e carregamento da trilha** (23/10/2026). Vale sobre 1.1.1.b.38 onde houver diferença.

*Aluno: entrada*
- Enviar em "Recuperar senha" e em "Solicitar demonstração" manda as informações para contato@crias.org. Assunto: "Recuperar senha" ou "Solicitar demonstração". Corpo: só o nome do campo e a resposta, uma linha por campo ("Nome: Ana Souza"); campo opcional vazio vai como N/A. No protótipo abre o e-mail pronto (mailto). CONFLITO: no app, o envio deve ser feito pelo backend para contato@crias.org.
- "Voltar para página inicial" (confirmação da demonstração) leva para https://www.crias.org, na mesma aba.

*Aluno: conversa da trilha*
- O separador entre atividades passa a ser só a linha fina (verde escuro, 25%), sem texto. O nome da atividade fica só no topo: "Atividade X de Y - Nome da atividade", sem negrito, em verde escuro (var(--v-lab)). Ao mudar de atividade (rolando ou avançando), o texto do topo dá uma piscada sutil (opacidade até 45%, 650ms).
- Exercício é um bloco como os outros: símbolo do Crias ao lado, título "Exercício X de Y" acima do box (mesmo estilo de "Etapa X de Y") e o box logo abaixo. Saiu a etiqueta com o número dentro do box.

*Aluno: abertura e carregamento da trilha (refina 1.1.1.b.36)*
- Ordem de carregamento: sempre da atividade mais recente para a primeira. As anteriores entram acima conforme o aluno sobe.
- Regra de posição: o ponto de partida é sempre o topo da área visível. A mensagem onde o aluno parou fica no topo (16px de respiro); o que veio antes fica acima, para rolar.
  - Abrir a trilha (card, menu, nome): atividade em andamento ou nova, carregam a atual e as 4 anteriores e a última mensagem fica no topo. Trilha concluída: vai direto para o fim, com a última mensagem na base da tela.
  - Clicar numa atividade já feita (menu): carrega ela e as 5 seguintes, com o começo dela no topo. Rolando para baixo, as próximas 5 entram sem aviso, antes de chegar ao fim. Rolando até o topo, as 5 anteriores entram acima com "Carregando mensagens" (350ms), sem mover o que está na tela.
  - Clicar na atividade em andamento: a última mensagem no topo.
- Posicionamento imediato, sem rolagem animada nem subir e descer: a conversa só aparece já posicionada. Continuar ou enviar estando numa atividade antiga carrega até a atual e segue o mecanismo de 1.1.1.b.38.

*Aluno: Monitoria*
- Saiu a seta de descer fixa ao abrir: segue a regra normal (aparece só ao rolar).
- Saiu do topo o nome e o telefone. A edição fica só na página Perfil.

*Aluno: Perfil*
- Duas seções com o rótulo do menu (caixa alta, 11px, verde escuro, linha fina ao lado): **Cadastro** e **Suporte**.
- Cadastro já abre editável: Nome e Telefone (campos 46px, rótulo acima) e "Salvar" na mesma linha. Salvar só fica verde e clicável quando algo mudou.
- Suporte, numa linha: ícone do WhatsApp com "+55 (31) 9752-0152" (abre https://wa.me/553197520152), ícone de e-mail com "contato@crias.org" (mailto) e, à direita, o botão verde "Falar com suporte" (abre o WhatsApp). No celular os itens quebram linha.

*Gestão: Dados*
- Subtítulo com ponto final: "Informações sobre o progresso dos alunos.".

_Pacote 1.1.1.b fixado em 23/10/2026: `Crias Aluno v1.1.1b.dc.html` e `Crias Gestao v1.1.1b.dc.html`._

**1.1.1.b.40 Ordem das atividades, envio automático, rolagem e perfil** (23/10/2026). Vale sobre 1.1.1.b.39 onde houver diferença.

*Aluno: menu*
- (Revertido) A lista de atividades de cada trilha no menu continua da 1 para a última.

*Aluno: entrada (envio automático, Claude Code)*
- "Recuperar senha" e "Solicitar demonstração" enviam o e-mail automaticamente, sem ação do usuário (o protótipo não abre mais o mailto). Para a pessoa aparece só a confirmação que já existia.
- Backend: endpoint público (sem login) por formulário, com validação no servidor (telefone com 10 ou 11 dígitos; e-mail pela mesma expressão regular), limite de envios por IP e envio por e-mail transacional para **contato@crias.org**. Assunto: "Recuperar senha" ou "Solicitar demonstração". Corpo: uma linha por campo, "Campo: resposta" (Telefone; ou Nome, Telefone, E-mail, Organização, Cargo), opcional vazio como N/A. A confirmação só aparece com resposta de sucesso da API; com falha, erro "Não foi possível enviar. Tente novamente.".

*Aluno: conversa da trilha*
- "Atividade concluída / Continue para a próxima atividade" vira só uma etiqueta: pílula verde clara (var(--v-gsoft), borda verde a 35%), círculo verde com ✓ branco e o texto "Atividade concluída" (Outfit 14px, 600, verde escuro), alinhada ao texto das mensagens.
- Setas de subir e descer vão até o fim de verdade: se houver atividades não carregadas, a seta carrega o próximo bloco de 5 e continua sozinha até o primeiro (ou último) ponto possível, sem parar na transição. Rolar à mão a partir do ponto de transição também carrega de novo. Com tudo carregado, a rolagem é normal. Rolar com a roda ou o dedo cancela a ida automática.

*Aluno: Perfil*
- Cadastro: Nome na primeira linha (largura toda). Na segunda: Telefone (190px), E-mail (ocupa o espaço livre) e, à direita, "Cancelar" e "Salvar" (46px), sempre visíveis. No celular quebram linha. E-mail vem em branco por padrão e é validado ao salvar.
- Padrão de edição: Cancelar e Salvar ficam apagados até haver alteração; ao digitar, Cancelar fica ativo e Salvar fica verde. Cancelar volta aos dados salvos.
- Suporte: telefone "+55 (31) 99752-0152", com o mesmo link do botão (https://wa.me/553197520152). E-mail abre o mailto. Botão: "Falar com o suporte".

**1.1.1.b.41 Prévia em lista com Resumo** (26/10/2026)

*Gestão: Nova trilha, aba Prévia, e Adicionar atividades com IA*
- A prévia passa a ser uma lista de atividades (número, nome, "X conteúdos · Y exercícios · ≈ N min") com um cartão Resumo à direita. Ao abrir uma atividade aparecem os blocos B1, B2... coloridos por tipo (Conteúdo verde, Exercício amarelo, Feedback azul, Conclusão verde escuro). Até 6 atividades; "+ N atividades" mostra o restante.
- Resumo: nome da trilha, matéria e objetivo; atividades, exercícios no total e minutos por atividade; linhas Conteúdos, Exercícios, Alternativas por exercício, Feedback instantâneo e Bloco conclusivo (uma por linha). Não há "Liberação".
- Tempo aproximado, calculado só no frontend: 1 min por bloco de conteúdo, feedback ou conclusão e 2 min por exercício.
- Os botões continuam no topo: Continuar leva a Adicionar alunos e Salvar trilha fica no topo (sem botão no Resumo). Em Adicionar atividades com IA, Cancelar e Adicionar atividades seguem no topo e a atividade aberta mantém o detalhe das etapas abaixo dos blocos. O editor de atividades da Prévia continua abaixo da lista; abrir uma linha seleciona a atividade nele.

**1.1.1.b.42 Ajustes da prévia** (26/10/2026)
- Etapa conclusiva vem ligada por padrão na Configuração da trilha.
- Na prévia, o bloco de conclusão usa a mesma cor da Configuração (bege #e9e1c6, texto #4a4030) e tem o mesmo tamanho dos outros blocos.
- Nova trilha e Adicionar atividades com IA: ao abrir uma atividade aparecem os blocos e o conteúdo de cada etapa (incluindo feedback e conclusão), igual à prévia de trilhas já criadas. À direita de cada linha fica só a seta de abrir e recolher. Todas as atividades começam recolhidas.

**1.1.1.b.43 Salvar na Prévia** (26/10/2026)
- Na Prévia da nova trilha, o botão do topo passa de "Continuar" para "Salvar trilha" e salva direto. A etapa "Adicionar alunos" também fica com contorno verde: a pessoa escolhe salvar agora ou ir adicionar alunos antes.

**1.1.1.b.44 Topo da Gestão entre 920 e 1000px** (26/10/2026)
- Até 1000px de largura o filtro de instituições fica só com ícone e o espaço entre os itens do topo cai para 6px, para o botão Sair não ser cortado.

## Gestão 1.1.1.b (antes Redesign, aprovada em 24/10/2026)

Aprovada como Gestão 1.1.1.b: `Crias Gestao v1.1.1b.dc.html` (substitui a Gestão 1.1.1.b de 23/10). Era o estudo `Crias Gestao v1.1.1 Redesign.dc.html`. Parte da v1.1 oficial e só muda o que está listado aqui. A v1.1 oficial segue como está; se o estudo for aprovado, vira a oficial. A versão anterior do estudo está em `historico/`. Só camada visual.

- **Menu no topo** (web), como no rascunho R: logo, Início, Dados, Trilhas, Alunos e Configurações (lista com Usuários e Sistema). Mais espaço entre o logo e o menu. Todos os itens com fundo bege (#f7f5ec); o selecionado ganha contorno verde #00be85. À direita: etiqueta da escola (perfil Instituição) ou "Filtrar instituições" (Super admin), ambos em bege, depois tema, perfil e sair. No celular, menu em tela cheia e a etiqueta/filtro na linha do Voltar, como hoje. Conteúdo até 1280px; sai a regra dos 203px.
- **Cartões:** como na v1.1 oficial (sem sombra).
- **Padrão de filtros (toda a Gestão):** barra única em pílula com o rótulo "FILTROS" à esquerda (com respiro da borda), linha fina e, em seguida, os filtros e a pesquisa quando houver. Vale para Início, Trilhas, Alunos, Dados, Senhas e as abas Alunos e Gabarito da trilha.
- **Dados:** grade do rascunho R3. Indicadores como na oficial, mais **Média de perguntas ao monitor** (perguntas ÷ alunos ativos, com "X perguntas totais" embaixo, no padrão do "X inativos"). Conclusão das atividades, Situação dos alunos e Uso do monitor na mesma linha. Menor acerto e Maior acerto em dois cartões limpos, sem barra; título "Trilha · Atividade X · Exercício Y" e seta para baixo para ver o enunciado. Alunos e Exercícios: abas, Exportação, Aulas, Tópicos, Colunas e Exportar planilha numa linha só; tabela como na oficial.
- **Trilha aberta (R2):** abas Configuração, Conteúdo, Alunos e Gabarito no topo, à direita do título. Em Conteúdo, três colunas com títulos no mesmo padrão e alinhados (caixa alta, 11px, verde): "ATIVIDADES", "ATIVIDADE X DE Y" e "COMO O ALUNO VÊ". Abaixo de Atividades: "+ Atividade", "Adicionar em lote" e "Adicionar com IA" (os dois últimos abrem o painel acima das colunas). A prévia mostra o conteúdo resumido de cada etapa e as alternativas (uma por linha), com rolagem.
- **Nova trilha:** índice à esquerda (Cadastro, Estrutura, Geração por IA com "opcional" embaixo). Seções com mais espaço entre si. Recolhidas, mostram um resumo limpo: Cadastro (nome, matéria, descrição, objetivo); Estrutura (conteúdos, exercícios, alternativas por exercício, feedback imediato Sim/Não, etapa conclusiva Sim/Não); Geração por IA (número de atividades, nível da atividade, habilidades, orientações com as tags embaixo, arquivos).
- **Estrutura:** sai a linha "Cada atividade"; entram os blocos de reorganização manual sob o título "Reorganize", bem menores que na oficial, com a legenda da oficial. O exercício leva o feedback junto; a etapa conclusiva, quando ligada, fica fixa no fim. Switch **Etapa conclusiva** ao lado de Feedback imediato (backend: `conc`, booleano, padrão falso).
- **Geração por IA:** em Número de atividades e Nível da atividade (antes "Nível"), os controles ficam alinhados à direita. Habilidades, Orientações e Arquivos sem botões de recolher; só a seção inteira recolhe.
- **Como o aluno vê:** com rolagem, na nova trilha e na trilha aberta.

### Revisão 2 do Redesign (24/10/2026)

- **Voltar:** só texto com a seta, sem contorno, alinhado à esquerda com o título, em toda a Gestão.
- **Dados:** indicador "Perguntas ao monitor" com a média (perguntas ÷ alunos ativos) e "média" pequeno ao lado; embaixo, "X totais". Barra de filtros em duas partes: à esquerda, Filtrar trilhas e Pesquisar aluno, um embaixo do outro; à direita, "% DE CONCLUSÃO" (mesmo rótulo de Filtros, com a linha fina) e duas faixas, De e Até, que filtram tudo abaixo (recurso da v0). Exercícios abrem ordenados por trilha (A a Z), atividade e exercício.
- **Início (Super admin):** etiqueta "ID" da instituição antes do tipo (Escola privada etc.). Trilhas: filtro "Filtrar matérias" na barra de filtros.
- **Usuários (antes Permissões):** o menu e a página Usuários do Início seguem o mesmo padrão: Perfis (Super admin acessa tudo; Instituição só visualiza; Básico vem com Alunos), "Adicionar usuários em massa" e "Remover usuários em massa" (recolhidos), barra de filtros com "Pesquisar nome, número ou e-mail" e "Adicionar usuário" no fim da linha. No Super admin, a importação pede a instituição numa lista das ativas.
- **Ações em massa (padrão):** cartão com título "… em massa", subtítulo e o botão Editar/Recolher; começa recolhido. Dentro: Colunas, Baixar planilha, Enviar planilha, botão de ação, nome do arquivo ("Nenhum arquivo selecionado") e a confirmação em linha com contagem.
- **Colunas das planilhas em massa** (valem para o CSV exportado, para o modelo baixado e para a leitura do arquivo enviado, nesta ordem; o Claude Code e o backend devem gravar e validar exatamente assim):
  - Cadastrar alunos em massa: ID Instituição, Nome, celular, e-mail (opcional), senha (opcional), trilha (opcional).
  - Editar alunos em massa: ID Instituição, Código aluno, Nome, celular, e-mail (opcional), escolaridade, nível pedagógico. A linha é encontrada pelo Código aluno; os demais campos substituem os atuais.
  - Remover alunos em massa: ID Instituição, Código aluno, Nome, celular, remover (sim / não).
  - Alterar senhas em massa: ID Instituição, Código aluno, Nome, celular, senha. Senha vazia gera automaticamente (texto no mesmo estilo de "Nenhum arquivo selecionado").
  - Adicionar usuários em massa: ID, Nome, E-mail, Telefone, Perfil, Senha (opcional).
  - Remover usuários em massa: ID, Nome, E-mail, remover (sim / não).
- **Alunos:** "+ Adicionar aluno" no fim da linha do título (abre o cadastro em branco). Na barra de filtros, "Pesquisar nome, número ou código" vem primeiro. Cadastro do aluno: Nome, Telefone, E-mail (opcional), Senha, Escolaridade (lista) e Nível pedagógico; sai o campo Instituição. Salvar fica no topo, como na trilha; aluno novo só salva com nome e telefone. E-mail só no cadastro, não na tabela.
- **Salvar (toda a Gestão):** todo Salvar abre "Tem certeza que deseja salvar?" com "Essa ação não pode ser desfeita." e os botões Continuar editando (contorno amarelo) e Salvar (verde, texto branco).
- **Sair sem salvar (toda a Gestão):** Continuar editando (contorno amarelo) e Salvar (contorno verde) na primeira linha; Sair sem salvar (contorno vermelho) embaixo. Vale também para a nova trilha (cadastro preenchido ou prévia gerada). Saindo sem salvar, a nova trilha é descartada e começa do zero na próxima vez. Na prévia, "Cancelar" ao lado de "Salvar trilha".
- **Nova trilha:** o índice (1, 2, 3) acompanha a rolagem e a seção que fica para trás recolhe sozinha. Texto do índice: "Preencha o cadastro, revise a estrutura e defina as informações para gerar por IA (opcional)." Objetivo: "Escreva outro" ocupa o resto da linha. Estrutura: subtítulo mais perto do título; "Reorganize" com "opcional" e o texto em duas linhas; setas e arrastar sempre disponíveis (ao mover, a estrutura vira Personalizada), setas menores; total "X etapas por atividade" em etiqueta branca com contorno verde. Geração por IA: subtítulos de Habilidades, Orientações e Arquivos no padrão da Estrutura, em verde escuro. Resumo recolhido: habilidades e orientações em até 3 linhas, esmaecendo para baixo; tags em azul; arquivos um embaixo do outro.
- **Trilha aberta:** subtítulo com a matéria. Linha do título com Salvar até o fim da página; abas na linha de baixo, à direita. Botões: "Nova atividade" e "Adicionar em lote" (meia largura cada) e "Adicionar com inteligência artificial" (linha inteira). Nas atividades, só o cadeado (liberada ou bloqueada). Configuração de geração em três grupos com título em azul escuro: Cadastro, Estrutura e Geração por IA.

### Revisão 3 do Redesign (24/10/2026)

Vale sobre a Revisão 2 onde houver diferença.

- **Pesquisa de aluno (Dados, Alunos na trilha, Adicionar ou remover):** "Pesquisar nome ou telefone do aluno". A busca é por início: cada letra digitada mantém só quem começa exatamente com o que foi digitado (sem diferenciar acentos e maiúsculas). Só números: o telefone precisa começar com os dígitos (com ou sem 55). Na trilha, a pesquisa vem antes dos filtros.
- **Trilhas (lista):** Filtrar trilhas primeiro; Filtrar matérias no mesmo padrão (lista com pesquisa, Selecionar tudo, Limpar tudo e etiqueta "Todas" ou "X de Y"). Tabela: Nome (ocupa todo o espaço livre e quebra em linhas se precisar), Matéria, Criada em, Ativa e Abrir (contorno verde), tudo à direita. Sai a coluna Instituição.
- **Nova trilha:** "Escreva outro" termina na mesma linha vertical da última etiqueta da linha de cima. A seção de baixo só recolhe quando a pessoa rola para cima e o título da seção de cima chega ao topo: topo de Cadastro recolhe Estrutura; topo de Estrutura recolhe Criar com IA. Índice: "· Preencha o cadastro. · Valide a estrutura. · Defina informações para criar com inteligência artificial." "Geração por IA" passa a "Criar com IA" (índice e título). Resumo recolhido: Habilidades e Orientações em caixa branca com contorno bege, altura de 4 linhas e rolagem. Subtítulos: "Crie atividades baseadas na descrição das habilidades e conteúdos. / É possível enviar os códigos da BNCC para geração das atividades." e "Anexe documentos de texto ou PDF para embasar a criação das atividades." Caixa de arquivos: "Envie os documentos aqui / DOCX, TXT ou PDF"; o botão abre o seletor de arquivos do computador (vários arquivos).
- **Prévia (Configuração de geração):** Nome, Estrutura, Descrição, Habilidades, Orientações, Tags e Arquivos ocupam dois blocos; texto que não cabe rola para a direita e esmaece no fim. Texto abaixo do celular: "Etapas na ordem em que o aluno recebe."
- **Trilha aberta:** coluna Atividades mais larga (430px) com "Nova atividade", "Adicionar em lote" e "Adicionar com IA" do mesmo tamanho numa linha; a coluna do meio reduz. Atividades novas começam bloqueadas.
- **Saída:** título "Tem certeza que deseja sair?". Salvar dentro dessa janela salva direto, sem a segunda confirmação; "Tem certeza que deseja salvar?" só aparece no Salvar da tela de edição.
- **Alunos na trilha:** abas "Cadastrados" e "Adicionar ou remover" (sai o botão Voltar). Em Cadastrados, "Alterar estágio em lote" e "Exportar base" ficam abaixo dos filtros. Em Adicionar ou remover, o botão "Adicionar ou remover em massa" fica abaixo dos filtros.
- **Ações em massa:** cabeçalho inteiro clicável, com seta redonda de contorno verde (abrir e recolher) no lugar de Editar.
- **Colunas (substituem a Revisão 2):**
  - Cadastrar alunos em massa: ID Instituição, Nome, Telefone, E-mail, Senha (opcional). Nota: "Código gerado automaticamente."
  - Editar alunos em massa: ID Instituição, ID Aluno, Nome, Telefone, E-mail, Escolaridade, Nível pedagógico (todos opcionais). Nota: "Campos em branco não são editados."
  - Remover alunos em massa: ID Instituição, ID Aluno, Nome (visualização), Telefone (visualização), Remover (sim / não). Nota: "Remoção a partir do código do aluno."
  - Alterar senhas em massa: ID Instituição, ID Aluno, Nome (visualização), Telefone (visualização), Senha. O CSV exportado vem com a senha em branco. Nota: "Somente senhas preenchidas serão alteradas."
  - Adicionar usuários em massa: ID Instituição, Nome, Telefone, E-mail, Perfil, Senha (opcional).
  - Remover usuários em massa: ID Instituição, Nome (visualização), Telefone (visualização), E-mail, Remover (sim / não). Nota: "Remoção a partir do e-mail do usuário."
  - Colunas de visualização vêm preenchidas no CSV exportado para conferência e são ignoradas na leitura.
- **Vocabulário:** "Telefone" em toda a Gestão (sai celular e número). "ID Aluno" no lugar de "Código aluno".

### Revisão 4 do Redesign (24/10/2026)

Vale sobre as revisões anteriores onde houver diferença.

- **Pesquisa:** volta a regra anterior em toda a Gestão: encontra o texto em qualquer parte do nome, e telefone ou ID a partir de 2 dígitos (como em Usuários).
- **Salvar e Cancelar no topo (regra geral):** toda página com dados editáveis (trilha, aluno, Alunos, Usuários, Senhas, Instituição, Prompts) mostra Cancelar e Salvar no topo, na linha do título, assim que algo muda, inclusive depois de ações em massa ou salvamentos intermediários. Salvar pede "Tem certeza que deseja salvar?". Cancelar pede "Tem certeza que deseja cancelar a edição? / Essa ação não pode ser desfeita." com Continuar editando (contorno amarelo) e Cancelar edição (contorno vermelho). Sair da página com alteração abre "Tem certeza que deseja sair?". Ações internas da página (salvar a linha, confirmar a importação) seguem como estão; o topo é o salvamento final.
- **Usuários (Configurações e Início do Super admin, idênticos; o Super admin mantém as abas Crias e Instituições):** a página abre só para leitura, com "Editar" no topo. "Adicionar usuário" abre só a linha nova em edição, com Salvar e Cancelar na linha (Cancelar da linha só desfaz, sem confirmação). Perfis: Super admin acessa tudo, Instituição só visualiza; Básico vem com Alunos marcado. O Super admin tem "+ Adicionar perfil", que abre uma linha com o nome do perfil e as permissões; o nome tem 170px e todas as linhas ficam alinhadas.
- **Parênteses nas planilhas (regra geral):** o que aparece entre parênteses na etiqueta da coluna vai igual no cabeçalho da planilha baixada: (obrigatório), (opcional), (visualização), (sim / não), (Admin / Básico). Na leitura, o sistema ignora o parêntese e lê só o nome da coluna.
- **Colunas (substituem as anteriores):**
  - Cadastrar alunos em massa: ID Instituição (obrigatório), Nome (obrigatório), Telefone (obrigatório), E-mail (opcional), Senha (opcional). A planilha modelo já vem com o ID da instituição.
  - Editar alunos em massa: a planilha base vem com todos os dados atuais dos alunos.
  - Adicionar usuários em massa: ID Instituição (obrigatório, já vem na planilha modelo), Nome, Telefone, E-mail, Perfil (Admin / Básico), Senha (opcional).
  - Adicionar ou remover alunos da trilha em massa: ID Trilha, Trilha, ID Aluno, Nome (visualização), Telefone (visualização), Ativo (sim / não). A planilha base vem toda preenchida.
- **Alunos (tabela):** "Filtrar por ID" (antes "Filtrar por código"); Ativo vem depois de Criado em; sai a coluna Status.
- **Aluno:** novo aluno tem o mesmo cadastro e a seção Trilhas vinculadas. Na edição, mexer numa trilha vinculada (atividade, etapa, vincular ou desvincular) não salva na linha: só o Salvar do topo grava.
- **Trilha aberta, Conteúdo:** "+ Atividade", "Adicionar em lote" e "Adicionar com IA" menores, numa linha; a largura da coluna acompanha os três botões. Cada atividade tem "Salvar" (contorno verde) ao lado de Excluir, como salvamento intermediário; o Salvar do topo continua obrigatório. "Adicionar com IA" usa os mesmos blocos e textos de "Criar com IA" da nova trilha.
- **Alunos na trilha:** abas Cadastrados e Adicionar ou remover em largura total, acima dos filtros (como Alunos e Exercícios em Dados), sem caixa extra. "Adicionar ou remover alunos da trilha em massa" é um cartão com seta para abrir e recolher. "Ver ativos", "Ver inativos", "Ativar todos" e "Inativar todos" na mesma linha.
- **Senhas (tabela):** coluna E-mail depois de Telefone. Nome ocupa todo o espaço livre; ID Aluno, Telefone, E-mail, Senha e Ação ficam à direita.

### Revisão 5 (24/10/2026, fechamento da 1.1.1.b)

- **Perfil (Gestão):** o avatar abre a página Perfil no mesmo padrão do Crias Aluno: Cadastro (Nome, Telefone, E-mail, Cancelar e Salvar) e Suporte (WhatsApp, e-mail e "Falar com o suporte").
- **Regra de cadastro (Gestão e Aluno, qualquer perfil):** Nome é obrigatório e é preciso ter e-mail ou telefone; com um dos dois já dá para salvar.
- **Nova trilha:** sai o recolhimento automático pela rolagem. O "Editar/Recolher" das seções vira a seta redonda de contorno verde (padrão das ações em massa). O índice continua acompanhando a rolagem.
- **Usuários:** a seleção de Instituição em Adicionar e em Remover usuários em massa usa o formato do botão "Baixar planilha modelo". Na tabela, Nome ocupa todo o espaço livre; E-mail, Telefone, Perfil, Senha e ações ficam à direita.
- **Alternativas (Gestão e Aluno):** uma por linha; quando o texto não cabe, só aquela alternativa ganha linhas, sem esmaecer.
- **Trilha ativa:** o switch fica no topo, ao lado das abas (Configuração, Conteúdo, Alunos, Gabarito). Trilha nova é criada inativa. Ao ativar: "Confirma a ativação da trilha?" / "Ao ativar a trilha as configurações de estrutura não podem ser editadas." com Cancelar (contorno amarelo) e Ativar trilha (contorno verde).
- **Conteúdo:** "Nova atividade", "Adicionar em lote" e "Adicionar com IA" ficam logo abaixo das abas, com a mesma largura delas, divididos em partes iguais, fundo branco e contorno. O botão aberto fica em verde claro; recolhido, volta ao contorno. A seta dos painéis segue a seta redonda verde. O Salvar de cada atividade começa bege (bloqueado), libera ao editar e volta ao bege depois de salvo; Excluir fica à direita.
- **Alunos na trilha:** aba "Ativar ou inativar" (antes "Adicionar ou remover"), sem cabeçalho fixo na tabela. Colunas: Nome (todo o espaço), ID Aluno, Situação e Alterar à direita.
- **Gabarito:** "Ver faltando" e "Ver anulados". Colunas da planilha: ID Trilha, Trilha, Atividade, Exercício, Gabarito, Anular (sim / não). Nota: "Somente as alterações na coluna "gabarito" ou "anular" são registradas." Na tabela, Gabarito vai para a direita e Título ocupa o espaço livre.
- **Alunos (tabela):** coluna Nome três vezes mais larga (aceita rolagem horizontal); Ativo é a última coluna de dados; Abrir com contorno verde.

### Revisão 6 (24/10/2026)

*Aluno*
- **Painel e Monitoria voltam a ser itens separados** (substitui o trecho "Monitoria (fim do Painel)" de 1.1.1.b.36). Menu, grupo Acompanhamento: **Painel** ("Ver seus dados de estudo") e **Monitoria** ("Conversar com seu monitor").
- **Painel em dashboard:** sem formato de conversa. Filtro por trilha no topo e cartões com título (Outfit 19px): Progresso (largura total), Desempenho, Uso do monitor, Exercícios com erro e Principais dúvidas. Os números ficam em blocos bege; uma linha curta de apoio abaixo do título.
- **Barra do monitor no Painel:** continua embaixo. Ao enviar, o aluno vai direto para a Monitoria e a pergunta entra como se tivesse sido feita lá: histórico acima, mensagem do aluno, carregamento no topo e resposta abaixo (mesmo mecanismo da conversa). As perguntas do Início também vão para a Monitoria.
- **Cadastro (Perfil):** mesma regra da Gestão. Nome obrigatório e e-mail ou telefone; sem os dois: "Informe o nome e o e-mail ou o telefone."

*Educação (antes Gestão)*
- **Nome e logo:** "Crias | Gestão" passa a **"Crias | Educação"**. Arquivos `crias-logo-educacao.svg` e `crias-logo-educacao-branco.svg` (150×22 px) no protótipo e no design system; substituem `crias-logo-gestao*` em todos os pontos.
- **Senhas, Prompts e API:** voltaram a abrir (a página Perfil tinha uma tag sem fechamento que escondia as páginas seguintes).
- **Perfil:** Cadastro como estava, à esquerda (até 780px); Suporte numa coluna à direita, com 64px de respiro. No celular, Suporte vai para baixo.
- **Voltar:** um único padrão em todas as páginas: 12px, 600, cinza `--v-t3`, seta de 14px; hover `--v-t2`.
- **Esmaecimento dos cabeçalhos fixos:** ao rolar, a faixa de esmaecimento abaixo do cabeçalho cresce de 36px para 72px (18px sólidos e 54px de degradê). Parado no topo, o conteúdo continua 36px abaixo do subtítulo, sem esmaecer.
- **Setas de recolher:** todas com contorno bege (`--v-line`), fundo branco e seta `--v-t2` (substitui o contorno verde da revisão 5).
- **Dados:** filtros voltam a duas linhas (Filtrar trilhas e Pesquisar nome ou telefone do aluno), fixos no topo. O filtro de % de conclusão vai para dentro de Conclusão das atividades, abaixo das barras, com a linha fina verde e o rótulo "Filtro por % de conclusão"; filtrado, vale para a página toda. Novo cartão **Desempenho** (mesmo título de Uso do monitor) com Menor acerto e Maior acerto. Trocar entre as abas Alunos e Exercícios mantém as abas no mesmo ponto da tela.
- **Perfis (Usuários):** Super admin edita a seleção de menus dos perfis direto; Instituição (Admin) só visualiza.
- **Trilha aberta:** abas alinhadas à esquerda, 36px abaixo do subtítulo; Trilha ativa na mesma linha, à direita. "+ Atividade" (verde, texto branco), "+ Em lote" e "+ Criar com IA" (branco, contorno bege) ficam abaixo da lista de atividades, numa linha, no tamanho do texto; a largura dessa linha define a da coluna de atividades, e a coluna do meio ganha o resto.
- **Nova trilha, recolhimento pela rolagem** (substitui a revisão 5): um bloco só recolhe quando a pessoa passou por todo ele (a linha de baixo do bloco entrou na tela) e depois ele saiu inteiro da tela, tendo a linha que separa os blocos como marco: para cima, passando o cabeçalho fixo, ou para baixo, saindo pela base. Vale para Cadastro, Estrutura e Criar com IA e para cada vez que um bloco é reaberto para edição. Ao recolher um bloco acima, a tela não pula.
- **Criar com IA recolhido:** campos vazios ficam em branco (sem N/A). Arquivos em caixa: vazio ou um arquivo, uma linha; vários, uma caixa por arquivo, uma abaixo da outra.

*Educação no celular*
- Voltar e o filtro ou nome da instituição ficam sempre abaixo do botão de menu, nunca na mesma linha.
- Nova trilha: sem o índice lateral (vai direto para 1, 2 e 3); "Gerar prévia" no fim do formulário; "Como o aluno vê" centralizado. O mesmo vale para o celular da trilha aberta.
- Dados: Conclusão das atividades, Situação dos alunos e Uso do monitor um abaixo do outro. Alunos por atividade concluída rola na horizontal dentro do cartão.
- Tabelas: a linha de títulos das colunas tem a altura do texto, como as outras linhas (as setas de ordenação não usam a área de toque de 44px).
- Trilha aberta: Salvar na linha do título; abaixo, Trilha ativa; depois as quatro abas numa linha; depois "+ Atividade", "+ Em lote" e "+ Criar com IA" numa linha; depois a lista de atividades, com o nome e o cadeado ocupando toda a largura útil da página.
- Toda troca de página ou de aba começa do topo.

### Revisão 7 (25/10/2026)

*Aluno*
- **Painel:** Progresso, Desempenho e Uso do monitor, cada um numa linha inteira. Saem Principais dúvidas e Exercícios com erro. Dentro de Desempenho entram **Mais erros** e **Mais acertos** no mesmo formato de Menor e Maior acerto da Educação (atividade, seta redonda bege e % em etiqueta); a seta abre os acertos, os erros e os exercícios errados da atividade (sua resposta e resposta certa).
- **Painel, esmaecimento:** a mesma regra dos cabeçalhos fixos da Educação. Parado no topo, sem esmaecer; ao rolar, a faixa abaixo dos filtros cresce até 72px (metade sólida, metade degradê).
- **Carregamento de trilhas longas:** depois que o carregamento aparece e o conteúdo é liberado, ele não volta a aparecer no mesmo ponto (sem piscar). O carregamento de atividades anteriores só começa quando o aluno rola para cima.
- **Voltar (entrada):** mesmo padrão do Voltar da Educação: sem negrito, cinza, com seta.

*Educação*
- **Voltar:** sem negrito (400) em toda a aplicação, seta de traço fino.
- **Usuários:** "Editar" em texto verde com o ícone de lápis, ao lado do título.
- **Trilha aberta:** "+ Atividade", "+ Adicionar em massa" e "+ Criar com IA" no topo da coluna de atividades (abaixo do rótulo Atividades), numa linha; a largura da linha define a coluna de atividades e o título da atividade cresce junto; a coluna do meio diminui na mesma proporção.

*Nova trilha*
- **Três etapas no topo:** 1 Configuração, 2 Prévia, 3 Adicionar alunos (opcional). Prévia e Adicionar alunos só abrem depois de criar a trilha.
- **Botões no topo:** Cancelar e **Criar trilha** (antes "Gerar prévia", que saiu do índice lateral e do fim do formulário no celular). Na Prévia, Cancelar e **Continuar** (vai para Adicionar alunos). Em Adicionar alunos, Cancelar e **Salvar trilha**.
- **Prévia:** só mostra a trilha gerada. Sem "+ Atividade", "+ Adicionar em massa" e "+ Criar com IA".
- **Adicionar alunos:** a mesma interface de ativar ou inativar alunos da trilha aberta, já aberta em "Ativar ou inativar". O que for marcado é salvo junto com a trilha.
- **Voltar para Configuração estando na Prévia:** sem confirmação. A Prévia volta a ficar inativa e é preciso tocar em Criar trilha de novo.
- **Cabeçalhos dos blocos (Cadastro, Estrutura, Criar com IA):** saem as setas. Com o bloco recolhido, aparece o ícone de lápis colado ao título; tocar no título ou no lápis abre o bloco.
- **Recolhimento de Criar com IA:** além da regra geral, recolhe quando a pessoa sobe e o bloco sai inteiro pela base da tela (cruzando a linha de baixo de Estrutura), mesmo sem ter rolado até o fim dele.
- **Índice lateral:** "Defina as informações para criar com inteligência artificial."


### Revisão 8 (25/10/2026)

*Geral*
- **Logo Crias | Educação:** o fim de "Educação" alinha com o fim de "Voltar" (letra "r"). O deslocamento é medido na abertura (fim do desenho do logo e fim do texto Voltar) e aplicado ao recuo do topo; em telas estreitas o logo para a 8px da borda.
- **Favicon e título da aba:** mesmo símbolo do Aluno (`assets/crias-simbolo-luz.svg`), título "Crias | Educação".
- **Salvar no topo:** qualquer alteração de informação na página faz aparecer Cancelar e Salvar no topo, inclusive senha gerada, senha alterada, senhas geradas em massa, campos do cadastro da instituição e ações em massa. Cancelar desfaz tudo, inclusive as senhas.

*Nova trilha*
- **Etapas do topo (Configuração, Prévia, Adicionar alunos):** sem os números 1, 2 e 3. Texto à esquerda e seta verde (#00be85) à direita em Configuração e Prévia, só para indicar continuidade (a seta não é botão).
- **Troca de etapa:** sempre abre no topo da página.
- **Índice lateral (Cadastro, Estrutura, Criar com IA):** fixo na posição inicial, não se move com a rolagem.
- **Prévia:** Criar com IA ocupa a metade direita; Cadastro e Estrutura dividem a metade esquerda. Até 1180px, Cadastro e Estrutura lado a lado e Criar com IA embaixo, na largura toda.

*Dados*
- À direita, na linha do subtítulo: "Atualizado às HH:MM" e o botão **Atualizar** (pílula, contorno verde). Atualizar recarrega os dados e renova o horário.

*Configurações: Usuários*
- **Colunas:** E-mail com no mínimo 300px e a maior parte da largura livre; Nome com no mínimo 240px. A tabela rola na horizontal quando precisar.
- **Editar:** sai do topo da página e fica ao lado do título da tabela Usuários.
- **Gerar senha:** a nova senha aparece na hora (visível) e o Salvar do topo aparece para confirmar. Na edição manual, o botão da linha passa a "Aplicar".

*Configurações: Senhas*
- Mesma regra: gerar ou alterar senha mostra a senha nova e pede Salvar no topo.

*Instituição*
- Título do bloco: **Cadastro da instituição** (antes "Nome da escola"), com lápis ao lado para liberar a edição. Saem Salvar e Cancelar do bloco; vale o Salvar do topo.
- Cadastrar, editar ou remover alunos em massa: depois de confirmar, a mensagem ganha à direita o botão de texto **Ver em alunos**, que abre Alunos filtrado pela instituição.

*Revisão 8, complemento (25/10/2026)*
- **Nova trilha:** com os obrigatórios do Cadastro preenchidos, a etapa Prévia também fica clicável e faz o mesmo que Criar trilha (cria e abre a Prévia). Adicionar alunos continua liberado só depois da Prévia. No celular as etapas ficam empilhadas e a seta aponta para baixo.
- **Favicon oficial:** `crias-simbolo-luz.svg` no Aluno e na Gestão, título da aba "Crias | Educação" na Gestão.
- **Protótipo:** tweak "tablet" (desligado, retrato 820×1180, paisagem 1180×820) no Aluno e na Gestão, para revisar o layout em tablet. Só no protótipo.

### Revisão 9: ajustes de tablet (25/10/2026)

*Gestão*
- **Nova trilha:** quando a Prévia é liberada, ela ganha o mesmo contorno verde da Configuração.
- **Adicionar atividades com IA (trilha aberta):** o botão Gerar prévia sai do cartão e fica ao lado de Trilha ativa, na linha das abas. Só aparece com o cartão aberto e só libera com Habilidades preenchido.
- **Como o aluno vê:** quando cai para a linha de baixo (Conteúdo e Prévia), fica alinhado à direita.
- **Cancelar na nova trilha:** abre só "Tem certeza que deseja sair?" (Continuar editando, Salvar e sair, Sair sem salvar). Saiu a confirmação extra de cancelar.
- **Logo no topo:** nunca fica mais perto da borda que o início do Voltar. Quando o alinhamento pelo fim não cabe (tablet e telas menores), o início do logo alinha com o início do Voltar.
- **Filtrar instituições no topo (tablet paisagem, até 1180px):** volta a mostrar o texto, com largura igual a Alunos + Configurações (217px); o texto esmaece se não couber. Abaixo de 920px fica só o ícone.
- **Nome da escola no topo (Instituição):** ocupa o espaço livre até 16px de Configurações; se não couber, esmaece no fim.
- **Formatação verde do filtro e da etiqueta da escola** (fundo verde claro, contorno verde, texto verde escuro) em todos os lugares: topo e linha do Voltar.
- **Tela cheia:** ver Aluno.

*Aluno*
- **Trilha concluída:** botão "Voltar para página inicial".
- **Menu acompanha a trilha aberta:** ao abrir uma trilha ou clicar numa atividade de qualquer trilha, as outras recolhem, só a trilha aberta fica expandida e o menu rola até ela ficar o mais perto possível do topo. A pessoa pode expandir outras depois. No celular, ao reabrir o menu, a trilha aberta volta expandida e no topo. Vale na web, no tablet e no celular.
- **Fechar menu no celular:** o X foi trocado pelo mesmo ícone de painel lateral da web (Aluno e Gestão).
- **Botão atualizar do protótipo:** saiu. No lugar fica o botão de tela cheia.
- **Tela cheia (Aluno e Gestão):** botão redondo com o ícone "open in full" (Material Symbols) no canto superior direito (Aluno: no lugar do atualizar; Gestão: antes do tema no topo, e no canto superior direito no celular). Usa a tela cheia do navegador; navegar não sai do modo. No modo, o botão vira um X que sai da tela cheia. O botão só aparece quando o navegador permite (computador, Android e iPad). No iPhone o Safari não permite tela cheia de páginas, então o botão não aparece.

## Correções v1.1.1.a (17/10/2026)

Pacote de correções aplicado no app (`correcoes-bugs-frontend-v1.1.1`) e refletido nos protótipos. Junto com o 1.1.1.b, forma a v1.1.1. Vale sobre as regras anteriores onde houver diferença.

**1.1.39 Texto verde escuro nos botões verdes da Gestão**
- No Crias Gestão, botões com fundo verde #00be85 usam texto e ícone verde escuro #001c0e (`--v-onGreen`), em vez de branco. Vale para o botão principal (36px), o botão primário das páginas e a letra marcada no Gabarito. Hover e pressionado mudam só o fundo.
- As marcas pequenas de concluído (círculo de 18px com ✓) continuam com ✓ branco.
- O Crias Aluno não muda: Continuar, Enviar e Entrar seguem com texto branco.

**1.1.40 Rolagem da conversa (Aluno)**
- Roda do mouse: soma até 100px ao alvo por evento, limitado a 400px da posição atual; a conversa segue o alvo com 20% da distância por quadro.
- Toque: o conteúdo acompanha o dedo (1:1), limitado a 280px por quadro.

**1.1.41 Continuar e abertura da trilha (Aluno)**
- O Continuar fica acima da barra de mensagem (z-index) e o primeiro toque ao abrir a trilha não se perde (a sincronização ao focar a janela é silenciosa e não trava o botão).
- Ao apertar Continuar, os três pontos de carregando aparecem na hora.
- A trilha abre sempre no fim da conversa, sem ancorar no título da aula longa.
- Alternativas do exercício: sempre uma por linha, em qualquer largura.

## Base v1.1: fechamento (16/10/2026)

Regras 1.1.27 a 1.1.38, acrescentadas no fechamento da v1.1 (`Crias Aluno v1.1.dc.html` e `Crias Gestao v1.1.dc.html`). Valem sobre as regras 1.1.1 a 1.1.26 onde houver diferença.

**1.1.27 Gestão no celular** (15/10/2026)

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

**1.1.28 Personagem do monitor** (15/10/2026)

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

**1.1.37 Cabeçalho e rodapé do site na entrada** (16/10/2026)

A entrada do Crias Aluno usa o cabeçalho e o rodapé do site crias.org (pacote "[CRIAS] Atualização Site").

- Cabeçalho fixo no topo, igual ao do site: 64px, largura máxima 1240px, linha fina embaixo, cantos retos. Fundo na cor do menu lateral: #fdfcf9 no claro, #0a1711 no escuro. Demais cores do pacote, ligadas ao tema do Crias.
- Logo à esquerda (`crias-logo-site.svg`; no escuro `crias-logo-site-branco.svg`), 25px de altura, link para https://www.crias.org na mesma aba. A troca claro/escuro é feita no `src` da imagem (nunca por `content: url()` no CSS, que baixa o arquivo só na troca e atrasa o logo). No app, os dois arquivos ficam em `public/` e entram com `<link rel="preload" as="image">` no `index.html`.
- À direita só o botão de trocar tema (40×40, ícone sol ou lua). Sem "Agendar conversa" e sem "Entrar".
- Acima da caixa de login fica só o símbolo do Crias (72px), pulsando como no carregamento (1.1.38). O wordmark saiu de cima da caixa.
- Rodapé do site: LinkedIn e Instagram à esquerda, "© Crias Tecnologia LTDA · 48.188.712/0001-02" à direita (Barlow 13px). **Fundo branco** no claro (preto no escuro, cor do fundo da página), linha fina em cima.
- A malha 3D fica só entre o cabeçalho e o rodapé, nunca por baixo deles.
- A página continua sem rolar quando cabe; se a tela for baixa, rola a entrada inteira (cabeçalho fixo).
- **Medidas exatas do cabeçalho** (17/10/2026, pacote "[CRIAS] Atualização Site (2)"). O protótipo já segue estes valores; o app deve ficar igual:
  - Barra: altura 64px + 1px de linha embaixo. Container com `max-width: 1240px` **incluindo** o padding (`box-sizing: border-box`), `margin: 0 auto`, padding lateral `clamp(20px, 5vw, 40px)`, flex com `align-items: center`, `justify-content: space-between`, `gap: 20px`.
  - Logo: altura 25px, largura automática, `display: block`; o link da logo com `line-height: 0` (sem isso a logo desce alguns px).
  - Botão de tema: 40×40, padding 0, borda 1px, ícone 18×18 com traço 1.5.
  - Posições de conferência: em janela de 1440px a logo começa em x = 140 (top 19,5px) e a borda direita do botão de tema fica em x = 1300 (top 12px). Em janela de 986px: logo em x = 40, botão termina em x = 946.
  - Causas comuns de diferença no app: container em `content-box` (fica 80px mais largo); valores convertidos para rem com raiz diferente de 16px; padding ou margem do layout pai somados ao cabeçalho; `line-height` herdado no link da logo; logo com outro arquivo ou `height` em rem/em; barra de rolagem da página reduzindo a largura; zoom ou `transform` em algum elemento acima.

**1.1.38 Carregamento com o símbolo do Crias** (16/10/2026)

Vale para todo carregamento com o símbolo: abertura do Crias Aluno e do Crias Gestão, troca pelo seletor Aluno/Gestão (que abre o outro app), estado carregando de cada página, "Tentar de novo" na Gestão e símbolo acima da caixa de login.

- O símbolo aparece **completo desde o primeiro quadro**. Nunca pode aparecer só o brilho (esfumaçado) sem o símbolo.
- Arquivo: `crias-symbol-192.png` (192×192, cerca de 37 KB) no lugar do `crias-symbol.png` de 1000×1000 (443 KB), que demorava a carregar. No app: em `public/`, com `<link rel="preload" as="image" href="/crias-symbol-192.png">` no `index.html` dos dois apps.
- O brilho atrás do símbolo só aparece depois que a imagem carregou (classe no `onLoad` da imagem, ou imagem já em cache).
- Animação: ciclo de 2,4 s; o símbolo sobe 9%, cresce até 1,06x e balança de -6° a 5°; o brilho (18% maior que o símbolo) pulsa de 0,9x a 1,12x. Brilho amarelo `rgba(255,213,0,.4)` no claro e verde `rgba(0,190,133,.35)` no escuro.
- Tamanho: 64px no carregamento, 72px no login.
- Carregamento de abertura: mínimo de 1,1 s na tela e saída em 0,4 s (opacidade).
- Com movimento reduzido, fica parado.

**1.1.36 Ajustes finais da Gestão v1.1** (16/10/2026)

- Orientações (nova trilha e Configuração): subtítulo "Os conteúdos são gerados por padrão pela sequência abaixo. Você pode enviar orientações específicas." seguido da sequência visual Contextualização > Introdução > Exemplos > Desenvolvimento > Conclusão.
- Trilha criada e **ativa**: na Configuração, Objetivo, Estrutura e Orientações ficam **bloqueados**, com a etiqueta "Somente visualização" à direita do título. Cadastro continua editável pelo lápis.
- Adicionar atividades com IA: "Gerar prévia" abre a **página Prévia** dentro da aba (não é janela), com subtítulo "Revise os conteúdos para adicionar atividades. Você pode revisar ou excluir as atividades depois.", Cancelar e "Adicionar atividades" no topo à direita. Uma atividade por linha (número na sequência da última atividade + título); a primeira começa aberta; abrir outra mantém as abertas; aberta mostra cada etapa com o conteúdo gerado (Conteúdo / Exercício X de Y). Ao adicionar, volta para o Conteúdo com as atividades no topo e o bloco de IA recolhido. Tag IA à direita, ao lado da seta.

## Orientações para o backend (Cursor), v1.1 (fechamento)

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

**1.1.35 Consolidação das regras da Gestão v1.1** (16/10/2026)

Vale sobre 1.1.29 a 1.1.34 onde houver diferença.

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
- Todo conteúdo começa 36px abaixo do subtítulo (1.1.30); linhas fixas no cabeçalho também.
- Filtrar instituições (Super admin) ou nome da escola (Instituição) ficam no topo à direita, na linha do Voltar.

**1.1.34 Criação de trilha (fluxo único)** (16/10/2026)

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

**1.1.33 Nova trilha e alunos da instituição** (16/10/2026)

- **Definir passo a passo** abre a mesma página de uma trilha aberta (Estrutura, Conteúdo, Alunos, Gabarito), vazia: cadastro já em edição, objetivo Reforço e profundidade Média. Em Alunos, "Adicionar alunos" lista todos os alunos da instituição e "Remover alunos" fica vazio até alguém ser ativado.
- **Instituição > Remover alunos:** mesmo modelo do em massa da trilha, aplicado à instituição. "Baixar base de alunos ativos e inativos" (inativos primeiro, depois ativos; nome, código, telefone, ativo sim / não) e "Importar em massa", com a confirmação "Tem certeza que deseja alterar os alunos da instituição em lote?". Inativar na instituição tira o aluno do acesso, mas mantém o histórico; o aluno continua na base.

**1.1.32 Regras de importação e cadastro** (16/10/2026)

- Alunos adicionados a uma instituição pelo menu Instituições (cadastro ou CSV) são **sempre adicionados à base** de alunos.
- **Regra importantíssima:** importar planilha de conteúdo **sempre ADICIONA atividades** à trilha. Nunca substitui nem apaga as existentes.
- Alunos da trilha: "Adicionar ou remover" usa chaves Ativo/Inativo por aluno; o aluno não muda de lugar ao alternar; cada aba guarda sua seleção; o Salvar do título aplica tudo de uma vez. Planilha em massa: inativos primeiro, depois ativos, com nome, código, telefone, ativo (sim / não); importar pede confirmação.

**1.1.31 Código do aluno** (15/10/2026)

- Na página Alunos, o filtro único vira dois: "Filtrar por nome" e "Filtrar por código", lado a lado.
- Na tabela, o código ganha coluna própria, logo depois de Nome, ordenável.
- **Regra:** o código mostra só o número, sem prefixo nem zeros à esquerda (banco `al-001` → interface `1`). A ordenação usa o valor numérico.

**1.1.30 Posição inicial do conteúdo (Gestão)** (15/10/2026)

- Referência: Início no perfil Instituição, onde o botão Dados começa abaixo do subtítulo.
- Em toda página, o primeiro conteúdo abaixo do cabeçalho começa nessa mesma altura: 36px abaixo do subtítulo. Na web, o cabeçalho tem altura mínima de 194,7px (`--hd-min`), contando o respiro de 36px do esmaecimento, então páginas sem subtítulo começam no mesmo ponto.
- Páginas com uma linha fixa no cabeçalho (filtros de Trilhas e Dados, abas da trilha) começam essa linha na mesma posição, 36px abaixo do subtítulo. O que fica fixo e o esmaecimento abaixo dela não mudam.

**1.1.29 Dados: exportar histórico de exercícios** (15/10/2026)

- Na aba Exercícios de Dados, acima da tabela: à esquerda o texto "Clique no exercício para abrir o enunciado" (na posição do "Filtrar alunos" da aba Alunos); à direita o botão principal "Exportar histórico".
- Clicar no título do exercício abre, abaixo da linha, o enunciado com as alternativas, a contagem de respostas de cada uma e o gabarito. A seta ao lado do título gira ao abrir.
- **Regra de exportação:** "Exportar histórico" baixa um CSV com a tabela completa, exatamente como está na tela: todas as linhas que passam pelo "Filtrar trilhas" do topo (sem paginação) e todas as colunas (Trilha, Atividade, Título, % de acerto, Respostas, Acertos, Erros, Gabarito), na ordem de classificação atual. Uma linha por exercício.

## Base v1.1: primeira parte (15/10/2026)

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

**1.1.26 Revisão geral da primeira parte da v1.1** (15/10/2026)

A primeira parte da v1.1 foi revisada neste ponto. O fechamento da v1.1 continua nas regras 1.1.27 a 1.1.38.

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

# INTERFACE.md, acréscimo v1.2.1

## v1.2.1 (27/10/2026)

**1.2.1.1 Monitor no Início do aluno.** O símbolo do Crias acima da saudação dá lugar ao personagem do monitor (`crias-monitor.js`), com 128px (o dobro dos 64px do símbolo). Margem de -12px em cima e embaixo: a saudação desce só parte do espaço ganho e a composição continua centralizada. Movimento em uma única sequência, a 60% da velocidade: carregando (anel orbitando, cerca de 4s), pulo suave e parado com pulso leve por cerca de 7s; depois recomeça. Estado novo `entrada` no componente. Com movimento reduzido, fica parado. O símbolo do Crias continua na entrada e na trilha concluída.
