import type { HttpMethod } from '@/types/skill';

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-emerald-50 text-emerald-700',
  POST: 'bg-blue-50 text-blue-700',
  PUT: 'bg-amber-50 text-amber-700',
  PATCH: 'bg-orange-50 text-orange-700',
  DELETE: 'bg-red-50 text-red-700',
};

export function HttpMethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-bold font-mono ${METHOD_COLORS[method]}`}>
      {method}
    </span>
  );
}

export function ToolBadge({ name }: { name: string }) {
  return (
    <span className="inline-block rounded border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
      {name}
    </span>
  );
}
