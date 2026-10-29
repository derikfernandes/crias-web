# Relatório da aplicação do pacote 1.2.5 no app (Crias Aluno)

Data: 28/10/2026. Fonte: INTERFACE.md, "Pacote 1.2.5" (1.2.5.1 a 1.2.5.12), e o protótipo `Crias Aluno.dc.html`.

## Prioridade desta entrega: erro dos exercícios (corrigido)
Aluno não avançava: "Não foi possível carregar as opções deste exercício." e feedback que contradizia o acerto/erro.
Causa e regra nova em `docs/REGRA-EXERCICIOS.md`. Resumo:
- "I." e "II." do enunciado eram lidos como alternativa "I"; a sequência (I, A, B, C) falhava, o exercício ficava sem alternativas e a linha "I." era apagada. Agora **a partir de "A)" já é alternativa; o que está acima é enunciado**.
- Gabarito: abaixo das alternativas ("Gabarito: B", "A resposta é B") ou na etapa seguinte ("A resposta correta é a letra B"). Sai do texto e fica só registrado. Um único resolvedor (`resolveCorrectKey`) pontua a tentativa **e** alimenta o feedback, então os dois não discordam.
- Alternativa sem marcador agora ganha a letra da posição como chave (antes a chave era o texto inteiro e nunca batia com o gabarito).
- Parser único em três espelhos idênticos (server, Aluno, Gestão), com teste de paridade, e `npm run audit:exercises` para listar no banco o que ainda estiver errado.

## Aplicado do 1.2.5
| Item | Estado |
|---|---|
| 1.2.5.1 Início com retomada (cartão principal "CONTINUE DE ONDE PAROU" / "COMECE POR AQUI", demais trilhas em linhas compactas, cartão primeiro e linhas 0,2s depois) | Aplicado |
| 1.2.5.7 Ícones nas mensagens: 38px na web e 33px no celular | Aplicado |
| 1.2.5.11 Check verde desenhado em "Trilha concluída" | Aplicado |
| 1.2.5.11 Trilha concluída: botão "Início", **sem ícone de casinha** | Aplicado (cartão); protótipo corrigido (sem o ícone) |
| 1.2.5.12 Painel sem "Sua semana" | Já era assim no app |

## Ainda não aplicado (fica para a próxima etapa)
- 1.2.5.2 / 1.2.5.7 / 1.2.5.8 / 1.2.5.9: régua de etapas com cores por tipo e tempo, "Etapa X de Y" / "Atividade X de Y" abaixo da régua, topo só com o nome da trilha.
- 1.2.5.3 / 1.2.5.4 / 1.2.5.7: monitor em destaque com trechos grifados (2 ajudas + continuar), correção do exercício pelo monitor.
- 1.2.5.5 / 1.2.5.10 / 1.2.5.11: caixa "Atividade concluída" com estatísticas e fechamento automático, "NOVA ATIVIDADE", e o Continuar virando "Início" na barra da trilha concluída.
- 1.2.5.8 a 1.2.5.12: geração única de mensagem (caixa de espera no lugar final, esmaecimento, respiro de 0,9s), exercício sem símbolo com etiqueta "Responda", resposta do aluno subindo ao topo, feedback como bloco "Acertou/Quase".
- 1.2.5.6: constância no Painel (o pacote já a retirou na 1.2.5.12).
Motivo: mexem no coração do `PlayerPage` (fluxo de mensagens, exercício e avanço), que não deve ser alterado junto com a correção do erro dos exercícios. Precisam de dados que o app não tem hoje (tipo de cada etapa da atividade, tempo de estudo por atividade).

## Checar com o backend
- Tipo de cada etapa por atividade (conteúdo, exercício, feedback, conclusão) para a régua.
- Tempo de estudo por atividade e datas de estudo por dia (fuso America/Sao_Paulo).
- Rodar `npm run audit:exercises` com a conta de serviço para achar exercícios antigos com problema.
