/**
 * Schema JSON (Gemini responseSchema) alinhado a GeneratedTrail.
 * Mantido em plain object para envio à API Vertex/Generative Language.
 */

export const GENERATED_TRAIL_JSON_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    objective: { type: 'string' },
    subject: { type: 'string' },
    architecturesConsidered: {
      type: 'array',
      items: { type: 'string' },
    },
    architectureJustification: { type: 'string' },
    phases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          position: { type: 'integer' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['ai', 'fixed', 'exercise'] },
          pedagogicalFunction: { type: 'string' },
          globalAiCommand: { type: 'string', nullable: true },
          isFeedback: { type: 'boolean' },
        },
        required: [
          'position',
          'name',
          'type',
          'pedagogicalFunction',
          'globalAiCommand',
          'isFeedback',
        ],
      },
    },
    stages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          objective: { type: 'string' },
          contents: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                blocks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      phasePosition: { type: 'integer' },
                      content: { type: 'string' },
                      correctOption: { type: 'string', nullable: true },
                    },
                    required: ['phasePosition', 'content', 'correctOption'],
                  },
                },
              },
              required: ['title', 'blocks'],
            },
          },
        },
        required: ['name', 'objective', 'contents'],
      },
    },
  },
  required: ['name', 'objective', 'subject', 'phases', 'stages'],
} as const

export const SYSTEM_WRAPPER = `Você gera trilhas educacionais para a plataforma CRIAS.
As "fontes" / "fontes do NotebookLM" mencionadas no prompt do usuário são EXCLUSIVAMENTE os documentos enviados nesta requisição (texto extraído abaixo). Ignore qualquer referência a NotebookLM como produto externo — use só o material anexado.
Responda APENAS com JSON válido conforme o schema. Sem markdown, sem comentários, sem texto fora do JSON.
correctOption em exercícios deve ser "1", "2" ou "3" (A=1, B=2, C=3).
type das fases: apenas "ai", "fixed" ou "exercise".
Marque isFeedback=true nas fases IA imediatamente após um exercício.`
