# Troca para o frontend-v1 (app do aluno novo)

Este documento define a troca do app do aluno antigo (`frontend-v0`) pelo novo (`frontend-v1`, design Crias Aluno v6). Serve para quem vai publicar (o sócio) e para quem aprova (Thiago).

Regra da troca: **só a interface do aluno muda. API, servidor, banco, regras do Firestore e painel da escola ficam como estavam.**

## 1. Versões e como voltar

| Etiqueta | O que é |
|---|---|
| `frontend-v0` | Repositório do sócio como estava, com o app do aluno antigo (`964f5aa`). |
| `frontend-v1` | O mesmo repositório com o app do aluno novo. É o que está na `main`. |

Voltar ao antigo, se algo der errado em produção: fazer o deploy da etiqueta `frontend-v0` na Vercel (ou `git revert` do commit de merge). Nada no banco precisa ser desfeito, porque a troca não escreve nada novo nele (ver seção 2).

## 2. O que NÃO mudou (e como provar)

| Item | Estado | Prova |
|---|---|---|
| `api/` (funções da Vercel) | Idêntico | `git diff --stat frontend-v0 frontend-v1 -- api` não mostra nada |
| `server/` (lógica, prompts, motor de trilhas) | Idêntico, exceto um caminho de arquivo num teste (`trilha-admin` virou `crias-painel`) | `git diff frontend-v0 frontend-v1 -- server` |
| `firestore.rules` | Idêntico | `git diff --stat frontend-v0 frontend-v1 -- firestore.rules` |
| Painel da escola | Mesma lógica, mesmos dados. A pasta mudou de nome (`trilha-admin` virou `crias-painel`) e os **textos de tela** seguem o vocabulário trilha, atividade, etapa (`docs/VOCABULARIO.md`). Nenhum nome de campo, coleção ou rota mudou | `git diff -M frontend-v0 frontend-v1 -- frontend/crias-painel` mostra renomeações e troca de palavras em textos |
| Rotas de API chamadas pelo aluno | As mesmas 11 | `conversation_logs`, `exercise_attempts`, `student/identify`, `student_trails`, `student_trails/advance`, `student_trails/history`, `student_trails/maria`, `student_trails/next-content`, `trail_stage_questions`, `trail_stages`, `trails` |
| `vercel.json` | Só o `outputDirectory` (`frontend/crias-painel/dist`) | O build raiz copia o app do aluno para `dist/aluno`, como antes |
| Variável de ambiente do aluno | A mesma (`VITE_API_BASE_URL`) | `frontend/crias-aluno/.env.example` |
| Endereço do app do aluno | Continua `/aluno/` | `base: '/aluno/'` no `vite.config.ts` |

Alterações fora de `frontend/` (todas são nome de pasta): `package.json`, `package-lock.json`, `vercel.json`, `vitest.config.ts`, scripts de contrato, `CODEOWNERS`, `docs/architecture.md`, `specs/`.

## 3. O que mudou de propósito

- Visual novo do aluno (tema claro e escuro, fundo animado, símbolo animado).
- Vocabulário: trail = trilha, question = atividade, stage = etapa (ver `docs/VOCABULARIO.md`). Só texto de tela: nomes de campos, coleções e rotas continuam iguais. O tutor aparece como **Monitor** (a Maria saiu da interface).
- A conversa mostra a trilha inteira. Ao subir, carrega as atividades anteriores sozinha. O menu lateral leva ao começo de cada atividade.
- A Home mostra só as 2 primeiras trilhas **não concluídas**. Trilhas concluídas não aparecem. Se todas estiverem concluídas, mostra "Você concluiu todas as suas trilhas."
- Conversa direto com o Monitor fora de uma trilha: continua gravada com o id `Tutor - Maria` (está na lista permitida do uso de agente do servidor). Não renomear sem mexer no servidor.
- Falas do Monitor no histórico são reconhecidas por `metadata.source === 'maria-tutor'`, que o servidor já grava.
- Os dois apps continuam dentro da pasta `frontend/`: `frontend/cria-frontend` virou `frontend/crias-aluno` e `frontend/trilha-admin` virou `frontend/crias-painel`.

## 4. Verificado antes da troca

Feito no computador de Thiago, com um servidor de exemplo (dados fictícios, sem banco):

- `npm run build` (painel e aluno) passa.
- `npm run typecheck` passa.
- 320 testes do `vitest` passam. 21 testes de contrato (rotas, coleções do Firestore, agent-usage) passam.
- Navegador: login, Home, trilha, histórico completo com carga ao subir, atividade pelo menu, exercício (acerto e erro), Monitor, tema claro e escuro, celular (402 px) e computador.

**Não verificado** (precisa de ambiente real):

- Conteúdo real das trilhas e respostas reais da IA.
- Login e dados de alunos reais.
- Comportamento na Vercel (domínio, cache, variáveis).
- Falha já existente, não causada pela troca: `scripts/check-design-boundaries.mjs` falha (arquivos do painel em `design/` importam `lib/`). Confirmado igual na `frontend-v0`.

## 5. Antes de publicar (sócio)

1. Na Vercel, conferir **Root Directory** (raiz do repositório), **Build Command** `npm run build`, **Output Directory** `frontend/crias-painel/dist`. Esses valores vêm do `vercel.json`; se a Vercel tiver valores digitados à mão com os nomes antigos (`cria-frontend`, `trilha-admin`), trocar.
2. Criar um **deploy de prévia** (branch ou Pull Request). **Nunca testar a troca direto na produção.**
3. Apontar a prévia para um **projeto Firebase de teste**, com as mesmas variáveis de ambiente de produção, trocando só as credenciais.
4. Rodar o roteiro da seção 6 na prévia.
5. Só então promover para produção.

## 6. Roteiro de teste na prévia

Fazer com um aluno de teste, no celular e no computador.

1. `/aluno/` abre o login. Entrar com um login e uma senha válidos. Dado errado mostra "Não foi possível entrar. Confira os dados.".
2. Home: aparecem no máximo 2 trilhas, as primeiras não concluídas. Trilha concluída não aparece.
3. Abrir uma trilha em andamento: aparece a etapa atual. **Continuar** avança. O número "Etapa A de B" sobe.
4. Fechar e abrir de novo: continua onde parou e o histórico carrega.
5. Subir a conversa: atividades anteriores carregam sem pular.
6. Menu lateral: clicar numa atividade anterior leva ao começo dela.
7. Etapa de exercício: responder certo e errado. O selo, o feedback e o avanço batem com o que o produto antigo fazia.
8. Perguntar ao Monitor dentro da trilha e fora dela. Recarregar: as falas aparecem com o rótulo "Monitor".
9. Terminar uma atividade e uma trilha: aparecem "Atividade concluída" e "Trilha concluída".
10. Tema escuro e claro. Sair (menu, "Sair") e entrar de novo.
11. No painel da escola (`/`): conferir que as conversas e as respostas do aluno de teste aparecem normalmente.

Se qualquer item de 1 a 9 falhar, não promover. Voltar à `frontend-v0` (seção 1).

## 7. Pendências conhecidas

- Vocabulário no editor de trilhas, nos prompts do servidor e nas planilhas: ver "Onde ainda não vale" em `docs/VOCABULARIO.md`.
- Link "Painel" no menu do aluno leva a `/`; botão "Abrir perfil" ainda não tem destino.
- Renomear `maria-tutor` e `Tutor - Maria` no servidor é decisão do sócio (o servidor precisaria ler os dois nomes durante a transição).
- As 68 branches antigas do sócio foram mantidas.
