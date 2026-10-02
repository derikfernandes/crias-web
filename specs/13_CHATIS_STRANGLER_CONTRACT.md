# Chatis 2.4 Strangler ↔ Fachada next-content

**Status:** contrato congelado (Wave 0)  
**Invariantes:** I3, I4, I5  
**Baseline Chatis:** `[ONLINE]_Crias_2.4.json` (raiz do repo)

---

## 1. Duas superfícies (coexistem)

| Camada | Quem usa | Paths | Estado |
|--------|----------|-------|--------|
| **Legado (strangler)** | Chatis **2.4** em produção | `GET /student?phone_number=`, `GET /student_trails?…`, `PUT /student_trails?action=*` | Implementado hoje |
| **Fachada (spec)** | App Trilha + Chatis **2.5+** | `GET …/next-content`, `POST …/advance`, `GET …/status`, `GET /student/by-phone/…` | Contrato-alvo; runtime Wave A |

Ambas devem eventualmente chamar o **mesmo** Shared Trail Engine. A fachada é **additive** — não substitui o legado até cutover validado.

---

## 2. Mapa de equivalência

| Intenção de domínio | Chatis 2.4 (hoje) | Fachada futura |
|---------------------|-------------------|----------------|
| Resolver aluno por telefone | `GET /student?phone_number=` → doc ou `{}` (200) | `GET /student/by-phone/{phone}` (+ alias legacy) |
| Ler posição | `GET /student_trails?student_id&trail_id` | `GET /student_trails/status` |
| Obter conteúdo a entregar | N GETs (`trail_stages` + `trail_stage_questions`) no grafo | `GET /student_trails/next-content` |
| Avançar um passo (cego) | `PUT ?action=advance_stage` ou `advance_question` | — (legado) |
| Avançar com wrap | Lógica no grafo Chatis 2.4 | `POST /student_trails/advance` (motor) |
| Override posição | `PUT ?action=update_position` | via motor (`reason=admin` / legacy) |

### Gap conhecido (discovery)

Hoje `advance_stage` / `advance_question` **incrementam às cegas** e **não** fazem wrap nem `completed`. O wrap vive no JSON Chatis 2.4. Wave A: motor centraliza wrap; adapters legados preservam efeito observado pelo 2.4 **ou** passam a `reason=legacy_primitive` sem mudar o comportamento visto pelo fluxo.

---

## 3. Regras de não-quebra (I3)

1. **Não remover** `PUT ?action=advance_stage|advance_question|update_position|mark_last_interaction|complete|block|update_status` até JSON 2.5+ em produção e validado no telefone de teste.
2. Respostas GET de posição/conteúdo: shape atual intacto; campos novos só **additive**.
3. `GET /student?phone_number=` → miss = `{}` **200** (nunca 404 neste path).
4. Novos campos em `student_trails` com defaults seguros; Chatis ignora desconhecidos.
5. Admin pode **ler** Firestore; mutações de progresso do aluno migram para o motor (Wave B).
6. Tutores/agentes Chatis (81–87) ficam no WhatsApp; motor **não** substitui Superagentes nas Waves A–B.

---

## 4. Diagrama de cutover

```text
Hoje:
  Chatis 2.4 ──HTTP──► api/* (CRUD + ?action=) ──► Firestore

Wave A (strangler):
  Chatis 2.4 ──mesmos paths──► api/* ──► Trail Engine ──► Firestore
                                    ▲
  App / specs ──next-content/advance─┘

Wave C (Chatis 2.5+):
  Chatis 2.5 ──next-content + advance──► Trail Engine
  Chatis 2.4 (legado) ainda suportado até cutover
```

### Ordem

1. Motor atrás dos primitivos (invisível ao JSON 2.4).
2. Endpoints fachada + rewrites + testes de contrato.
3. Export JSON **2.5** usa fachada; **2.4** permanece deployável.
4. Validar `5512974085258` em ambos.
5. Descontinuar 2.4 só após Ciclo 2 omnichannel verde (I10).

---

## 5. Migração in-progress (I5)

| Princípio | Detalhe |
|-----------|---------|
| Estado Firebase intocado | Só muda o cliente (JSON / app); cursor permanece |
| Re-hidratação | 2.5 começa por resolve + status/next-content |
| Feature flag | 2.4 vs 2.5 por ambiente/instituição se necessário |
| Sem reset | Proibido zerar `current_*` por upgrade de JSON |
| Tutores | Continuam no Chatis; IR 2.5 documenta sem portar ao app v1 |

---

## 6. Checklist para agentes

- [ ] Diff não remove paths `?action=` legados.
- [ ] Diff não muda miss-de-telefone legado para 404.
- [ ] Novos campos em responses/docs são additive.
- [ ] Lógica de wrap/composição não foi duplicada no frontend.
- [ ] Chatis 2.4 JSON não foi “atualizado” para fachada sem branch 2.5 separada.

Ver também: `specs/12_SHARED_TRAIL_ENGINE.md`, `AGENTS.md`.
