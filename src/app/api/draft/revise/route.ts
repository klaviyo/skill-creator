import { openai, MODEL } from '@/lib/openai';
import { REVISION_SYSTEM_PROMPT, buildRevisionPrompt } from '@/lib/prompts/draft';
import { sseResponse } from '@/lib/streaming';
import { resolveEcosystemContext } from '@/data/ecosystemKnowledge';
import type { ReviseRequest, Skill } from '@/types/skill';

export async function POST(req: Request) {
  const { skill, feedback, messages, selectedIntegrations }: ReviseRequest = await req.json();

  if (!skill || !feedback) {
    return new Response(JSON.stringify({ error: 'skill and feedback are required' }), { status: 400 });
  }

  const ecosystemContext = resolveEcosystemContext(selectedIntegrations.map((i) => i.name));

  return sseResponse(async (send, close) => {
    const stream = await openai.chat.completions.create({
      model: MODEL,
      stream: true,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: REVISION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildRevisionPrompt(skill, feedback, selectedIntegrations, ecosystemContext),
        },
        // Include prior conversation for context
        ...messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    let fullText = '';
    let lastMessageLen = 0;
    for await (const chunk of stream) {
      const raw = chunk.choices[0]?.delta?.content ?? '';
      if (raw) {
        fullText += raw;
        const match = fullText.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (match) {
          const extracted = match[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
          if (extracted.length > lastMessageLen) {
            send({ type: 'delta', content: extracted.slice(lastMessageLen) });
            lastMessageLen = extracted.length;
          }
        }
      }
    }

    let parsed: { message: string; skill: Skill };
    try {
      parsed = JSON.parse(fullText);
    } catch {
      send({ type: 'error', message: `Failed to parse revision. Raw: ${fullText.slice(0, 300)}` });
      close();
      return;
    }

    send({ type: 'result', payload: parsed });
    close();
  });
}
