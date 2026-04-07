/**
 * Endpoint search using OpenAI's web search model.
 *
 * Uses gpt-4o-search-preview (same API key, no extra service needed) to find
 * and summarize the relevant API endpoint docs for a given integration and intent.
 * Returns a concise summary of the endpoint — URL template, method, required
 * headers, body shape, and parameters — ready for injection into the skill prompt.
 */

import { openai } from './openai';

export async function searchIntegrationDocs(
  integrationName: string,
  docsBaseUrl: string,
  intent: string,
  integrationDescription?: string,
): Promise<string> {
  const context = integrationDescription
    ? `${integrationName} (${integrationDescription})`
    : integrationName;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-search-preview',
      web_search_options: { search_context_size: 'medium' },
      messages: [
        {
          role: 'user',
          content: `Using the ${context} API documentation at ${docsBaseUrl}, find the specific API endpoint(s) needed to: ${intent}

Return a concise technical summary including:
- The exact endpoint URL template (with {placeholder} syntax for dynamic values)
- HTTP method
- Required and optional request parameters (path params, query params, body fields)
- Required HTTP headers (especially authentication headers)
- A minimal example request body (for POST/PUT/PATCH)
- Any important notes about prerequisites (e.g. must fetch customer ID first)

Be specific and precise — this will be used to generate tool call definitions for an AI agent.`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '';
    if (!content) return '';
    return `[${integrationName} API — search result]\n${content}`;
  } catch {
    // Fall back to fetching the docs page directly
    try {
      const res = await fetch(docsBaseUrl, { signal: AbortSignal.timeout(6000) });
      const html = await res.text();
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000);
      return `[${integrationName} API Reference]\n${text}`;
    } catch {
      return '';
    }
  }
}
