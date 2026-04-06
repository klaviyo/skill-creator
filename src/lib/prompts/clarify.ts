import type { SkillMode } from '@/types/skill';

export { SYSTEM_PROMPT } from './analyze';

export function buildClarifyUserPrompt(
  originalText: string,
  mode: SkillMode,
  questions: string[],
  answers: string[],
): string {
  const modeInstruction =
    mode === 'single'
      ? 'Extract EXACTLY ONE skill from this text.'
      : 'Extract ALL distinct skills from this text, identifying natural boundaries.';

  const qa = questions
    .map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${answers[i] ?? '(no answer provided)'}`)
    .join('\n\n');

  return `${modeInstruction}

Original text:
---
${originalText}
---

You previously asked these clarifying questions, and the merchant has answered them:

${qa}

Now produce the final skills. Set "needsClarification" to false and do NOT ask for further clarification.`;
}
