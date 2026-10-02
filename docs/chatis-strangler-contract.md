# Chatis strangler vs fachada next-content

Resumo operacional. Spec canónica: [`specs/13_CHATIS_STRANGLER_CONTRACT.md`](../specs/13_CHATIS_STRANGLER_CONTRACT.md).

| | Chatis **2.4** (legado) | Fachada (**2.5+** / app) |
|--|-------------------------|---------------------------|
| Resolve | `GET /student?phone_number=` (`{}` se miss) | `GET /student/by-phone/…` |
| Status | `GET /student_trails?student_id&trail_id` | `GET /student_trails/status` |
| Conteúdo | GETs separados + lógica no grafo | `GET /student_trails/next-content` |
| Advance | `PUT ?action=advance_stage\|advance_question` | `POST /student_trails/advance` |

Regra: fachada **additive**; não remover `?action=` até cutover validado (I3). Ambos → Shared Trail Engine.
