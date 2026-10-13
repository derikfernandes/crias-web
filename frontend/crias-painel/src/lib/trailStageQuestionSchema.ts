import { z } from 'zod'

import type { TrailStageType } from '../types/trailStage'

/**
 * Schema Zod para POST `trail_stage_questions`.
 * O tipo de etapa vem do stage (`trail_stages.stage_type`), não do body.
 */

export const trailStageQuestionOptionSchema = z.object({
  key: z.string().min(1, 'key obrigatória'),
  text: z.string().min(1, 'texto obrigatório'),
})

const baseFields = {
  trail_id: z.string().min(1, 'trail_id obrigatório'),
  stage_number: z.number().int().min(1),
  question_number: z.number().int().min(1),
  title: z.string().min(1, 'title obrigatório'),
  content: z.string().min(1, 'content obrigatório'),
  explanation: z.string().nullable().optional(),
  /** Se omitido na API, o padrão é `true` só para `question_number === 1`. */
  is_released: z.boolean().optional(),
}

const exerciseShape = z
  .object({
    ...baseFields,
    correct_option: z.string().min(1, 'correct_option obrigatório para stage exercise'),
    options: z.array(trailStageQuestionOptionSchema).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const opts = data.options
    if (!opts || opts.length === 0) return
    const keys = new Set(opts.map((o) => o.key))
    if (keys.size !== opts.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Chaves em options devem ser únicas',
      })
      return
    }
    if (!keys.has(data.correct_option)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'correct_option deve ser uma das keys em options',
        path: ['correct_option'],
      })
    }
  })

const nonExerciseShape = z.object({
  ...baseFields,
  correct_option: z.null(),
  options: z.null(),
})

export function trailStageQuestionCreateSchemaForStage(stageType: TrailStageType) {
  if (stageType === 'exercise') return exerciseShape
  return nonExerciseShape
}

export type TrailStageQuestionCreateInputExercise = z.infer<typeof exerciseShape>
export type TrailStageQuestionCreateInputNonExercise = z.infer<typeof nonExerciseShape>
