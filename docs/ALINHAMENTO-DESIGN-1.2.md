# Alinhamento com o Claude Design: o que mudou no código depois do pacote 1.1.1.b

Referência: o pacote do Claude Design entrou no repositório em `bceaf2d` (25/10, 14:22). Tudo abaixo foi feito depois, no código (Aluno e Educação), e **ainda não está no protótipo nem em INTERFACE.md**. Pedido ao Design: refletir no protótipo, em INTERFACE.md e no design system.

## 1. Regras novas (valem para toda a aplicação)
- **Login por telefone OU e-mail** (pelo menos um; nome sempre obrigatório) para alunos e usuários da Educação. O sistema identifica o que foi digitado. Com os dois, a pessoa escolhe qual vale para a senha (campo `login_identifier`). Formulários de aluno e de usuário ganham o campo E-mail e a escolha.
- **Salvar e Cancelar ficam ocultos** e só aparecem com alteração pendente que precise de confirmação (no topo da página). Ações em massa confirmam na própria tela e não usam o Salvar do topo. Sair com alteração pendente mostra aviso.
- **Excluir usuário** fica sempre visível, independente do botão Editar. **Excluir ao lado de "Aluno ativo"** na página do aluno.
- **Perfis editáveis:** o Super admin edita o menu de Admin e Básico (cartão de perfis em Permissões).
- **Texto ao aluno sempre por IA** (padrão): etapas de conteúdo de trilha nova nascem como IA, com título e comando por tipo de bloco (Introdução, Explicação, Exemplo prático, Aprofundamento, Conclusão). Exercício segue como está. Sem mudança visual direta; afeta a Prévia e a lista de etapas.

## 2. Ações em massa (padrão único, `BulkPanel`)
Mesma sequência em alunos, usuários, trilha, gabarito e senhas: baixar planilha, carregar, ação, confirmação em linha com contagem, resultado com erros. Resumo final no formato "X alterados, Y com erro". Confirmação sempre com "Essa ação não pode ser desfeita.". Planilha de cadastro exige ID da instituição; colunas Telefone e E-mail (um dos dois). Vocabulário "atividade" e "etapa" nas planilhas. Na página da Instituição, botão "Ver em alunos" ao lado da mensagem final.

## 3. Educação (antiga Gestão)
- Menu no topo, logo "Crias | Educação", Voltar único, página **Perfil** (nome, telefone, e-mail, escolha de login), menu em drawer no celular.
- Usuários unificados (Usuários e Permissões na mesma tela): Editar ao lado do título, Nome e Telefone, Salvar no topo.
- **Senhas:** senha gerada ou alterada fica pendente e só grava no Salvar do topo; coluna E-mail.
- **Lista de trilhas:** filtros de trilhas e matérias, botão Abrir, coluna Instituição só quando há mais de uma.
- **Nova trilha em três etapas:** Configuração, Prévia (três colunas, com atividades; recolhe pela rolagem; pop-up de criar) e Adicionar alunos. A trilha nasce ativa. Ativar sem confirmar; desativar com pop-up. Alterar cadastro com pop-up.
- **Trilha aberta:** aba Conteúdo com rótulo "Novas atividades" e dois painéis lado a lado; "Trilha ativa" na linha das abas (chave mantém o tamanho no celular); cabeçalho do painel de IA quebra linha no celular; trilhas vinculadas ao aluno ficam pendentes até o Salvar do topo.
- **Alunos:** colunas e ordem do design 1.1.1.b.
- **Instituição:** cadastro por lápis, ações em massa de alunos; Início da escola usa o mesmo cadastro.
- **Dados:** filtros fixos (trilhas e pesquisa por nome ou telefone), resumo com 5 cartões, Conclusão com filtro por % e Situação em pizza, Uso do monitor, Desempenho, abas sem mover os cartões, seletores de Atividades e Etapas, aviso quando não há exercícios.

## 4. Aluno
- **Painel em dashboard:** Progresso, Desempenho (Mais erros, Mais acertos), Uso do monitor; a barra do monitor leva à Monitoria.
- Página **Perfil** (nome no rodapé do menu) e pop-ups padronizados.
- Menu recolhe as outras trilhas ao abrir uma; botão "Voltar para página inicial".

## 5. Tela cheia (Aluno e Educação)
Botão redondo de tela cheia; em tela cheia vira X, e Esc também sai. Navegação plena em tela cheia, que se mantém ao trocar de app.

## 6. Pontos para o Design validar
- Telas de tablet (retrato e paisagem) da Prévia de Nova trilha, de Dados e do Painel do aluno.
- Textos dos pop-ups novos (sair sem salvar, desativar trilha, alterar cadastro).
- Campo E-mail e escolha de login nos formulários de aluno e usuário, e na página Perfil.
