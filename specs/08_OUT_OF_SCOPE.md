# Out of Scope — Crias Trilhas

Na fase inicial, não implementar:

- login social / Firebase Auth do aluno (MVP usa telefone + código da instituição);
- pagamento;
- gamificação avançada;
- ranking de alunos;
- dashboard pedagógico avançado (exceto o bloco de **uso de agentes de IA**
  definido em `10_AGENT_USAGE_DASHBOARD.md`);
- recomendação automática de trilha por IA;
- correção automática de redação;
- multi-idioma;
- app mobile nativo;
- envio de mensagens / push a partir do painel;
- integração com provedores de chatbot externos;
- migração automática de dados legados;
- alteração do padrão de ids sem plano de migração;
- substituição do Firestore por outro banco;
- endpoints HTTP genéricos para o painel administrativo enquanto o painel
  continuar usando Firestore Client SDK (exceção: `GET /api/dashboard_summary`
  para agregação server-side de métricas / uso de agentes; player aluno usa
  a API de progresso canônica).

## Liberado do out-of-scope (ver specs)

- Acompanhamento de uso dos agentes canônicos no dashboard
  (`specs/10_AGENT_USAGE_DASHBOARD.md`, decisão em `09_DECISIONS.md`).
- App web do aluno + API `next-content` / `advance` (`06_STUDENT_WEB_PLAYER.md`).

## Regra

Qualquer item acima só pode entrar no escopo depois de:

1. atualizar este arquivo;
2. registrar decisão em `09_DECISIONS.md`;
3. criar spec específica;
4. atualizar `tests.yaml`;
5. atualizar `TASKS.md`.
