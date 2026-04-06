'use client';

import { useState, useRef, useEffect } from 'react';
import type { HttpMethod, Skill, ToolCall, ToolVariable, ToolVariableType } from '@/types/skill';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-blue-50 text-blue-700 border-blue-100',
  POST:   'bg-emerald-50 text-emerald-700 border-emerald-100',
  PUT:    'bg-amber-50 text-amber-700 border-amber-100',
  PATCH:  'bg-orange-50 text-orange-700 border-orange-100',
  DELETE: 'bg-red-50 text-red-700 border-red-100',
};

interface Props {
  skill: Skill;
  isRevising: boolean;
  onCopy: () => void;
  copied: boolean;
  onToolCallEdit: (index: number, updated: ToolCall) => void;
}

// ── Tool ref badges ────────────────────────────────────────────────────────

function ToolRefBadge({ name, onFocus }: { name: string; onFocus: (name: string) => void }) {
  return (
    <button
      onClick={() => onFocus(name)}
      className="inline rounded-[4px] bg-navy/8 px-1.5 py-0.5 text-xs font-semibold text-navy transition-colors hover:bg-navy/15 hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
    >
      {name}
    </button>
  );
}

function renderContent(text: string, onFocusTool: (name: string) => void) {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-2" />;
    const parts = line.split(/(\[[^\]]+\])/g);
    return (
      <p key={i} className="text-[15px] leading-relaxed text-charcoal">
        {parts.map((part, j) =>
          /^\[.+\]$/.test(part) ? (
            <ToolRefBadge key={j} name={part} onFocus={onFocusTool} />
          ) : (
            <span key={j}>{part}</span>
          ),
        )}
      </p>
    );
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

const VARIABLE_TYPES: ToolVariableType[] = ['string', 'number', 'boolean'];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-charcoal/35">
      {children}
    </p>
  );
}

function KVRows({
  rows,
  onChange,
}: {
  rows: Array<{ name: string; value: string }>;
  onChange: (rows: Array<{ name: string; value: string }>) => void;
}) {
  return (
    <div className="space-y-1.5">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={row.name}
            onChange={(e) => {
              const next = rows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r));
              onChange(next);
            }}
            placeholder="name"
            className="w-1/2 rounded-[6px] border border-[rgba(0,0,0,0.1)] bg-white px-2.5 py-1.5 font-mono text-xs text-charcoal/70 outline-none focus:border-navy/30"
          />
          <input
            value={row.value}
            onChange={(e) => {
              const next = rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r));
              onChange(next);
            }}
            placeholder="value"
            className="flex-1 rounded-[6px] border border-[rgba(0,0,0,0.1)] bg-white px-2.5 py-1.5 font-mono text-xs text-charcoal/70 outline-none focus:border-navy/30"
          />
          <button
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
            className="shrink-0 rounded p-1 text-charcoal/25 hover:text-charcoal/60 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 14 14">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...rows, { name: '', value: '' }])}
        className="text-[11px] font-semibold text-navy/50 hover:text-navy transition-colors"
      >
        + Add row
      </button>
    </div>
  );
}

// ── Inline tool call editor ────────────────────────────────────────────────

