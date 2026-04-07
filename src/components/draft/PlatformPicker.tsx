'use client';

import { useState } from 'react';
import type { Integration, PlatformGroup } from '@/types/skill';
import integrationData from '@/data/integrations.json';

const ALL_INTEGRATIONS = integrationData as Integration[];

function findIntegration(name: string): Integration | undefined {
  return ALL_INTEGRATIONS.find((i) => i.name.toLowerCase() === name.toLowerCase());
}

interface Props {
  platformGroups: PlatformGroup[];
  selected: string[];
  customIntegrations: Integration[];
  onToggle: (name: string) => void;
  onAddCustom: (integration: Integration) => void;
  onConfirm: () => void;
}

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'needs-url'; name: string }
  | { status: 'error'; message: string };

function PlatformTile({
  name,
  isSelected,
  onToggle,
}: {
  name: string;
  isSelected: boolean;
  onToggle: (name: string) => void;
}) {
  return (
    <button
      onClick={() => onToggle(name)}
      className={`flex w-full items-center gap-3 rounded-[8px] border px-4 py-3 text-left text-sm font-medium transition-all duration-150
        ${isSelected
          ? 'border-navy bg-navy text-white shadow-sm'
          : 'border-[rgba(0,0,0,0.08)] bg-white text-charcoal hover:border-navy/30 hover:shadow-sm'
        }`}
    >
      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors
        ${isSelected ? 'border-white/40 bg-white/20' : 'border-[rgba(0,0,0,0.15)]'}`}
      >
        {isSelected && (
          <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 10">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {name}
    </button>
  );
}

export function PlatformPicker({
  platformGroups,
  selected,
  customIntegrations,
  onToggle,
  onAddCustom,
  onConfirm,
}: Props) {
  const [nameInput, setNameInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [lookup, setLookup] = useState<LookupState>({ status: 'idle' });

  const customNames = new Set(customIntegrations.map((i) => i.name));

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    setLookup({ status: 'loading' });
    try {
      const res = await fetch(`/api/draft/lookup-docs?name=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (data.found) {
        const integration: Integration = { name, url: data.docsUrl, category: 'Custom', docsUrl: data.docsUrl };
        onAddCustom(integration);
        setNameInput('');
        setLookup({ status: 'idle' });
      } else {
        setLookup({ status: 'needs-url', name });
      }
    } catch {
      setLookup({ status: 'error', message: 'Something went wrong. Try again.' });
    }
  }

  function handleManualUrl(e: React.FormEvent) {
    e.preventDefault();
    if (lookup.status !== 'needs-url') return;
    const url = urlInput.trim();
    if (!url) return;
    const integration: Integration = {
      name: lookup.name,
      url,
      category: 'Custom',
      docsUrl: url,
      description: descriptionInput.trim() || undefined,
    };
    onAddCustom(integration);
    setNameInput('');
    setUrlInput('');
    setDescriptionInput('');
    setLookup({ status: 'idle' });
  }

  return (
    <div className="space-y-5">
      {/* Role-grouped tiles */}
      {platformGroups.map((group) => (
        <div key={group.role}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-charcoal/40">
            {group.role}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {group.platforms.map((name) => (
              <PlatformTile
                key={name}
                name={name}
                isSelected={selected.includes(name)}
                onToggle={onToggle}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Custom integrations */}
      {customIntegrations.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-charcoal/40">
            Added by you
          </p>
          <div className="grid grid-cols-2 gap-2">
            {customIntegrations.map((i) => (
              <PlatformTile
                key={i.name}
                name={i.name}
                isSelected={selected.includes(i.name)}
                onToggle={onToggle}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add custom */}
      <div className="rounded-[8px] border border-dashed border-[rgba(0,0,0,0.12)] p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-charcoal/40">
          Add another platform
        </p>

        {lookup.status !== 'needs-url' ? (
          <form onSubmit={handleLookup} className="flex gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Gorgias, Attentive…"
              disabled={lookup.status === 'loading'}
              className="flex-1 rounded-[6px] border border-[rgba(0,0,0,0.1)] bg-white px-3 py-2 text-sm text-charcoal placeholder-charcoal/30 outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/10 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!nameInput.trim() || lookup.status === 'loading'}
              className="rounded-[6px] border border-[rgba(0,0,0,0.1)] bg-white px-3 py-2 text-sm font-semibold text-charcoal transition-colors hover:border-navy/30 hover:text-navy disabled:opacity-40"
            >
              {lookup.status === 'loading' ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-charcoal/20 border-t-charcoal/60" />
                  Looking up…
                </span>
              ) : (
                'Add'
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-charcoal/60">
              Couldn&apos;t find docs for{' '}
              <span className="font-medium text-charcoal">{lookup.name}</span> automatically.
            </p>
            <form onSubmit={handleManualUrl} className="space-y-2">
              <input
                type="text"
                value={descriptionInput}
                onChange={(e) => setDescriptionInput(e.target.value)}
                placeholder="What does it do? e.g. Manages loyalty points"
                className="w-full rounded-[6px] border border-[rgba(0,0,0,0.1)] bg-white px-3 py-2 text-sm text-charcoal placeholder-charcoal/30 outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/10"
              />
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://docs.example.com/api"
                  className="flex-1 rounded-[6px] border border-[rgba(0,0,0,0.1)] bg-white px-3 py-2 text-sm text-charcoal placeholder-charcoal/30 outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/10"
                />
                <button type="submit" disabled={!urlInput.trim()} className="rounded-[6px] border border-[rgba(0,0,0,0.1)] bg-white px-3 py-2 text-sm font-semibold text-charcoal hover:border-navy/30 hover:text-navy disabled:opacity-40">
                  Add
                </button>
                <button type="button" onClick={() => { setLookup({ status: 'idle' }); setNameInput(''); setDescriptionInput(''); }} className="text-xs text-charcoal/40 hover:text-charcoal/70">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {lookup.status === 'error' && (
          <p className="mt-2 text-xs text-poppy">{lookup.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-charcoal/40">{selected.length} selected</p>
        <button
          onClick={onConfirm}
          disabled={selected.length === 0}
          className="rounded-[6px] bg-poppy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-poppy-hover disabled:bg-charcoal/10 disabled:text-charcoal/30"
        >
          Generate draft →
        </button>
      </div>
    </div>
  );
}
