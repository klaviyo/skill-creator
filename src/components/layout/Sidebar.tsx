'use client';

import type { StoredConversation } from '@/lib/storage';

interface Props {
  conversations: StoredConversation[];
  activeId: string | null;
  activeView: 'skill' | 'integrations';
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onViewChange: (view: 'skill' | 'integrations') => void;
  storedIntegrationCount: number;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">{label}</p>
      <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/30">
        {count}
      </span>
    </div>
  );
}

function SidebarItem({
  label,
  sublabel,
  isActive,
  isPublished,
  onClick,
  onDelete,
}: {
  label: string;
  sublabel: string;
  isActive: boolean;
  isPublished: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={`group flex cursor-pointer items-center gap-2.5 rounded-[6px] px-3 py-2 transition-colors ${
        isActive ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <span
        className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
          isPublished ? 'bg-sage' : 'bg-white/20'
        }`}
      />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[13px] font-medium leading-snug ${isActive ? 'text-white' : 'text-white/70'}`}>
          {label}
        </p>
        <p className="text-[11px] text-white/30">{sublabel}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="hidden shrink-0 rounded p-0.5 text-white/20 hover:text-white/60 group-hover:block"
        aria-label="Delete"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 14 14">
          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function Sidebar({
  conversations, activeId, activeView, onSelect, onNew, onDelete, onViewChange, storedIntegrationCount,
}: Props) {
  const published = conversations.filter((c) => c.status === 'published' && c.skill);
  const drafts = conversations.filter((c) => c.status === 'draft' && c.skill);
  const inProgress = conversations.filter((c) => !c.skill);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-navy">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="font-serif text-base font-normal tracking-tight text-white">Klaviyo</span>
        <span className="text-sm text-white/30">/</span>
        <span className="text-sm text-white/60">Skills</span>
      </div>

      {/* Primary nav */}
      <div className="px-4 pb-3 space-y-1">
        {/* New skill */}
        <button
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-[6px] bg-poppy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-poppy-hover"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 16 16">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          New skill
        </button>

        {/* Integrations tab */}
        <button
          onClick={() => onViewChange('integrations')}
          className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[6px] px-3 py-2 text-left transition-colors ${
            activeView === 'integrations' ? 'bg-white/10' : 'hover:bg-white/8'
          }`}
        >
          <svg className="h-4 w-4 shrink-0 text-white/40" fill="none" viewBox="0 0 16 16">
            <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          <span className={`text-[13px] font-medium ${activeView === 'integrations' ? 'text-white' : 'text-white/60'}`}>
            Integrations
          </span>
          {storedIntegrationCount > 0 && (
            <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/40">
              {storedIntegrationCount}
            </span>
          )}
        </button>
      </div>

      <div className="mx-4 mb-3 border-t border-white/8" />

      {/* Library */}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6">
        {published.length > 0 && (
          <div>
            <SectionLabel label="Published" count={published.length} />
            <div className="space-y-0.5">
              {published.map((c) => (
                <SidebarItem
                  key={c.id}
                  label={c.skill!.name}
                  sublabel={c.publishedAt ? `Published ${timeAgo(c.publishedAt)}` : timeAgo(c.updatedAt)}
                  isActive={activeView === 'skill' && c.id === activeId}
                  isPublished
                  onClick={() => { onViewChange('skill'); onSelect(c.id); }}
                  onDelete={() => onDelete(c.id)}
                />
              ))}
            </div>
          </div>
        )}

        {drafts.length > 0 && (
          <div>
            <SectionLabel label="Drafts" count={drafts.length} />
            <div className="space-y-0.5">
              {drafts.map((c) => (
                <SidebarItem
                  key={c.id}
                  label={c.skill!.name}
                  sublabel={`Edited ${timeAgo(c.updatedAt)}`}
                  isActive={activeView === 'skill' && c.id === activeId}
                  isPublished={false}
                  onClick={() => { onViewChange('skill'); onSelect(c.id); }}
                  onDelete={() => onDelete(c.id)}
                />
              ))}
            </div>
          </div>
        )}

        {inProgress.length > 0 && (
          <div>
            <SectionLabel label="In progress" count={inProgress.length} />
            <div className="space-y-0.5">
              {inProgress.map((c) => (
                <SidebarItem
                  key={c.id}
                  label={c.title}
                  sublabel={timeAgo(c.updatedAt)}
                  isActive={activeView === 'skill' && c.id === activeId}
                  isPublished={false}
                  onClick={() => { onViewChange('skill'); onSelect(c.id); }}
                  onDelete={() => onDelete(c.id)}
                />
              ))}
            </div>
          </div>
        )}

        {conversations.length === 0 && (
          <p className="px-1 text-xs text-white/25">No skills yet.</p>
        )}
      </div>
    </aside>
  );
}
