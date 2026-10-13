# Oportunidades futuras (NÃO implementadas)

Registro de melhorias que envolvem API, banco, autenticação ou regra de negócio.
**Nenhuma delas foi aplicada nesta refatoração**, para preservar 100% dos contratos.

## API / contratos

1. **Duplicação de bootstrap Firebase Admin** em vários arquivos `api/*.ts`  
   - Risco se unificar: mudança sutil de erro/env.  
   - Recomendação: extrair `server/lib/firebaseAdmin.ts` em PR dedicado com testes de contrato.

2. **CORS `Access-Control-Allow-Origin: *`** em endpoints públicos  
   - Melhoria de segurança possível, mas altera comportamento para clientes externos.  
   - Requer inventário de consumers antes de restringir.

3. **Endpoints sem autenticação de API key** nas rotas REST públicas  
   - Hoje o contrato é aberto (CORS *). Qualquer auth nova é mudança de contrato.

## Banco / Firestore

4. **Listeners `onSnapshot` continuam nos containers (`src/pages/`)** — correto para isolamento.
   - Próximo passo opcional: wrappers em `src/lib` para as páginas, sem mudar queries.
   - **Não** mover listeners para `design/`.

4b. **Forms mistos ainda em `src/components/`** (`InstitutionForm`, `StudentForm`, `TrailForm`,
   `TrailStageForm`, `TrailStageQuestionForm`, `TrailStructureEditor`, `TrailContentEditor`)
   - Contêm mutações via `lib/public` + JSX.
   - Ficaram protegidos de propósito; views recebem slots `ReactNode`.
   - Extração futura: `*FormView` em `design/components/forms/` + container fino.

5. **Dashboard carrega várias coleções em paralelo via listeners**  
   - Possível custo de leitura alto. Otimizar queries exigiria mudança de índices/consultas — fora do escopo.

6. **IDs sequenciais via `counters/*`**  
   - Funciona, mas sob contenção pode gerar conflitos. Migrar para outro esquema alteraria IDs públicos (`i1`, `s1`, `t1`).

## Frontend / segurança

7. **Config Firebase client (`VITE_FIREBASE_*`)** é pública por natureza (SDK web).  
   - Revisar `firestore.rules` periodicamente; não mover secrets Admin para o frontend.

8. **`frontend/crias-aluno`** (Next.js) aparece no disco mas fora do workspace npm atual.  
   - Clarificar se faz parte do produto ou é artefato local antes de integrar à estrutura.

## Desempenho (dependem de mudança de comportamento ou UX)

9. **Virtualização** da tabela grande do Dashboard — muda DOM/scroll; validar UX antes.  
10. **Cache de `dashboard_summary`** — risco de dados defasados; só com TTL acordado.
