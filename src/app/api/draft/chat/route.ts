import { openai, MODEL } from '@/lib/openai';
import { DRAFT_CHAT_SYSTEM_PROMPT } from '@/lib/prompts/draft';
import { sseResponse } from '@/lib/streaming';
import type { ChatMessage, ChatResponse, Integration } from '@/types/skill';

export async function POST(req: Request) {
  const { messages, storedIntegrations = [] }: { messages: ChatMessage[]; storedIntegrations?: Integration[] } = await req.json();

  if (!messages?.length) {
    return new Response(JSON.stringify({ error: 'messages is required' }), { status: 400 });
  }

  const integrationContext = storedIntegrations.length > 0
    ? `\n\nMERCHANT'S CONFIGURED PLATFORMS:\nThis merchant has already set up the following integrations: ${storedIntegrations.map((i) => `${i.name} (${i.category})`).join(', ')}. When suggesting platforms, prefer these over alternatives where applicable.`
    : '';
  const systemPrompt = DRAFT_CHAT_SYSTEM_PROMPT + integrationContext;

  return sseResponse(async (send, close) => {
    const stream = await openai.chat.completions.create({
      model: MODEL,
      stream: true,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    let fullText = '';
    let lastMessageLen = 0;
    for await (const chunk of stream) {
      const raw = chunk.choices[0]?.delta?.content ?? '';
      if (raw) {
        fullText += raw;
        // Extract only the message field text, not raw JSON
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

    let result: ChatResponse;
    try {
      result = JSON.parse(fullText);
    } catch {
      send({
        type: 'error',
        message: `Failed to parse response. Raw: ${fullText.slice(0, 300)}`,
      });
      close();
      return;
    }

    send({ type: 'result', payload: result });
    close();
  });
}
