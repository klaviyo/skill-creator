'use client';

import { useState } from 'react';
import type { Integration } from '@/types/skill';
import integrations from '@/data/integrations.json';

const ALL_INTEGRATIONS = integrations as Integration[];

interface Props {
  suggested: Integration[];
  selected: string[];
  customIntegrations: Integration[];
  onToggle: (name: string) => void;
  onAddCustom: (integration: Integration) => void;
  onConfirm: () => void;
}

function Chicklet({
  integration,
  isSelected,
  isSuggested,
  onToggle,
}: {
  integration: Integration;
  isSelected: boolean;
  isSuggested: boolean;
  onToggle: (name: string) => void;
}) {
  return (
    <button
      onClick={() => onToggle(integration.name)}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors
        ${isSelected
          ? 'border-indigo-500 bg-indigo-600 text-white'
          : isSuggested
          ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-400'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
        }`}
    >
      {isSelected && <span className="text-xs leading-none">✓</span>}
      {integration.name}
    </button>
  );
}

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'needs-url'; name: string }
  | { status: 'error'; message: string };

export function IntegrationPicker({ suggested, selected, customIntegrations, onToggle, onAddCustom, onConfirm }: Props) {
  const suggestedNames = new Set(suggested.map((i) => i.name));
  const customNames = new Set(customIntegrations.map((i) => i.name));
  const otherIntegrations = ALL_INTEGRATIONS.filter((i) => !suggestedNames.has(i.name) && !customNames.has(i.name));

  const [nameInput, setNameInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [lookup, setLookup] = useState<LookupState>({ status: 'idle' });

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;

    setLookup({ status: 'loading' });
    try {
      const res = await fetch(`/api/draft/lookup-docs?name=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (data.found) {
        const integration: Integration = {
          name,
          url: data.docsUrl,
          category: 'Custom',
          docsUrl: data.docsUrl,
        };
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
    };
    onAddCustom(integration);
    setNameInput('');
    setUrlInput('');
    setLookup({ status: 'idle' });
  }

  return (
    <div className="space-y-4">
      {suggested.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Suggested
          </p>
          <div className="flex flex-wrap gap-2">
            {suggested.map((i) => (
              <Chicklet
                key={i.name}
                integration={i}
                isSelected={selected.includes(i.name)}
                isSuggested
                onToggle={onToggle}
              />
            ))}
          </div>
        </div>
      )}

      {customIntegrations.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Your integrations
          </p>
          <div className="flex flex-wrap gap-2">
            {customIntegrations.map((i) => (
              <Chicklet
                key={i.name}
                integration={i}
                isSelected={selected.includes(i.name)}
                isSuggested={false}
                onToggle={onToggle}
              />
            ))}
          </div>
        </div>
      )}

      {otherIntegrations.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            All integrations
          </p>
          <div className="flex flex-wrap gap-2">
            {otherIntegrations.map((i) => (
              <Chicklet
                key={i.name}
                integration={i as Integration}
                isSelected={selected.includes(i.name)}
                isSuggested={false}
                onToggle={onToggle}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom integration input */}
      <div className="rounded-lg border border-dashed border-gray-200 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Add your own
        </p>

        {lookup.status !== 'needs-url' ? (
          <form onSubmit={handleLookup} className="flex gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Klaviyo, Attentive, Gorgias…"
              disabled={lookup.status === 'loading'}
              className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!nameInput.trim() || lookup.status === 'loading'}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-40"
            >
              {lookup.status === 'loading' ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                  Looking up…
                </span>
              ) : (
                'Add'
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              Couldn&apos;t find docs for <span className="font-medium text-gray-700">{lookup.name}</span> automatically. Paste a link to their API docs:
            </p>
            <form onSubmit={handleManualUrl} className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://docs.example.com/api"
                className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="submit"
                disabled={!urlInput.trim()}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-40"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setLookup({ status: 'idle' }); setNameInput(''); }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {lookup.status === 'error' && (
          <p className="mt-1.5 text-xs text-red-500">{lookup.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-400">{selected.length} selected</p>
        <button
          onClick={onConfirm}
          disabled={selected.length === 0}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400"
        >
          Generate skill →
        </button>
      </div>
    </div>
  );
}
