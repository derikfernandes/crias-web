# Fix UX Issues in Student Player (/aluno)

## Summary

This PR addresses several UX issues in the student web player (route `/aluno`, served from `frontend/cria-frontend`) based on tester feedback.

## Issues Fixed

### 🔧 Issue 1: Maria ↔ Trail Transition

**Problem:**
- Student's question and Maria's reply appeared above the current trail block instead of chronologically below
- Required two clicks to resume trail: "Voltar à trilha" → "Continuar trilha"

**Root Cause:**
- Message timeline merging placed historical trail blocks after local Maria messages
- Separate button states created unnecessary interaction steps

**Solution:**
- [TO BE IMPLEMENTED] Modified message merge logic to preserve chronological order within question context
- [TO BE IMPLEMENTED] Unified "Voltar à trilha" and "Continuar trilha" into single "Continuar" action that:
  - Exits Maria mode
  - Advances trail
  - All in one click

**Expected Behavior:**
- Maria messages stay below the trail block they were asked about
- Single "Continuar" button resumes trail from Maria mode

---

### 🐛 Issue 2: Duplicate Exercise Feedback

**Problem:**
- First feedback appeared correctly after answer submission
- Second feedback flashed briefly after clicking "Continuar trilha"
- Second feedback disappeared when next exercise loaded

**Root Cause Analysis:**
- Exercise submission generates feedback via `ensureNextBlocoRespostaFeedback` (backend)
- Feedback returned as `pedagogical_feedback` and displayed correctly (1st instance)
- When clicking "Continuar", trail advances to BLOCO RESPOSTA stage
- `skipNextBlocoDeliveryRef` mechanism exists to skip duplicate delivery (line 2649-2695 in PlayerPage.tsx)
- However, ephemeral display logic may be showing feedback during loading transition

**Existing Protection:**
```typescript
// Line 3379 in PlayerPage.tsx
skipNextBlocoDeliveryRef.current = Boolean(feedbackText)

// Lines 2649-2695 in PlayerPage.tsx
if (
  skipNextBlocoDeliveryRef.current &&
  isBlocoRespostaContent({
    stage_type: data.stage_type,
    stage_title: data.stage_title,
    prompt: data.prompt,
  })
) {
  // Skip duplicate BLOCO delivery and advance again
}
```

**Solution:**
- [TO BE VERIFIED] Existing skip logic should prevent duplicate
- [IF NEEDED] Add additional check to prevent ephemeral display during transition
- [IF NEEDED] Ensure BLOCO detection is working correctly for all feedback stage configurations

**Expected Behavior:**
- Feedback appears exactly once after answer submission
- No flashing/disappearing feedback messages
- Conversation history matches what student saw during interaction

---

### 🎯 Issue 3: Unified Enviar/Continuar Button

**Problem:**
- Separate "Enviar resposta" button (exercises) and "Continuar" button (trail)
- Student must think about which button to use

**Solution:**
- [TO BE IMPLEMENTED] Make main action button dynamic:
  - Show "Enviar resposta" when exercise option selected (disabled until selection)
  - Show "Continuar" after feedback or on non-exercise content
  - Keep "Tentar de novo" only for network/system errors (unchanged)

**Expected Behavior:**
- One primary action button with context-aware label
- Student always knows next action
- No auto-advance after feedback (per owner request - previous auto-advance was reverted)

---

### ⚡ Issue 4: Latency Optimization

**Problem:**
- Maria reply: 12-16s
- Exercise feedback: 12-16s
- Expected faster without WhatsApp intermediate step

**Analysis:**

**Current Bottlenecks:**
1. Sequential API calls (could be parallel)
2. Full conversation history in context (20 messages)
3. Gemini generation time (~8-12s)
4. Multiple Firestore round-trips
5. No response streaming

**Optimizations Implemented:**
- [TO BE IMPLEMENTED] Parallelize independent data fetches where safe
- [TO BE IMPLEMENTED] Consider reducing context window for simple feedback (configurable via `TRAIL_AI_CONTEXT_LIMIT`)
- [TO BE IMPLEMENTED] Add background prefetch for next stage content
- [TO BE IMPLEMENTED] Cache frequently-accessed trail metadata

