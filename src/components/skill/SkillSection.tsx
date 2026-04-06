import { ToolBadge } from '@/components/ui/Badge';

function renderContent(content: string) {
  const parts = content.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]$/);
    if (match) return <ToolBadge key={i} name={match[1]} />;
    return (
      <span key={i}>
        {part.split('\n').map((line, j, arr) => (
          <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
        ))}
      </span>
    );
  });
}

export function SkillSection({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</p>
      <div className="text-sm leading-relaxed text-zinc-700">{renderContent(content)}</div>
    </div>
  );
}
