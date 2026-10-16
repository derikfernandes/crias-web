# Prompt para o Claude Code: aplicar a v1.1 (final) do Crias

Cole o texto abaixo no Claude Code, na raiz do repositório thiagocrias/crias-web (branch main), depois de copiar o conteúdo de `export/repo/` por cima da raiz.

---

Você vai aplicar a **v1.1** do redesign do Crias nos apps `frontend/crias-aluno` e `frontend/crias-gestao`.

**Fonte de verdade**
- Regras: `frontend/crias-aluno/design/INTERFACE.md` (seções "Base v1.1", em especial 1.1.9 e 1.1.10, e "Orientações para o backend (Cursor), v1.1"). Onde houver conflito, vale a v1.1, depois a v1.1, depois a v1.0.
- Protótipos (abra no navegador para comparar): `frontend/crias-aluno/design/prototipo/Crias Aluno.dc.html` e `Crias Gestao.dc.html` (ou as versões `offline.html`). Personagem do monitor: `crias-monitor.js` e `Monitor Personagem.dc.html`.
- Regras gerais do projeto: `CLAUDE.md` na raiz.

**Escopo**
1. Camada visual e de apresentação: estilos, JSX, textos, ordem de blocos, estados de botões (ativo só com alteração, DELETAR para excluir), passos da nova trilha, tabelas com ordenação por coluna, filtros, posição inicial do conteúdo (203px) e esmaecimento do cabeçalho.
2. Não mude contratos de API, modelos ou regras de negócio no backend. Onde a tela precisar de dado ou endpoint que ainda não existe, crie a interface com dados mockados isolados (um arquivo por recurso) e marque com `// TODO backend v1.1: <item da lista "Orientações para o backend">`.
3. Itens marcados como CONFLITO em INTERFACE.md param e pedem aval.

**Ordem sugerida**
1. Tokens e componentes base (botões 36px/13px, campos 40px, chaves on/off, etiquetas, janela de confirmação com DELETAR, cabeçalho fixo com esmaecimento).
2. Crias Aluno: personagem do monitor; ao Continuar só três pontos; carregando do monitor só ao enviar mensagem.
3. Gestão, navegação e topo (filtro de instituições ou nome da escola à direita, na linha do Voltar).
4. Gestão, páginas: Início, Dados, Trilhas (Configuração, Conteúdo, Alunos, Gabarito; nova trilha em 2 passos), Alunos, Instituição (cadastrar e remover alunos por planilha), Senhas, Permissões, Usuários (abas Crias e Instituições), Prompts, API.
5. Revisão final de textos: português do Brasil, sem travessão, "N/A" para dado ausente, "etapa" e "exercício", nunca "passo" nem "bloco" em texto de interface.

**Entrega**
- Commits pequenos por área, mensagem em português.
- Ao final, gere `frontend/crias-aluno/design/RELATORIO-v1.1.md` com: o que foi aplicado, os TODOs de backend criados (com o número do item correspondente em "Orientações para o backend") e as diferenças que ficaram em relação ao protótipo.
- Não apague versões anteriores nem arquivos de `design/`.
