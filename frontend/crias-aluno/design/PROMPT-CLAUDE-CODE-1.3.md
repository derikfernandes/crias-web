# Prompt para o Claude Code: pacote 1.3 (Aluno 1.3 e Educação 1.3)

Repositório `thiagocrias/crias-web`, branch `main`. Este pacote espelha a raiz do repositório.

## 1. Copiar
Copie o conteúdo do pacote por cima da raiz. Arquivos:
- `CLAUDE.md` (regras do projeto)
- `frontend/crias-aluno/design/INTERFACE.md` (regras; a seção **"Pacote 1.3"**, no fim, vale sobre todas as outras)
- `frontend/crias-aluno/design/prototipo/Crias Aluno.dc.html` e `Crias Gestao.dc.html` (protótipos 1.3) com `support.js`, `crias-monitor.js` e `assets/`, mais as versões offline (`Crias Aluno offline.html`, `Crias Gestao offline.html`)
- `frontend/crias-aluno/design/PLANO-1.3.md` (plano e notas técnicas), `DECISOES.md`, `LEIA-ME.md` e `design-system/`

Para abrir os protótipos: `npx serve frontend/crias-aluno/design/prototipo` e abra cada arquivo no navegador. Os tweaks do protótipo (perfil Super admin, Instituição ou Professor; celular; tablet; todasConcluidas; acessoGestao) mostram cada estado.

## 2. Ler antes de mexer
Leia a seção "Pacote 1.3" inteira (1.3.1 a 1.3.18, 1.3.E backend, 1.3.F conferência, 1.3.G conflitos, 1.3.H pontos para validação). Onde o texto e o protótipo divergirem, pare e avise.

## 3. Regras de trabalho
- Só camada visual (estilos e JSX de apresentação). Lógica, API e estado só mudam onde a 1.3 pede de forma explícita (1.3.3 detecção de tela cheia, 1.3.4 espaço vazio no lugar do símbolo, separação do enunciado em 1.3.F).
- Itens que dependem de dado novo do servidor (turma do aluno; matérias, turmas e trilhas do usuário; visibilidade do Professor; vínculo do switch; Exportar base filtrado) ficam marcados como **CONFLITO**: a interface entra pronta, mostrando "N/A" quando o dado não vier, e você lista o que o backend precisa (campos e parâmetros), sem inventar endpoints.
- Não crie scripts que não existem no `package.json`. Se um comando citado em README não existir, avise.
- Português do Brasil, sem travessão. "Etapa", nunca "passo". "Professor", nunca "Básico" como perfil de usuário ("Básico" segue como Nível pedagógico do aluno).

## 4. Ordem
1. **Achados no Aluno (1.3.F):** `MonitorAvatar.tsx` (sem `CriasSymbol` no carregamento), `fullscreen.ts` (detecção), `TrailsPage.tsx` (trilha concluída continua no Início), `api.ts` (sempre separar enunciado e alternativas), restos de "O monitor está digitando" e do cartão antigo de Trilha concluída.
2. **Aluno 1.3.1 a 1.3.5.**
3. **Educação 1.3.6 e 1.3.7** (sem tela cheia; menu lateral igual ao do Aluno).
4. **Turma e matérias 1.3.8 a 1.3.13.**
5. **Usuários 1.3.14 a 1.3.18.**

## 5. Conferência (obrigatória)
Siga o checklist de 1.3.F com o protótipo e o app lado a lado, em computador, tablet (820 e 1180) e celular (402). Para cada item, registre "igual" ou "diferente" e o arquivo do app. Inclua a troca de mensagens do Aluno (1.2.5.8 a 1.2.5.12) e o exercício (enunciado sem alternativas, uma alternativa por linha).

## 6. Fechamento
Rode build e testes que já existem nos dois apps (`frontend/crias-aluno` e `frontend/crias-gestao`). Entregue um relatório com: o que foi aplicado, a tabela da conferência, os CONFLITOS com o que o backend precisa e os pontos de 1.3.H para validação.
