import { openai, MODEL } from '@/lib/openai';
import { SYSTEM_PROMPT, buildClarifyUserPrompt } from '@/lib/prompts/clarify';
import { sseResponse } from '@/lib/streaming';
import type { ClarifyRequest, AnalysisResult } from '@/types/skill';

export async function POST(req: Request) {
  const body: ClarifyRequest = await req.json();
  const { originalText, mode, questions, answers } = body;

  if (!originalText?.trim()) {
    return new Response(JSON.stringify({ error: 'originalText is required' }), { status: 400 });
  }

  return sseResponse(async (send, close) => {
    const stream = await openai.chat.completions.create({
      model: MODEL,
      stream: true,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildClarifyUserPrompt(originalText, mode, questions, answers) },
      ],
    });

    let fullText = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (delta) {
        fullText += delta;
        send({ type: 'delta', content: delta });
      }
    }

    let result: AnalysisResult;
    try {
      result = JSON.parse(fullText);
    } catch {
      send({
        type: 'error',
        message: `Failed to parse response as JSON. Raw output: ${fullText.slice(0, 500)}`,
      });
      close();
      return;
    }

    send({ type: 'result', payload: result });
    close();
  });
}
