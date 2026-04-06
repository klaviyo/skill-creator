'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Skill, ToolCall, Integration } from '@/types/skill';
import {
  listConversations,
  saveConversation,
  deleteConversation,
  createNewConversation,
  getOnboardingProfile,
  saveOnboardingProfile,
  type StoredConversation,
  type SkillStatus,
  type OnboardingProfile,
} from '@/lib/storage';
import { Sidebar } from '@/components/layout/Sidebar';
import { DraftChat } from '@/components/draft/DraftChat';
import { SkillDocument } from '@/components/draft/SkillDocument';
import { IntegrationsPanel } from '@/components/IntegrationsPanel';

export default function Home() {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentSkill, setCurrentSkill] = useState<Skill | null>(null);
  const [currentStatus, setCurrentStatus] = useState<SkillStatus>('draft');
  const [isRevising, setIsRevising] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [mounted, setMounted] = useState(false);
  const [onboardingProfile, setOnboardingProfile] = useState<OnboardingProfile | null>(null);
  const [activeView, setActiveView] = useState<'skill' | 'integrations'>('skill');

  useEffect(() => {
    setMounted(true);
    const profile = getOnboardingProfile();
    setOnboardingProfile(profile);
    const stored = listConversations();
    setConversations(stored);
    if (stored.length > 0) {
      setActiveId(stored[0].id);
      setCurrentSkill(stored[0].skill);
      setCurrentStatus(stored[0].status);
    } else {
      const conv = createNewConversation();
      saveConversation(conv);
      setConversations([conv]);
      setActiveId(conv.id);
    }
    // First-time users land on integrations to set up their stack
    if (!profile) setActiveView('integrations');
  }, []);

  function handleIntegrationsChange(integrations: Integration[]) {
    const profile: OnboardingProfile = {
      integrations,
      completedAt: onboardingProfile?.completedAt ?? new Date().toISOString(),
    };
    saveOnboardingProfile(profile);
    setOnboardingProfile(profile);
  }

  function handleViewChange(view: 'skill' | 'integrations') {
    setActiveView(view);
  }

  // ── Conversation management ────────────────────────────────────────────────

  function startNew() {
    const conv = createNewConversation();
    saveConversation(conv);
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setCurrentSkill(null);
    setCurrentStatus('draft');
    setCopyState('idle');
    setActiveView('skill');
  }

  function handleSelect(id: string) {
    const conv = conversations.find((c) => c.id === id);
    setActiveId(id);
    setCurrentSkill(conv?.skill ?? null);
    setCurrentStatus(conv?.status ?? 'draft');
    setCopyState('idle');
  }

  function handleDelete(id: string) {
    deleteConversation(id);
    const remaining = conversations.filter((c) => c.id !== id);
    setConversations(remaining);
    if (activeId === id) {
      if (remaining.length > 0) {
        handleSelect(remaining[0].id);
      } else {
        startNew();
      }
    }
  }

  const handleConversationUpdate = useCallback((update: Partial<StoredConversation>) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeId) return c;
        const wasPublished = c.status === 'published';
        const skillChanging = update.skill !== undefined;
        const revertToDraft = wasPublished && skillChanging;
        const next: StoredConversation = {
          ...c,
          ...update,
          updatedAt: new Date().toISOString(),
          ...(revertToDraft ? { status: 'draft' as SkillStatus, publishedAt: undefined } : {}),
        };
        saveConversation(next);
        return next;
      }),
    );
    if (update.skill !== undefined) setCurrentSkill(update.skill);
    setConversations((prev) => {
      const active = prev.find((c) => c.id === activeId);
      if (active) setCurrentStatus(active.status);
      return prev;
    });
  }, [activeId]);

  const handleSkillChange = useCallback((skill: Skill | null, revising: boolean) => {
    setCurrentSkill(skill);
    setIsRevising(revising);
  }, []);

  // ── Publish ────────────────────────────────────────────────────────────────

  function handlePublish() {
    const now = new Date().toISOString();
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeId) return c;
        const next: StoredConversation = { ...c, status: 'published', publishedAt: now, updatedAt: now };
        saveConversation(next);
        return next;
      }),
    );
    setCurrentStatus('published');
  }

  function handleUnpublish() {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeId) return c;
        const next: StoredConversation = { ...c, status: 'draft', publishedAt: undefined, updatedAt: new Date().toISOString() };
        saveConversation(next);
        return next;
      }),
    );
    setCurrentStatus('draft');
  }

  // ── Tool call editing ─────────────────────────────────────────────────────

  const handleToolCallEdit = useCallback((index: number, updated: ToolCall) => {
    if (!currentSkill) return;
    const updatedSkill = {
      ...currentSkill,
      toolCalls: currentSkill.toolCalls.map((tc, i) => (i === index ? updated : tc)),
    };
    setCurrentSkill(updatedSkill);
    handleConversationUpdate({ skill: updatedSkill });
  }, [currentSkill, handleConversationUpdate]);

  // ── JSON copy ─────────────────────────────────────────────────────────────

  function handleCopyJson() {
    if (!currentSkill) return;
    const payload = JSON.stringify(currentSkill, null, 2);
    navigator.clipboard.writeText(payload).then(() => {
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const activeConversation = conversations.find((c) => c.id === activeId);
  const isPublished = currentStatus === 'published';

  if (!mounted) return null;

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        activeView={activeView}
        onSelect={handleSelect}
        onNew={startNew}
        onDelete={handleDelete}
        onViewChange={handleViewChange}
        storedIntegrationCount={onboardingProfile?.integrations.length ?? 0}
      />

      {activeView === 'integrations' ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <IntegrationsPanel
            savedIntegrations={onboardingProfile?.integrations ?? []}
            isFirstTime={!onboardingProfile}
            onChange={handleIntegrationsChange}
          />
        </div>
      ) : (
        <>
          {/* Chat panel */}
          <div
            className={`flex h-full flex-col border-r border-[rgba(0,0,0,0.08)] bg-white transition-[width] duration-300 ${
              currentSkill ? 'w-[400px] shrink-0' : 'flex-1'
            }`}
          >
            <div className="flex h-14 shrink-0 items-center border-b border-[rgba(0,0,0,0.06)] px-6">
              <h2 className="truncate text-sm font-semibold text-navy">
                {activeConversation?.title ?? 'New skill'}
              </h2>
            </div>
            <div className="flex-1 overflow-hidden">
              {activeConversation && (
                <DraftChat
                  key={activeConversation.id}
                  initialConversation={activeConversation}
                  storedIntegrations={onboardingProfile?.integrations ?? []}
                  onSkillChange={handleSkillChange}
                  onConversationUpdate={handleConversationUpdate}
                />
              )}
            </div>
          </div>

          {/* Document panel */}
          {currentSkill ? (
            <div className="flex flex-1 flex-col overflow-hidden bg-cream">
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(0,0,0,0.06)] bg-white px-6">
                <div className="flex items-center gap-3 min-w-0">
                  <h2 className="font-serif text-base font-normal text-navy truncate">{currentSkill.name}</h2>
                  {isPublished && (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-sage/20 px-2 py-0.5 text-[11px] font-semibold text-sage">
                      <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 10 10">
                        <path fillRule="evenodd" d="M8.707 2.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L4 5.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Published
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={handleCopyJson}
                    className="rounded-[6px] border border-[rgba(0,0,0,0.1)] px-3 py-1.5 text-xs font-semibold text-charcoal transition-all hover:border-navy/30 hover:text-navy"
                  >
                    {copyState === 'copied' ? '✓ Copied' : 'Copy JSON'}
                  </button>
                  {isPublished ? (
                    <button
                      onClick={handleUnpublish}
                      className="rounded-[6px] border border-[rgba(0,0,0,0.1)] px-3 py-1.5 text-xs font-semibold text-charcoal/50 transition-all hover:border-navy/20 hover:text-charcoal"
                    >
                      Unpublish
                    </button>
                  ) : (
                    <button
                      onClick={handlePublish}
                      className="rounded-[6px] bg-poppy px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-poppy-hover"
                    >
                      Publish
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                <div className="mx-auto max-w-2xl">
                  <SkillDocument
                    skill={currentSkill}
                    isRevising={isRevising}
                    onCopy={handleCopyJson}
                    copied={copyState === 'copied'}
                    onToolCallEdit={handleToolCallEdit}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden flex-1 items-center justify-center bg-cream lg:flex">
              <div className="text-center">
                <p className="font-serif text-2xl font-normal text-navy/25">Your skill will appear here</p>
                <p className="mt-2 text-sm text-charcoal/30">Start a conversation to generate a draft</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
