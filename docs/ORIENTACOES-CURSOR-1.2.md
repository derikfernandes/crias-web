# Orientações Cursor 1.2

Lido por quem vai subir o 1.2 e publicar. Itens marcados **CURSOR** são trabalho de servidor / regras.
A regra de login (telefone / e-mail / `login_identifier`) está em `frontend/crias-gestao/src/lib/loginRule.ts`.

## 1. Login e cadastro (CURSOR)

Ver `loginRule.ts`. Backend: `api/student.ts` (email + login_identifier; telefone opcional com e-mail), `identifyStudent` respeitando `login_identifier`, `studentPanelService` com `trail_id` nos erros e email/login_identifier do aluno, `firestore.rules` com `admin_profiles`.

## 2. Perfis de menu (CURSOR)

Coleção `admin_profiles` (admin|basico). Deploy das regras do Firestore à parte (`firebase deploy --only firestore:rules`). Não misturar com deploy do app.

## 3. Senhas aluno

Regras do dérik: 6 chars CSPRNG (letras+números), hash + AES no servidor, auditoria ao regenerar, aluno nunca troca, só Master vê. Senha nunca no código-fonte.

## 4. Antes de publicar
`npm run typecheck && npx vitest run && npm run build`, deploy das regras do Firestore, conferir o login do aluno por telefone e por e-mail.

## Correção: texto ao aluno sempre por IA (padrão)

- `phasesFromConfig` (frontend/crias-gestao/src/lib/trailConfig.ts): etapas de conteúdo nascem `stage_type: 'ai'` com título e comando do bloco por posição (Introdução, Explicação, Exemplo prático, Aprofundamento, Conclusão), alinhados ao item 5.2 do prompt gerador. Exercício segue `exercise`. `fixed` continua existindo, mas só se escolhido.
- Salvar a Estrutura preserva título, tipo e comando já gravados na mesma posição (antes sobrescrevia tudo).
- `server/lib/trail-ai/geradorSystemPrompt.ts`: removido fragmento solto, resíduos `&#x20;` e numeração corrigida (6.5 e 8). Se o doc `ai_prompts/gerador_trilha` no Firestore for cópia do texto antigo, atualizar com o fallback.

## Feedback imediato e Etapa conclusiva (só interface)

- As duas chaves da Estrutura (ligadas por padrão) não criam campo novo: feedback e conclusão são etapas de IA comuns em `phase_blueprint` e `trail_stages`. Feedback: etapa `ai` com título "Feedback" logo depois de cada exercício. Conclusão: etapa `ai` com título "Conclusão", a última. Ao ler a trilha, `configFromTrail` (frontend/crias-gestao/src/lib/trailConfig.ts) devolve as chaves por esses títulos e posições.
- `ai_trail_generate` recebe `structure` já com essas etapas (`content` para feedback e conclusão) e a variável `ordem` com as palavras conteúdo, exercício, feedback, conclusão. **Prompt de geração (a prever):** etapa logo depois de exercício = feedback; etapa final = conclusiva.