function ToolCallCard({
  toolCall,
  index,
  isFocused,
  cardRef,
  onEdit,
  onDismiss,
}: {
  toolCall: ToolCall;
  index: number;
  isFocused: boolean;
  cardRef: (el: HTMLDivElement | null) => void;
  onEdit: (index: number, updated: ToolCall) => void;
  onDismiss: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ToolCall>(toolCall);

  useEffect(() => {
    if (isFocused) setEditing(true);
  }, [isFocused]);

  useEffect(() => {
    if (!editing) setDraft(toolCall);
  }, [toolCall, editing]);

  function handleSave() {
    onEdit(index, draft);
    setEditing(false);
    onDismiss();
  }

  function handleCancel() {
    setDraft(toolCall);
    setEditing(false);
    onDismiss();
  }

  const hasExtras = !!(
    toolCall.variables?.length ||
    toolCall.headers?.length ||
    toolCall.queryParams?.length ||
    toolCall.bodyTemplate
  );

  return (
    <div
      ref={cardRef}
      className={`rounded-[10px] border transition-all duration-200 ${
        isFocused
          ? 'border-navy/30 shadow-[0_0_0_3px_rgba(31,58,95,0.08)]'
          : 'border-[rgba(0,0,0,0.06)]'
      } bg-cream`}
    >
      {editing ? (
        <div className="p-4 space-y-4">
          {/* Method + Name */}
          <div className="flex gap-2">
            <select
              value={draft.httpMethod}
              onChange={(e) => setDraft((d) => ({ ...d, httpMethod: e.target.value as HttpMethod }))}
              className="shrink-0 rounded-[6px] border border-[rgba(0,0,0,0.1)] bg-white px-2 py-1.5 text-xs font-bold text-charcoal outline-none focus:border-navy/30"
            >
              {HTTP_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Tool name"
              className="flex-1 rounded-[6px] border border-[rgba(0,0,0,0.1)] bg-white px-3 py-1.5 text-sm font-semibold text-navy outline-none focus:border-navy/30"
            />
          </div>

          {/* URL */}
          <div>
            <FieldLabel>URL template</FieldLabel>
            <input
              type="text"
              value={draft.urlTemplate}
              onChange={(e) => setDraft((d) => ({ ...d, urlTemplate: e.target.value }))}
              placeholder="https://api.example.com/v1/{resource}"
              className="w-full rounded-[6px] border border-[rgba(0,0,0,0.1)] bg-white px-3 py-1.5 font-mono text-xs text-charcoal/70 outline-none focus:border-navy/30"
            />
          </div>

          {/* Description */}
          <div>
            <FieldLabel>Description</FieldLabel>
            <input
              type="text"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="What this call does"
              className="w-full rounded-[6px] border border-[rgba(0,0,0,0.1)] bg-white px-3 py-1.5 text-xs text-charcoal outline-none focus:border-navy/30"
            />
          </div>

          {/* Variables */}
          <div>
            <FieldLabel>Variables</FieldLabel>
            <div className="space-y-1.5">
              {(draft.variables ?? []).map((v, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input
                    value={v.name}
                    onChange={(e) => setDraft((d) => ({ ...d, variables: (d.variables ?? []).map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))}
                    placeholder="name"
                    className="w-28 rounded-[6px] border border-[rgba(0,0,0,0.1)] bg-white px-2.5 py-1.5 font-mono text-xs text-charcoal/70 outline-none focus:border-navy/30"
                  />
                  <select
                    value={v.type}
                    onChange={(e) => setDraft((d) => ({ ...d, variables: (d.variables ?? []).map((x, j) => j === i ? { ...x, type: e.target.value as ToolVariableType } : x) }))}
                    className="rounded-[6px] border border-[rgba(0,0,0,0.1)] bg-white px-2 py-1.5 text-xs text-charcoal outline-none focus:border-navy/30"
                  >
                    {VARIABLE_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <label className="flex items-center gap-1 py-1.5 text-xs text-charcoal/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={v.required}
                      onChange={(e) => setDraft((d) => ({ ...d, variables: (d.variables ?? []).map((x, j) => j === i ? { ...x, required: e.target.checked } : x) }))}
                      className="rounded"
                    />
                    req
                  </label>
                  <input
                    value={v.description ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, variables: (d.variables ?? []).map((x, j) => j === i ? { ...x, description: e.target.value } : x) }))}
                    placeholder="description"
                    className="flex-1 rounded-[6px] border border-[rgba(0,0,0,0.1)] bg-white px-2.5 py-1.5 text-xs text-charcoal/70 outline-none focus:border-navy/30"
                  />
                  <button
                    onClick={() => setDraft((d) => ({ ...d, variables: (d.variables ?? []).filter((_, j) => j !== i) }))}
                    className="py-1.5 text-charcoal/25 hover:text-charcoal/60 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 14 14">
                      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                onClick={() => setDraft((d) => ({ ...d, variables: [...(d.variables ?? []), { name: '', type: 'string', required: true, description: '' }] }))}
                className="text-[11px] font-semibold text-navy/50 hover:text-navy transition-colors"
              >
                + Add variable
              </button>
            </div>
          </div>

          {/* Headers */}
          <div>
            <FieldLabel>Headers</FieldLabel>
            <KVRows
              rows={draft.headers ?? []}
              onChange={(rows) => setDraft((d) => ({ ...d, headers: rows }))}
            />
          </div>

          {/* Query params */}
          <div>
            <FieldLabel>Query parameters</FieldLabel>
            <KVRows
              rows={draft.queryParams ?? []}
              onChange={(rows) => setDraft((d) => ({ ...d, queryParams: rows }))}
            />
          </div>

          {/* Body template */}
          {['POST', 'PUT', 'PATCH'].includes(draft.httpMethod) && (
            <div>
              <FieldLabel>Body template</FieldLabel>
              <textarea
                value={draft.bodyTemplate ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, bodyTemplate: e.target.value }))}
                placeholder={'{\n  "key": "{{variable}}"\n}'}
                rows={4}
                className="w-full rounded-[6px] border border-[rgba(0,0,0,0.1)] bg-white px-3 py-2 font-mono text-xs text-charcoal/70 outline-none focus:border-navy/30 resize-y"
              />
            </div>
          )}

          {/* Timeout + retries */}
          <div className="flex gap-3">
            <div className="flex-1">
              <FieldLabel>Timeout (s)</FieldLabel>
              <input
                type="number"
                value={draft.timeout ?? 10}
                onChange={(e) => setDraft((d) => ({ ...d, timeout: parseInt(e.target.value) || 10 }))}
                className="w-full rounded-[6px] border border-[rgba(0,0,0,0.1)] bg-white px-3 py-1.5 text-xs text-charcoal outline-none focus:border-navy/30"
              />
            </div>
            <div className="flex-1">
              <FieldLabel>Max retries</FieldLabel>
              <input
                type="number"
                value={draft.maxRetries ?? 2}
                onChange={(e) => setDraft((d) => ({ ...d, maxRetries: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-[6px] border border-[rgba(0,0,0,0.1)] bg-white px-3 py-1.5 text-xs text-charcoal outline-none focus:border-navy/30"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={handleCancel} className="rounded-[6px] px-3 py-1.5 text-xs font-semibold text-charcoal/50 hover:text-charcoal transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} className="rounded-[6px] bg-navy px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-navy/85">
              Save
            </button>
          </div>
        </div>
      ) : (
        /* Read mode */
        <button
          onClick={() => setEditing(true)}
          className="flex w-full items-start gap-3 px-4 py-3 text-left group"
        >
          <span className={`mt-px shrink-0 rounded-[4px] border px-1.5 py-0.5 text-[10px] font-bold tracking-wider transition-colors ${METHOD_COLORS[toolCall.httpMethod] ?? 'bg-charcoal/5 text-charcoal border-charcoal/10'}`}>
            {toolCall.httpMethod}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-navy group-hover:underline group-hover:decoration-navy/30">
              {toolCall.name}
            </p>
            <p className="mt-0.5 break-all font-mono text-xs text-charcoal/50">{toolCall.urlTemplate}</p>
            {toolCall.description && (
              <p className="mt-1.5 text-xs text-charcoal/40">{toolCall.description}</p>
            )}
            {hasExtras && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {toolCall.variables?.map((v) => (
                  <span key={v.name} className="rounded-[4px] bg-navy/6 px-1.5 py-0.5 font-mono text-[10px] text-navy/60">
                    {v.name}
                    {v.required ? '' : '?'}
                  </span>
                ))}
                {toolCall.headers?.map((h) => (
                  <span key={h.name} className="rounded-[4px] bg-charcoal/6 px-1.5 py-0.5 font-mono text-[10px] text-charcoal/50">
                    {h.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className="mt-1 shrink-0 text-[10px] font-semibold uppercase tracking-widest text-charcoal/25 opacity-0 transition-opacity group-hover:opacity-100">
            Edit
          </span>
        </button>
      )}
    </div>
  );
}

// ── Main document ──────────────────────────────────────────────────────────

export function SkillDocument({ skill, isRevising, onCopy, copied, onToolCallEdit }: Props) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  function handleFocusTool(bracketedName: string) {
    const name = bracketedName.replace(/^\[|\]$/g, '');
    const index = skill.toolCalls.findIndex(
      (tc) => tc.name.toLowerCase() === name.toLowerCase(),
    );
    if (index === -1) return;
    setFocusedIndex(index);
    cardRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function handleDismiss() {
    setFocusedIndex(null);
  }

  return (
    <div
      className={`relative overflow-hidden rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-opacity duration-200 ${
        isRevising ? 'opacity-50 pointer-events-none' : 'opacity-100'
      }`}
    >
      {isRevising && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 text-sm font-medium text-charcoal/60">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-charcoal/10 border-t-charcoal/50" />
            Updating…
          </div>
        </div>
      )}

      {/* Skill name */}
      <div className="border-b border-[rgba(0,0,0,0.06)] px-7 pb-5 pt-7">
        <h1 className="font-serif text-[28px] font-normal leading-tight text-navy">
          {skill.name}
        </h1>
        <p className="mt-2 text-sm italic text-charcoal/40">&ldquo;{skill.exampleCustomerMessage}&rdquo;</p>
      </div>

      {/* Sections */}
      {skill.sections.map((section) => (
        <div key={section.title} className="border-b border-[rgba(0,0,0,0.06)] px-7 py-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-charcoal/35">
            {section.title}
          </p>
          <div className="space-y-2">{renderContent(section.content, handleFocusTool)}</div>
        </div>
      ))}

      {/* Tool calls */}
      {skill.toolCalls.length > 0 && (
        <div className="px-7 py-6">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-charcoal/35">
            API calls
          </p>
          <div className="space-y-2.5">
            {skill.toolCalls.map((tc, i) => (
              <ToolCallCard
                key={i}
                toolCall={tc}
                index={i}
                isFocused={focusedIndex === i}
                cardRef={(el) => { cardRefs.current[i] = el; }}
                onEdit={onToolCallEdit}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
