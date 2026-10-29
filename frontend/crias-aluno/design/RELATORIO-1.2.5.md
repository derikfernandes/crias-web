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
| 1.2.5.1 Início com retomada (cartão principal, demais trilhas em linhas, cartão primeiro e linhas 0,2s depois) | Aplicado |
| 1.2.5.2, .7, .8, .9, .11 Régua da atividade: nome da atividade, um segmento por etapa nas cores da Gestão (conteúdo, exercício, feedback, conclusão), feita e atual em cor cheia sem piscar, à frente com contorno; abaixo, "Etapa X de Y" em negrito (ou "Exercício Z de W", também no feedback dele) e "Atividade X de Y" à direita; topo só com o nome da trilha ("Conversar com seu monitor" na Monitoria) | Aplicado. Os tipos vêm de `/api/trail_stages?simple=1` (tipo e título); feedback = etapa de IA logo depois do exercício, conclusão = última etapa com título "Conclusão" |
| 1.2.5.3, .4, .7 Monitor em destaque (fundo azul muito claro, 52px, sem rótulo, trechos grifados tocáveis: 2 ajudas + continuar) | Aplicado só na 1ª etapa de cada atividade e no fim da atividade, como na 1.2.5.7. Frases fixas do frontend que variam por atividade (`lib/monitorOffers.ts`). Tocar numa ajuda envia a pergunta ao monitor; tocar em continuar avança |
| 1.2.5.5, .7, .10 Fechamento da atividade: check, "Atividade concluída", nome, etapas, exercícios certos com barra, tempo e "PRÓXIMA", sem caixa, seguido do monitor | Aplicado. "Exercícios certos" vem do painel (`by_activity`); o tempo é a estimativa da régua (sem dado no banco) |
| 1.2.5.9 Conteúdo sem título (só símbolo e texto); exercício sem símbolo e com etiqueta amarela "Responda" | Aplicado |
| 1.2.5.7 Ícones nas mensagens: 38px na web e 33px no celular | Aplicado |
| 1.2.5.11 Check verde desenhado em "Atividade concluída" e "Trilha concluída"; trilha concluída com botão "Início" (sem ícone) no lugar do Continuar, também no cartão | Aplicado |
| 1.2.5.12 Painel sem "Sua semana" | Já era assim no app |

## Ainda não aplicado
- 1.2.5.8 a .11: espera do conteúdo (símbolo + três pontos) e entrada com esmaecimento de 0,5s aplicadas, sem espera artificial (ver `docs/ORIENTACOES-CURSOR-1.2.5.md`). Falta: resposta do aluno subindo ao topo do exercício e rolagem com a resposta presa ao topo.
- 1.2.5.7: "Continuar" travado em "Aguarde…" no fechamento até a caixa final do monitor, feedback do exercício corrigido pelo monitor em destaque (o feedback segue como bloco de conteúdo, como na 1.2.5.12), tocar num segmento feito para rolar até a etapa.
- 1.2.5.5: rótulo "NOVA ATIVIDADE" na linha entre atividades; caixa "Trilha concluída" com estatísticas da trilha.
- 1.2.5.6: constância no Painel (o pacote já a retirou na 1.2.5.12).
Motivo: as animações de geração e o travamento do Continuar mexem no avanço e nos tempos de espera do `PlayerPage`, que hoje reagem à resposta real da API. Vão em uma etapa própria, testada com o backend.

## Checar com o backend
- Tempo de estudo por atividade e datas de estudo por dia (fuso America/Sao_Paulo).
- Marcar a etapa de conclusão com o título "Conclusão" (a Gestão já grava assim em trilhas novas) para a régua pintar o segmento bege.
- Rodar `npm run audit:exercises` com a conta de serviço para achar exercícios antigos com problema.
