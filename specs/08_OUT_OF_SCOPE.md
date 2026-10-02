# Out of Scope — Crias Trilhas

Na fase inicial, não implementar:

- login social;
- pagamento;
- gamificação avançada;
- recomendação automática de trilha por IA;
- correção automática de redação;
- multi-idioma;
- app mobile próprio;
- envio direto pelo WhatsApp dentro do painel;
- integração com múltiplos provedores de chatbot;
- migração automática de dados legados;
- alteração do padrão de ids sem plano de migração;
- substituição do Firestore por outro banco;
- endpoints HTTP genéricos para o painel administrativo enquanto o painel
  continuar usando Firestore Client SDK (exceção: `GET /api/dashboard_summary`
  para agregação server-side de métricas / uso de agentes).

## Liberado do out-of-scope (ver specs)

- Acompanhamento de uso dos agentes canônicos no dashboard
  (`specs/10_AGENT_USAGE_DASHBOARD.md`, decisão em `09_DECISIONS.md`).
- Ranking de alunos e oportunidades de aprendizagem **na Visão geral**,
  apenas com agregações já disponíveis (progresso, acerto, mensagens de
  tutores, exercícios mais errados/acertados). **Nunca** alterar bancos /
  collections / campos já existentes; sem inferir tema de dúvida
  (`metadata.topic`). Ver Decisão 10 em `09_DECISIONS.md`.

## Regra

Qualquer item acima só pode entrar no escopo depois de:

1. atualizar este arquivo;
2. registrar decisão em `09_DECISIONS.md`;
3. criar spec específica;
4. atualizar `tests.yaml`;
5. atualizar `TASKS.md`.