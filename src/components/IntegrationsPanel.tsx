'use client';

import { useState } from 'react';
import type { Integration } from '@/types/skill';
import integrationData from '@/data/integrations.json';

const ALL_INTEGRATIONS = integrationData as Integration[];

const CATEGORIES = Array.from(
  ALL_INTEGRATIONS.reduce((acc, i) => {
    if (!acc.has(i.category)) acc.set(i.category, []);
    acc.get(i.category)!.push(i);
    return acc;
  }, new Map<string, Integration[]>()),
);

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  eCommerce:     'Your primary store platform — the source of orders, products, and customers.',
  Subscriptions: 'Manages recurring orders and subscription billing.',
  Returns:       'Handles return requests, exchanges, and refunds.',
  Shipping:      'Tracks shipments and provides delivery status.',
  Helpdesk:      'Your customer support ticket system.',
  Reviews:       'Collects and manages product reviews.',
  Loyalty:       'Runs your points and rewards program.',
  Forms:         'Captures customer data and survey responses.',
  Automation:    'Connects your tools and automates workflows.',
  Analytics:     'Provides revenue and attribution reporting.',
  SMS:           'Sends and receives text messages with customers.',
  Custom:        'Integrations you\'ve added manually.',
};

const CUSTOM_CATEGORY = 'Custom';

interface Props {
  savedIntegrations: Integration[];
  isFirstTime: boolean;
  onChange: (integrations: Integration[]) => void;
}

