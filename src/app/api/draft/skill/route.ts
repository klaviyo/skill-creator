import { openai, MODEL } from '@/lib/openai';
import { DRAFT_SKILL_SYSTEM_PROMPT, buildDraftSkillPrompt } from '@/lib/prompts/draft';
import { sseResponse } from '@/lib/streaming';
import { resolveEcosystemContext } from '@/data/ecosystemKnowledge';
import { searchIntegrationDocs } from '@/lib/search';
import type { DraftSkillRequest, AnalysisResult } from '@/types/skill';

/**
 * Derive a search intent from the conversation messages.
 * We want something like "cancel subscription" or "track order status"
 * so the search lands on the right endpoint reference page.
 */
function deriveSearchIntent(messages: Array<{ role: string; content: string }>): string {
  const userMessages = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join(' ');
  // Trim to a reasonable length — the search query doesn't need the full conversation
  return userMessages.slice(0, 200);
}

export async function POST(req: Request) {
  const { messages, selectedIntegrations }: DraftSkillRequest = await req.json();

  if (!messages?.length) {
    return new Response(JSON.stringify({ error: 'messages is required' }), { status: 400 });
  }

  const intent = deriveSearchIntent(messages);

  // For each integration, search its docs for the relevant endpoint page.
  // All integrations in integrations.json now have a known docsUrl.
  // Custom integrations pass their docsUrl from the platform picker.
  const docsEntries = await Promise.all(
    selectedIntegrations.map(async (integration) => {
      const docsUrl = integration.docsUrl;
      if (!docsUrl) return [integration.name, ''] as [string, string];
      const text = await searchIntegrationDocs(integration.name, docsUrl, intent);
      return [integration.name, text] as [string, string];
    }),
  );
  const integrationDocs = Object.fromEntries(docsEntries.filter(([, docs]) => docs.length > 0));

  const ecosystemContext = resolveEcosystemContext(selectedIntegrations.map((i) => i.name));

  return sseResponse(async (send, close) => {
    const stream = await openai.chat.completions.create({
      model: MODEL,
      stream: true,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: DRAFT_SKILL_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildDraftSkillPrompt(messages, selectedIntegrations, integrationDocs, ecosystemContext),
        },
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
      const parsed = JSON.parse(fullText);
      result = {
        needsClarification: false,
        skills: parsed.skills ?? [],
        faqItems: parsed.faqItems ?? [],
      };
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
