import { openai, MODEL } from '@/lib/openai';
import { SYSTEM_PROMPT, buildAnalysisUserPrompt } from '@/lib/prompts/analyze';
import { sseResponse } from '@/lib/streaming';
import type { AnalyzeRequest, AnalysisResult } from '@/types/skill';

export async function POST(req: Request) {
  const body: AnalyzeRequest = await req.json();
  const { text, mode } = body;

  if (!text?.trim()) {
    return new Response(JSON.stringify({ error: 'text is required' }), { status: 400 });
  }

  return sseResponse(async (send, close) => {
    const stream = await openai.chat.completions.create({
      model: MODEL,
      stream: true,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildAnalysisUserPrompt(text, mode) },
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
