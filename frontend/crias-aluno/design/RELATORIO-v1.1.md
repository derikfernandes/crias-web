# Relatório da v1.1

Aplicada sobre o `main` (v1.0) no branch `v1.1`. Fonte: `INTERFACE.md` e protótipos v1.1.

## Aplicado
**Gestão (`frontend/crias-gestao`)**
- Base visual nova: tokens, menu com seleção aberta e curvas, topo com Voltar e filtro de instituições, tema claro e escuro, símbolo de carregamento, janelas de confirmação e de DELETAR, esmaecimento no lugar de reticências, seletor Gestão | Aluno.
- Início (Super admin e Instituição), Dados, Trilhas, Alunos, Senhas, Prompts, Permissões, Usuários (Crias e Instituições), Aluno, Nova instituição, Entrada.
- Trilha: Configuração (Cadastro, Objetivo, Estrutura, Orientações; bloqueada com a trilha ativa), Conteúdo (atividades, etapas, liberar e bloquear, excluir com DELETAR), Alunos (Ativo e Inativo em lote, planilha em massa), Gabarito.
- Nova trilha: seis passos, prévia, "Salvar trilha" só então grava.

**Importação e exportação**
- Atividades por planilha e por IA **sempre adicionam** (numeração continua, entram no topo, nada é substituído).
- Alunos da instituição: cadastrar em massa (Nome, celular, senha, trilha) e remover em massa (remover sim ou não, com DELETAR). Remover tira o acesso e mantém o histórico.
- Alunos da trilha: baixar base (inativos primeiro) e importar com confirmação.
- Senhas: exportar CSV, carregar CSV, "Alterar senhas" com confirmação, gerar para quem não tem.
- Dados > Exercícios: "Exportar histórico" baixa a tabela completa, na ordem atual.

**Criação de trilha por IA** (`server/lib/ai-trail-generation/generateFromConfig.ts`)
- Mensagem = prompt fixo do sistema (`criar_trilha_ia`) + Configuração de geração + fontes. As 12 variáveis (`[nome]`, `[materia]`, `[descricao]`, `[objetivo]`, `[conteudos]`, `[exercicios]`, `[ordem]`, `[atividades]`, `[alternativas]`, `[habilidades]`, `[orientacoes]`, `[arquivos]`) sempre vão; campo vazio vai como N/A.
- Resultado validado contra o pedido (quantidade, ordem das etapas, alternativas, gabarito) com um reparo automático.
- Sem habilidades, orientações e arquivos, não chama a IA: a prévia tem só a Atividade 1 em branco.

**Aluno (`frontend/crias-aluno`)**
- Personagem do monitor nas mensagens do monitor e no carregando; Continuar mostra só os três pontos.
- Painel individual (`/painel`) e API `GET /api/student_trails?facade=panel`.
- Seletor Aluno | Gestão, largura única de 780px, alternativas uma por linha, seta verde, tokens da v1.1.

## Decisões e diferenças em relação ao protótipo
- **Campos novos opcionais** (spec atualizada): `trails.objective`, `guidelines`, `options_count`; `trail_stage_questions.step_title`; `admin_users.name`, `phone`, `profile`; `admin_settings/profiles`.
- **Senha dos usuários da Gestão** é do Firebase Auth: no lugar de copiar e gerar, há "Redefinir senha" (e-mail). Gerar e copiar exigiria endpoint com Admin SDK. TODO backend v1.1 (orientação 19).
- **Criar usuário da Gestão** grava `admin_users`; a conta de login precisa existir no Firebase Auth (como já era).
- Início: Conclusão e Acerto médios por instituição vêm do Firestore (vínculos e tentativas). Dados usa o cálculo por logs, como antes; os números podem diferir levemente.
- Dados: removidos seletor de colunas e de tópicos (não existem no desenho). "Exportar histórico" por trilha (xlsx) do aluno continua.
- Etapas novas de conteúdo são gravadas como `fixed` (texto final). Etapas `ai` antigas aparecem como Conteúdo.
- Excluir atividade renumera as seguintes (a posição dos alunos usa o número).
- "Painel" do aluno e o prompt "Criar trilha com IA" só leitura (invisível para a escola).
- Os prompts de IA no servidor continuam falando "parceiro de estudo" (decisão do sócio); as telas dizem Monitor.

## Pendências conhecidas (v1.1 do aluno)
- Menu do aluno com seleção aberta e curvas (1.1.23) e topo/menu acompanhando a rolagem (1.1.4) ainda no visual da v1.0.
- Fundo malha 3D e esmaecimentos finos da Gestão simplificados.
- O Firestore Rules não bloqueia a leitura de `password_hash` por admins logados (assunto do sócio).

## Como testar sem banco
- Gestão: `npm run dev:mock -w crias-gestao` (porta 5180, Firebase e API simulados em memória, login automático como Super admin Master).
- Aluno: `node frontend/crias-aluno/dev/mock-api.mjs` e `npm run dev -w crias-aluno`.
