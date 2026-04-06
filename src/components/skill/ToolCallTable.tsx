import type { ToolCall } from '@/types/skill';
import { HttpMethodBadge } from '@/components/ui/Badge';

function formatUrl(url: string) {
  return url.split(/(\{[^}]+\})/).map((part, i) =>
    part.startsWith('{') ? (
      <span key={i} className="rounded bg-amber-50 px-1 text-amber-700">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function ToolCallTable({ toolCalls }: { toolCalls: ToolCall[] }) {
  if (!toolCalls.length) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500">Tool</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500">Method</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500">URL</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white">
          {toolCalls.map((tc, i) => (
            <tr key={i}>
              <td className="px-3 py-2.5 font-medium text-zinc-900 whitespace-nowrap">{tc.name}</td>
              <td className="px-3 py-2.5 whitespace-nowrap"><HttpMethodBadge method={tc.httpMethod} /></td>
              <td className="px-3 py-2.5 font-mono text-xs text-zinc-600">{formatUrl(tc.urlTemplate)}</td>
              <td className="px-3 py-2.5 text-zinc-500">{tc.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