export function IntegrationsPanel({ savedIntegrations, isFirstTime, onChange }: Props) {
  // Split saved into known (in ALL_INTEGRATIONS) and custom
  const savedCustom = savedIntegrations.filter(
    (s) => !ALL_INTEGRATIONS.some((i) => i.name.toLowerCase() === s.name.toLowerCase()),
  );

  const [selected, setSelected] = useState<Set<string>>(
    new Set(savedIntegrations.map((i) => i.name)),
  );
  const [customIntegrations, setCustomIntegrations] = useState<Integration[]>(savedCustom);
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0][0]);
  const [justSaved, setJustSaved] = useState(false);

  // Custom integration form state
  const [customName, setCustomName] = useState('');
  const [customDocs, setCustomDocs] = useState('');
  const [customError, setCustomError] = useState('');

  function notifyChange(nextSelected: Set<string>, nextCustom: Integration[]) {
    const knownSelected = ALL_INTEGRATIONS.filter((i) => nextSelected.has(i.name));
    const customSelected = nextCustom.filter((i) => nextSelected.has(i.name));
    onChange([...knownSelected, ...customSelected]);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  }

  function toggle(name: string) {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelected(next);
    notifyChange(next, customIntegrations);
  }

  function addCustomIntegration(e: React.FormEvent) {
    e.preventDefault();
    const name = customName.trim();
    const docsUrl = customDocs.trim();
    if (!name) return;
    if (!docsUrl) {
      setCustomError('Developer docs URL is required so we can look up the right API endpoints.');
      return;
    }
    if (customIntegrations.some((i) => i.name.toLowerCase() === name.toLowerCase())) {
      setCustomError('Already added.');
      return;
    }
    const integration: Integration = { name, url: docsUrl, category: CUSTOM_CATEGORY, docsUrl };
    const nextCustom = [...customIntegrations, integration];
    const nextSelected = new Set(selected).add(name);
    setCustomIntegrations(nextCustom);
    setSelected(nextSelected);
    setCustomName('');
    setCustomDocs('');
    setCustomError('');
    notifyChange(nextSelected, nextCustom);
  }

  function removeCustom(name: string) {
    const nextCustom = customIntegrations.filter((i) => i.name !== name);
    const nextSelected = new Set(selected);
    nextSelected.delete(name);
    setCustomIntegrations(nextCustom);
    setSelected(nextSelected);
    notifyChange(nextSelected, nextCustom);
  }

  // Build the nav categories including Custom if there are any
  const navCategories: [string, Integration[]][] = [
    ...CATEGORIES,
    ...(customIntegrations.length > 0
      ? [[CUSTOM_CATEGORY, customIntegrations] as [string, Integration[]]]
      : []),
  ];

  const activePlatforms =
    activeCategory === CUSTOM_CATEGORY
      ? customIntegrations
      : CATEGORIES.find(([cat]) => cat === activeCategory)?.[1] ?? [];

  const totalSelected = selected.size;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-cream">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(0,0,0,0.06)] bg-white px-6">
        <h2 className="text-sm font-semibold text-navy">Integrations</h2>
        <div className="flex items-center gap-3">
          {justSaved && <span className="text-xs text-charcoal/40">Saved</span>}
          {totalSelected > 0 && (
            <span className="rounded-full bg-navy/8 px-2.5 py-1 text-[11px] font-semibold text-navy/60">
              {totalSelected} selected
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Category nav */}
        <nav className="flex w-52 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-[rgba(0,0,0,0.06)] bg-white px-3 py-4">
          {isFirstTime && (
            <p className="mb-3 px-2 text-xs text-charcoal/45 leading-relaxed">
              Select the platforms your store uses. We'll pre-select them when you build a skill.
            </p>
          )}
          {navCategories.map(([category, integrations]) => {
            const selectedCount = integrations.filter((i) => selected.has(i.name)).length;
            const isActive = category === activeCategory;
            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`flex items-center justify-between rounded-[6px] px-3 py-2 text-left transition-colors ${
                  isActive ? 'bg-navy/8 text-navy' : 'text-charcoal/60 hover:bg-navy/4 hover:text-charcoal'
                }`}
              >
                <span className={`text-[13px] font-medium ${isActive ? 'text-navy' : ''}`}>
                  {category}
                </span>
                {selectedCount > 0 && (
                  <span className={`ml-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-navy text-white' : 'bg-charcoal/15 text-charcoal/60'
                  }`}>
                    {selectedCount}
                  </span>
                )}
              </button>
            );
          })}

          {/* Add custom integration nav item */}
          <button
            onClick={() => setActiveCategory(CUSTOM_CATEGORY)}
            className={`mt-1 flex items-center gap-1.5 rounded-[6px] px-3 py-2 text-left transition-colors ${
              activeCategory === CUSTOM_CATEGORY && customIntegrations.length === 0
                ? 'bg-navy/8 text-navy'
                : 'text-charcoal/40 hover:bg-navy/4 hover:text-charcoal/70'
            }`}
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 12 12">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-[13px] font-medium">Add custom</span>
          </button>
        </nav>

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="max-w-lg">
            {activeCategory === CUSTOM_CATEGORY ? (
              /* Custom integration panel */
              <>
                <h3 className="text-base font-semibold text-navy">Custom integrations</h3>
                <p className="mt-1 mb-6 text-sm text-charcoal/50">
                  Add any platform not in the list. Provide the developer docs URL so we can search for the right API endpoints when building skills.
                </p>

                {/* Existing custom integrations */}
                {customIntegrations.length > 0 && (
                  <div className="mb-6 space-y-2">
                    {customIntegrations.map((i) => (
                      <div
                        key={i.name}
                        className="flex items-center justify-between rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-navy">{i.name}</p>
                          <p className="truncate font-mono text-[11px] text-charcoal/40">{i.docsUrl}</p>
                        </div>
                        <button
                          onClick={() => removeCustom(i.name)}
                          className="ml-3 shrink-0 rounded p-1 text-charcoal/25 hover:text-charcoal/60 transition-colors"
                          aria-label="Remove"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 14 14">
                            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add form */}
                <form onSubmit={addCustomIntegration} className="space-y-3 rounded-[10px] border border-dashed border-[rgba(0,0,0,0.12)] bg-white p-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-charcoal/40">
                      Platform name
                    </label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => { setCustomName(e.target.value); setCustomError(''); }}
                      placeholder="e.g. Gorgias, Attentive, Klaviyo"
                      className="w-full rounded-[6px] border border-[rgba(0,0,0,0.1)] bg-cream px-3 py-2 text-sm text-charcoal placeholder-charcoal/30 outline-none focus:border-navy/30 focus:ring-2 focus:ring-navy/8"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-charcoal/40">
                      Developer docs URL
                    </label>
                    <input
                      type="url"
                      value={customDocs}
                      onChange={(e) => { setCustomDocs(e.target.value); setCustomError(''); }}
                      placeholder="https://docs.example.com/api"
                      className="w-full rounded-[6px] border border-[rgba(0,0,0,0.1)] bg-cream px-3 py-2 font-mono text-sm text-charcoal/70 placeholder-charcoal/30 outline-none focus:border-navy/30 focus:ring-2 focus:ring-navy/8"
                    />
                    <p className="mt-1 text-[11px] text-charcoal/40">
                      We'll search these docs to find the right API endpoints for your skills.
                    </p>
                  </div>
                  {customError && <p className="text-xs text-poppy">{customError}</p>}
                  <button
                    type="submit"
                    disabled={!customName.trim()}
                    className="rounded-[6px] bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy/85 disabled:opacity-30"
                  >
                    Add integration
                  </button>
                </form>
              </>
            ) : (
              /* Known category panel */
              <>
                <h3 className="text-base font-semibold text-navy">{activeCategory}</h3>
                {CATEGORY_DESCRIPTIONS[activeCategory] && (
                  <p className="mt-1 mb-6 text-sm text-charcoal/50">
                    {CATEGORY_DESCRIPTIONS[activeCategory]}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {activePlatforms.map((integration) => {
                    const isSelected = selected.has(integration.name);
                    return (
                      <button
                        key={integration.name}
                        onClick={() => toggle(integration.name)}
                        className={`group relative flex items-center gap-3 rounded-[10px] border px-4 py-3.5 text-left transition-all ${
                          isSelected
                            ? 'border-navy/30 bg-navy/6 shadow-sm'
                            : 'border-[rgba(0,0,0,0.08)] bg-white hover:border-navy/20 hover:shadow-sm'
                        }`}
                      >
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-all ${
                          isSelected ? 'border-navy bg-navy' : 'border-charcoal/20 group-hover:border-navy/40'
                        }`}>
                          {isSelected && (
                            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 10">
                              <path d="M2 5l2.5 2.5L8 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className={`text-sm font-medium ${isSelected ? 'text-navy' : 'text-charcoal'}`}>
                          {integration.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
