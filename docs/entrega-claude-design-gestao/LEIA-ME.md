# Entrega ao Claude Design: novidades da Gestão (versão do sócio, 14/10/2026)

Fonte: `derikfernandes/crias-web`, branch `main` (commit `a143449`), já integrada ao nosso `main`. Tudo abaixo é da **Gestão** (antes "painel"). O visual dela ainda é o CSS antigo do sócio (`app.css`), sem o design do Thiago.

## O que o sócio acrescentou

### 1. Tela nova "Senhas dos alunos" (rota `/alunos/senhas`, só para Master)
- Escolher a escola num seletor.
- Botão **Gerar senhas para alunos sem senha** (em lote, em passos de vários alunos, com confirmação antes).
- Botão **Exportar CSV** (escola inteira) e, depois da geração em lote, um aviso verde com outro **Exportar CSV**.
- Tabela **Alunos da escola**: Nome, Celular, Senha, Ações. A senha aparece em destaque (código). Estados: senha visível, "Legado (sem revelação), gere nova senha", "Sem senha". Ação por linha: **Gerar nova senha** (confirma antes: a anterior deixa de funcionar), com estado "Gerando…".
- Paginação com ~50 por página: "1–50 de N", Anterior, números clicáveis com reticências, Próxima.
- Bloco **Importar CSV**: colunas `nome, celular, escola, trilha (opcional), senha (opcional)`; escolher arquivo ou colar o texto; botão **Importar alunos**; resultado ("Import concluído: X criados, Y atualizados, Z erros, W senhas geradas"); tabela de erros por linha (Linha, Nome, Celular, Erro); botão **Baixar senhas geradas (CSV)**.
- Quem não é Master vê só o aviso de acesso restrito.
- Hoje as confirmações usam `window.confirm`. Pedir ao design uma janela de confirmação no padrão do app.

### 2. Aba "Prompts" (rota `/prompts`, só Master)
Fica no menu da Gestão, no grupo Administração, logo acima de "API e documentação". Tem uma caixa de seleção do prompt (Monitor, Gerador de bloco da trilha, Regras de espaçamento, Criar trilha com IA e o wrapper de sistema), o campo de edição do texto, nota da versão (opcional), botão **Salvar**, e a lista de versões anteriores. Também tem Seed, Seed forçado e Recarregar (técnicos).

### 3. Pequenos ajustes
- Cadastro de administrador: novo checkbox **Master (senhas dos alunos)**.
- Menu da Gestão: "Senhas (Master)" em Gestão acadêmica e "Prompts" em Administração (arquivo `adminPermissions.menu.ts`).
- Estilos novos da paginação (`.list-pagination__*`) no fim de `app.css`.

### 4. Vocabulário
O sócio trocou "Monitor" por "Parceiro de estudo" no app do aluno. **Decisão do Thiago: manter Monitor e Monitoria em todas as telas.** O código aqui já está com Monitor.

## O que enviar ao Claude Design
1. Esta pasta (`arquivos/`):
   - `StudentPasswordsPageView.tsx` e `studentPasswordsPageView.types.ts`: a tela de senhas (estrutura, textos, estados).
   - `AiPromptsPage.tsx`: aba Prompts. `adminPermissions.menu.ts`: ordem do menu.
   - `AdminPageView.tsx`: onde entrou o checkbox Master.
   - `StudentPasswordsPage.logica.tsx`: só para ler as mensagens e o fluxo (não é para desenhar).
   - `app.css`: o estilo atual da Gestão, como referência do que existe hoje.
2. Do v1.0 (já no repositório): `frontend/crias-aluno/design/design-system/` e `frontend/crias-aluno/design/INTERFACE.md`, para a nova tela herdar o design system.
3. O protótipo atual da Gestão: `frontend/crias-aluno/design/prototipo/Crias Gestao.dc.html`.

## Pedido sugerido (colar no Claude Design)
> Este projeto já tem a v1.0 revisada e aprovada (aluno e Gestão). **Não altere nada do que já existe**: telas, layout, cores, textos, componentes e nomes continuam exatamente como estão. Só **acrescente** o que é novo, usando os mesmos componentes e o mesmo design system.
>
> Novo, só na Gestão:
> 1. Tela "Senhas dos alunos" (só Master): seletor de escola, botão "Gerar senhas para alunos sem senha" (com janela de confirmação), "Exportar CSV", tabela Nome / Celular / Senha / Ações (senha visível, "Legado, gere nova senha" ou "Sem senha"; ação "Gerar nova senha" com confirmação), paginação numerada de 50 em 50, e bloco "Importar CSV" (arquivo ou texto colado, resultado, tabela de erros por linha, "Baixar senhas geradas (CSV)").
> 2. Aba "Prompts" (só Master) no menu, grupo Administração, logo acima de "API e documentação": caixa de seleção do prompt, campo de edição do texto, nota da versão, botão Salvar e lista de versões anteriores.
> 3. Checkbox "Master (senhas dos alunos)" no cadastro de administrador.
> 4. Dois itens novos no menu da Gestão: "Senhas (Master)" e "Prompts".
>
> Mantenha "Monitor" e "Monitoria" no app do aluno. Vocabulário: trilha, atividade, etapa. Sem travessão nos textos. Os textos e estados estão descritos neste LEIA-ME e nos arquivos de `arquivos/`.
