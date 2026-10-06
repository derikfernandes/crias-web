# UX Fixes Analysis - Aluno Player

## Overview
This document analyzes UX issues in the crias-web student player (route `/aluno`, served from `frontend/cria-frontend`).

## Issues Identified

### Issue 1: Maria (Tutor) ↔ Trail Transition

**Problem:**
- Student's question and Maria's reply appear ABOVE the current trail block instead of below
- Requires two clicks to resume: "Voltar à trilha" then "Continuar trilha"

**Root Cause:**
- In `PlayerPage.tsx`, the `mergeHistoryIntoMessages` function (line 109-132) merges history-fetched messages with local state
- When history is re-fetched after Maria interaction, the current trail block from history gets appended after Maria messages in the local state
- This causes Maria messages to appear chronologically before the trail block they were asked about

**Solution:**
- **Part A**: Ensure Maria messages maintain correct chronological order relative to trail content
  - Modify `mergeHistoryIntoMessages` to preserve relative ordering of Maria messages within their question context
  - Ensure Maria messages with `questionNumber` stay grouped with that question's content
  
- **Part B**: Simplify button UX
  - Remove separate "Voltar à trilha" state/button
  - Make "Continuar" button exit Maria mode AND advance trail in one action when in Maria mode
  - Update `showVoltarTrilha` and `showContinuar` logic to use single "Continuar" button

### Issue 2: Duplicate Exercise Feedback

**Problem:**
- First feedback appears correctly after answer submission (from AI generation)
- Second feedback appears after clicking "Continuar trilha" and then disappears when next exercise loads
- This creates confusion and flashing content

**Root Cause (Hypothesis):**
- Exercise submission generates feedback via `ensureNextBlocoRespostaFeedback` (backend)
- The feedback is returned as `pedagogical_feedback` and displayed (first instance)
- When user clicks "Continuar", the trail advances to the BLOCO RESPOSTA stage
- If that stage's AI content gets generated/delivered again, it shows as a second feedback
- The feedback disappears because it's ephemeral display logic, not persisted in conversation logs

**Solution:**
- Check if BLOCO RESPOSTA stages are being generated twice
- Ensure `skipNextBlocoDeliveryRef` logic correctly skips the feedback stage after exercise
- Add idempotency checks to prevent double-generation of feedback for same attempt

### Issue 3: Unified Enviar/Continuar Button

**Problem:**
- Separate buttons for "Enviar resposta" (exercise) and "Continuar" (trail navigation)
- User must think about which button to use

**Solution:**
- Make main action button serve both purposes:
  - Show "Enviar resposta" when exercise option selected (disabled until selection)
  - Show "Continuar" after feedback or on non-exercise content
  - Keep "Tentar de novo" only for network/system errors (don't change existing error handling)

### Issue 4: Latency Optimization

**Problem:**
- Maria reply takes 12-16s
- Exercise feedback takes 12-16s
- Expected faster without WhatsApp intermediate step

**Root Causes:**
- Sequential API calls instead of parallel where possible
- Oversized prompts with full conversation history
- Gemini generation time
- Network latency
- Cold starts

**Optimization Opportunities:**

1. **Parallel Opportunities:**
   - Exercise feedback generation could start in background during answer submission
   - Trail content prefetch could happen in parallel with feedback generation
   - Student data and trail metadata could be fetched in parallel

2. **Prompt Optimization:**
   - Current context limit is 20 messages (configurable via `TRAIL_AI_CONTEXT_LIMIT`)
   - Could reduce for faster responses, especially for simple feedback
   - Consider truncating very long messages in context

3. **Caching:**
   - BLOCO RESPOSTA generic content (without student answer) could be pre-generated
   - Trail stage metadata could be cached
   - Student profile data could be cached

4. **Streaming:**
   - Gemini supports streaming responses
   - Could show partial feedback as it generates (but requires UI changes)

## Implementation Priority

1. ✅ **Issue 2** (Duplicate Feedback) - Clear bug, backend fix, high impact
2. ✅ **Issue 4** (Latency - Quick Wins) - Parallelize obvious sequential calls
3. 🔄 **Issue 3** (Button Unification) - Frontend UX, medium complexity
4. 🔄 **Issue 1b** (Button Simplification) - Frontend UX, medium complexity
5. 🔄 **Issue 1a** (Maria Ordering) - Frontend UX, high complexity due to state management

## Testing Strategy

1. **Unit Tests:**
   - Test message ordering logic
   - Test button state transitions
   - Test idempotency of feedback generation

2. **Integration Tests:**
   - Test exercise submission → feedback → continue flow
   - Test Maria interaction → continue flow
   - Test button states during various stages

3. **End-to-End:**
   - Use student s1745 on trail t58 (etapa 1 q1 to etapa 7)
   - Test with and without Maria
   - Verify mobile and desktop
   - Check keyboard accessibility

## Files Modified

### Backend:
- `server/lib/trail-engine/submitExercise.ts` - Add feedback skip logic
- `server/lib/studentTrailProgressService.ts` - Optimize parallel fetches
- `server/lib/trail-ai/ensureTrailAiContent.ts` - Add caching, reduce context

### Frontend:
- `frontend/cria-frontend/src/pages/PlayerPage.tsx` - Fix all UX issues
- `frontend/cria-frontend/src/lib/api.ts` - Update API calls if needed

### Tests:
- Add tests for message ordering
- Add tests for button states
- Add tests for feedback generation

## Performance Measurements

**Before Optimization:**
- Maria reply: ~12-16s
- Exercise feedback: ~12-16s

**Target:**
- Maria reply: <8s
- Exercise feedback: <8s

**After Optimization:**
- To be measured after implementation

## Notes

- Owner (dérik) will test on Vercel preview before merging
- Do NOT auto-merge the PR
- Mobile and desktop must both work
- All labels in Portuguese (Brazil)
- No hardcoded pedagogical text