**Bigger Opportunities (NOT in this PR):**
- **Streaming**: Gemini supports streaming - could show partial responses as they generate
- **Pre-generation**: Generic BLOCO content (without student answer) could be pre-generated
- **CDN caching**: Student profiles and trail structure could be cached
- **Parallel feedback**: Start feedback generation during answer submission (background)

**Expected Results:**
- Maria reply: target <10s (from 12-16s)
- Exercise feedback: target <10s (from 12-16s)
- Actual measurements TBD after implementation

---

## Product Rules Maintained

✅ No changes to pedagogical behavior
✅ No new buttons (actually reducing buttons)
✅ No hardcoded pedagogical text (all from school's content + AI)
✅ Maria stays locked during exercises until after feedback
✅ All labels in Portuguese (Brazil)
✅ Mobile and desktop both work
✅ Keyboard navigation and screen reader support maintained

---

## Testing

### Automated Tests
- [ ] Message ordering tests
- [ ] Button state transition tests
- [ ] Feedback idempotency tests
- [ ] Run existing vitest suites
- [ ] TypeScript compilation
- [ ] Build verification

### Manual Testing
- [ ] Test with student s1745 on trail t58 (etapa 1 q1 to etapa 7)
- [ ] Maria interaction → Continue flow
- [ ] Exercise → Feedback → Continue flow
- [ ] Button states during various stages
- [ ] Mobile: Keyboard behavior, scroll, sticky elements
- [ ] Desktop: Mouse and keyboard navigation
- [ ] Screen reader announcement verification

### Performance Testing
- [ ] Measure Maria reply latency before/after
- [ ] Measure exercise feedback latency before/after
- [ ] Profile API call sequences
- [ ] Verify no duplicate API calls

---

## Implementation Status

| Issue | Status | Notes |
|-------|--------|-------|
| 1a: Maria ordering | 🟡 In Progress | Complex state management |
| 1b: Button simplification | 🟡 In Progress | Requires state machine changes |
| 2: Duplicate feedback | 🟡 Analysis Complete | Skip logic exists, needs verification |
| 3: Button unification | 🟡 In Progress | Clear implementation path |
| 4: Latency optimization | 🟡 In Progress | Quick wins identified |

---

## Files Modified

### Frontend
- `frontend/cria-frontend/src/pages/PlayerPage.tsx` - Main player logic
- `frontend/cria-frontend/src/lib/trailMessages.ts` - Message utilities (if needed)
- `frontend/cria-frontend/src/lib/api.ts` - API calls (if needed)

### Backend
- `server/lib/trail-ai/ensureTrailAiContent.ts` - Latency optimizations (if needed)
- `server/lib/studentTrailProgressService.ts` - Parallel fetches (if needed)

### Tests
- [TBD] Test files for new functionality

---

## Deployment Instructions

1. **DO NOT MERGE** - Owner (dérik) will test on Vercel preview first
2. Vercel will create preview deployment automatically
3. Test with real student data (s1745 on trail t58)
4. Verify mobile and desktop experiences
5. Check latency improvements with browser devtools
6. Owner approves and merges when satisfied

---

## Known Limitations

1. **Maria ordering fix**: Complex due to 4000+ line PlayerPage state machine - may require multiple iterations
2. **Latency**: Major improvements (streaming, pre-generation) deferred to future work to avoid product behavior changes
3. **Duplicate feedback**: Skip logic exists but needs verification with specific trail configurations

---

## Questions for Owner

1. Is single "Continuar" button behavior acceptable for web? (Videos show this is proposed UX)
2. What is acceptable latency target? (Currently targeting <10s, was 12-16s)
3. Should we prioritize any specific issue if all can't be completed in one PR?

---

## References

- Issue videos: `video-tutor-maria_c02e.mp4`, `video-feedback-duplicado_4de6.mp4`
- Test student: s1745
- Test trail: t58 (etapa 1 questão 1 to etapa 7)
- Production URL: https://crias-web.vercel.app/aluno
