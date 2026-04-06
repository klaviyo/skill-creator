export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name')?.trim();

  if (!name) {
    return Response.json({ found: false }, { status: 400 });
  }

  // Build candidate URLs from common docs/developer portal patterns
  const slug = name.toLowerCase().replace(/\s+/g, '');
  const hyphenated = name.toLowerCase().replace(/\s+/g, '-');

  const candidates = [
    `https://docs.${slug}.com`,
    `https://developer.${slug}.com`,
    `https://developers.${slug}.com`,
    `https://${slug}.com/docs`,
    `https://${slug}.com/developers`,
    `https://${slug}.com/api`,
    `https://docs.${hyphenated}.com`,
    `https://developer.${hyphenated}.com`,
    `https://${hyphenated}.com/docs`,
    `https://docs.${slug}.io`,
    `https://${slug}.io/docs`,
  ];

  const timeout = 4000;

  // Race all candidates — first successful HEAD response wins
  const results = await Promise.allSettled(
    candidates.map(async (url) => {
      const res = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(timeout),
        redirect: 'follow',
      });
      if (res.ok) return url;
      throw new Error(`${res.status}`);
    }),
  );

  const found = results.find(
    (r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled',
  );

  if (found) {
    return Response.json({ found: true, docsUrl: found.value });
  }

  return Response.json({ found: false });
}
