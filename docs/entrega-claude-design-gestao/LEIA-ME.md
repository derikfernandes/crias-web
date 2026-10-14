# Entrega ao Claude Design: novidades da Gestão (versão do sócio, 14/10/2026)

Fonte: `derikfernandes/crias-web`, branch `main` (commit `a143449`). Tudo abaixo é da **Gestão** (antes "painel"). O visual dela ainda é o CSS antigo do sócio (`app.css`), sem o design do Thiago.

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

### 2. Tela nova "Prompts de IA" (rota `/prompts`, só Master)
Lista de prompts, editor de texto, nota da versão, botões Seed (só ausentes), Seed forçado, Recarregar, e Versões anteriores. Tela técnica, pouco usada.

### 3. Pequenos ajustes
- Cadastro de administrador: novo checkbox **Master (senhas dos alunos)**.
- Menu da Gestão: dois itens novos, "Senhas (Master)" e "Prompts IA (Master)", visíveis só para Master.
- Estilos novos da paginação (`.list-pagination__*`) no fim de `app.css`.

### 4. Mudança de vocabulário no app do aluno (já veio no código do sócio)
"Monitor" e "Monitoria" viraram **"Parceiro de estudo"** (menu, título, rótulo das mensagens, placeholder "Pergunte ao seu parceiro de estudo…"). Confirmar com o design se o v1.1 do aluno já usa esse termo.

## O que enviar ao Claude Design
1. Esta pasta (`arquivos/`):
   - `StudentPasswordsPageView.tsx` e `studentPasswordsPageView.types.ts`: a tela de senhas (estrutura, textos, estados).
   - `AiPromptsPage.tsx`: tela de prompts.
   - `AdminPageView.tsx`: onde entrou o checkbox Master.
   - `StudentPasswordsPage.logica.tsx`: só para ler as mensagens e o fluxo (não é para desenhar).
   - `app.css`: o estilo atual da Gestão, como referência do que existe hoje.
2. Do v1.0 (já no repositório): `frontend/crias-aluno/design/design-system/` e `frontend/crias-aluno/design/INTERFACE.md`, para a nova tela herdar o design system.
3. O protótipo atual da Gestão: `frontend/crias-aluno/design/prototipo/Crias Gestao.dc.html`.

## Pedido sugerido (colar no Claude Design)
> Desenhe, no design system do Crias v1.0, a tela "Senhas dos alunos" da Gestão e o ajuste do cadastro de administrador (checkbox Master). Mantenha todos os textos e estados descritos no LEIA-ME. Inclua: seletor de escola, geração em lote com confirmação, exportar CSV, tabela com senha visível/legado/sem senha, paginação numerada, importação por arquivo ou texto com tabela de erros e janela de confirmação no padrão do app. Desktop primeiro. "Prompts de IA" pode ficar para depois.
