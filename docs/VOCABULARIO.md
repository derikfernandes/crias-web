# Vocabulário oficial (de/para)

| No banco e na API (inglês) | Na interface e nos textos (português) |
|---|---|
| `trail` | **trilha** |
| `question` | **atividade** |
| `stage` | **etapa** |

Hierarquia: trilha > atividade > etapa. Exemplo: "Matemática básica" é a trilha. "Atividade 2 de 5" é a segunda atividade. "Etapa 3 de 4" é a terceira etapa dentro da atividade. A etapa que pede resposta chama-se **exercício**.

## Regra de ouro: só o texto muda

Os nomes técnicos **não mudam**: `trail_id`, `trail_stages`, `stage_number`, `question_number`, `trail_stage_questions`, `current_stage_number`, `current_question_number` e as rotas da API continuam como são. A troca de vocabulário vale apenas para o que as pessoas leem (telas, mensagens, documentação). Nenhum dado do banco foi alterado.

## Onde já vale

- App do aluno (`frontend/crias-aluno`): todas as telas, mensagens, comentários e documentação do design.
- Painel da escola (`frontend/crias-painel`): dashboard, gabarito, detalhe de trilha e de aluno, mapa e histórico de trilha, player, páginas de atividades e etapas, página de documentação da API.

## Onde ainda não vale (depende do sócio)

Estes pontos usam outro vocabulário e estão ligados ao que é gravado no banco ou lido de planilhas. Foram deixados como estavam:

1. **Editor e assistente de criação de trilhas** (`TrailForm`, `TrailContentEditor`, `TrailStructureEditor`, `TrailAiCreateWizard`, `TrailNewPage`): ali "Etapa N" quer dizer a **atividade** (`question_number`) e "Fase" quer dizer a **etapa** (`stage_number`). Esses textos também viram o título gravado no banco (por exemplo "Etapa 1 — Questão 1") e os cabeçalhos "Etapa" e "Fase N" da planilha de importação. Trocar exige decidir o que acontece com os títulos já gravados e com as planilhas já em uso.
2. **Servidor** (`server/`, `specs/prompts/`, `docs/prompts/`): os prompts da IA usam "fase", "etapa", "questão" e "passo" no sentido comum da língua. Mexer neles muda o que a IA escreve para o aluno.
3. **Exportação de planilha** do painel (`Stage atual`, `Questão atual`): cabeçalhos mantidos para não quebrar quem já usa o arquivo.
4. Protótipo do painel (`frontend/crias-aluno/design/prototipo/Crias Painel.dc.html`): arquivo exportado do Claude Design, mantido como veio.
