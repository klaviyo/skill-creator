import type { SseEvent } from '@/types/skill';

const encoder = new TextEncoder();

export function sseResponse(
  handler: (send: (event: SseEvent) => void, close: () => void) => Promise<void>,
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SseEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      const close = () => controller.close();

      try {
        await handler(send, close);
      } catch (err) {
        send({
          type: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

export async function* readSseStream(
  response: Response,
): AsyncGenerator<SseEvent> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() ?? '';

    for (const chunk of lines) {
      const line = chunk.trim();
      if (line.startsWith('data: ')) {
        const json = line.slice(6);
        try {
          yield JSON.parse(json) as SseEvent;
        } catch {
          // skip malformed events
        }
      }
    }
  }
}
