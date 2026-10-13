import { z } from 'zod'

/**
 * Payload de criação alinhado à API `trail_stages` (POST).
 * A validação definitiva permanece no servidor.
 */
export const trailStageCreateSchema = z.discriminatedUnion('stage_type', [
  z.object({
    trail_id: z.string().min(1, 'trail_id obrigatório'),
    stage_number: z.number().int().min(1),
    title: z.string().min(1, 'title obrigatório'),
    stage_type: z.literal('ai'),
    prompt: z.string().min(1, 'prompt obrigatório quando stage_type é "ai"'),
  }),
  z.object({
    trail_id: z.string().min(1, 'trail_id obrigatório'),
    stage_number: z.number().int().min(1),
    title: z.string().min(1, 'title obrigatório'),
    stage_type: z.literal('fixed'),
    prompt: z.null(),
  }),
  z.object({
    trail_id: z.string().min(1, 'trail_id obrigatório'),
    stage_number: z.number().int().min(1),
    title: z.string().min(1, 'title obrigatório'),
    stage_type: z.literal('exercise'),
    prompt: z.null(),
  }),
])

export type TrailStageCreateInput = z.infer<typeof trailStageCreateSchema>

/** Campos opcionais no PUT; regras cruzadas em superRefine. */
export const trailStageUpdateSchema = z
  .object({
    title: z.string().min(1).optional(),
    stage_type: z.enum(['ai', 'fixed', 'exercise']).optional(),
    prompt: z.union([z.string(), z.null()]).optional(),
    is_released: z.boolean().optional(),
    active: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const t = data.stage_type
    const p = data.prompt

    if (t === undefined && p === undefined) return

    if (t === 'ai') {
      if (p !== undefined && (p === null || (typeof p === 'string' && !p.trim()))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'prompt é obrigatório (não vazio) quando stage_type é "ai"',
          path: ['prompt'],
        })
      }
    }
    if ((t === 'fixed' || t === 'exercise') && p !== undefined && p !== null) {
      if (typeof p === 'string' && p.trim() !== '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'prompt deve ser null quando stage_type é "fixed" ou "exercise"',
          path: ['prompt'],
        })
      }
    }
  })

export type TrailStageUpdateInput = z.infer<typeof trailStageUpdateSchema>
