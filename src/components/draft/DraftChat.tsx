'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type {
  AnalysisResult, ChatMessage, ChatResponse, DraftPhase,
  Integration, PlatformGroup, Skill, FaqItem,
} from '@/types/skill';
import type { StoredConversation } from '@/lib/storage';
import { readSseStream } from '@/lib/streaming';
import { ChatBubble } from './ChatBubble';
import { PlatformPicker } from './PlatformPicker';
import integrationData from '@/data/integrations.json';

const ALL_INTEGRATIONS = integrationData as Integration[];

function findOrCreate(name: string): Integration {
  return (
    ALL_INTEGRATIONS.find((i) => i.name.toLowerCase() === name.toLowerCase()) ?? {
      name, url: '', category: 'Custom',
    }
  );
}

const OPENING_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: 'What do you want your agent to be able to do for customers?',
};

interface Props {
  initialConversation: StoredConversation;
  storedIntegrations: Integration[];
  onSkillChange: (skill: Skill | null, isRevising: boolean) => void;
  onConversationUpdate: (update: Partial<StoredConversation>) => void;
}

function phaseFromConversation(conv: StoredConversation): DraftPhase {
  if (conv.skill) {
    return {
      phase: 'drafting',
      messages: conv.messages.length ? conv.messages : [OPENING_MESSAGE],
      selectedIntegrations: conv.selectedIntegrations,
      skill: conv.skill,
      isRevising: false,
    };
  }
  return {
    phase: 'chatting',
    messages: conv.messages.length ? conv.messages : [OPENING_MESSAGE],
    isStreaming: false,
  };
}

export function DraftChat({ initialConversation, storedIntegrations, onSkillChange, onConversationUpdate }: Props) {
  const [phase, setPhase] = useState<DraftPhase>(() => phaseFromConversation(initialConversation));
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dots, setDots] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const convIdRef = useRef(initialConversation.id);

  // Reset when switching conversations
  useEffect(() => {
    if (convIdRef.current === initialConversation.id) return;
    convIdRef.current = initialConversation.id;
    setPhase(phaseFromConversation(initialConversation));
    setInput('');
    setError(null);
  }, [initialConversation.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [phase]);

  useEffect(() => {
    if (phase.phase !== 'generating') return;
    const interval = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 500);
    return () => clearInterval(interval);
  }, [phase.phase]);

  // Notify parent when skill changes
  useEffect(() => {
    if (phase.phase === 'drafting') {
      onSkillChange(phase.skill, phase.isRevising);
    } else if (phase.phase === 'chatting' || phase.phase === 'selecting') {
      onSkillChange(null, false);
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chat ───────────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (userText: string) => {
    if (phase.phase !== 'chatting' || phase.isStreaming) return;

    const userMsg: ChatMessage = { role: 'user', content: userText };
    const history: ChatMessage[] = [...phase.messages, userMsg];
    const isFirst = phase.messages.filter((m) => m.role === 'user').length === 0;

    setPhase({ phase: 'chatting', messages: [...history, { role: 'assistant', content: '' }], isStreaming: true });
    setError(null);

    if (isFirst) {
      onConversationUpdate({ title: userText.length > 48 ? userText.slice(0, 45) + '…' : userText });
    }

    try {
      const res = await fetch('/api/draft/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, storedIntegrations }),
      });
      if (!res.ok) throw new Error(res.statusText);

      let streamed = '';
      for await (const event of readSseStream(res)) {
        if (event.type === 'delta') {
          streamed += event.content;
          setPhase((prev) => {
            if (prev.phase !== 'chatting') return prev;
            const msgs = [...prev.messages];
            msgs[msgs.length - 1] = { role: 'assistant', content: streamed };
            return { ...prev, messages: msgs };
          });
        } else if (event.type === 'result') {
          const chatResponse = event.payload as ChatResponse;
          const finalMessages: ChatMessage[] = [...history, { role: 'assistant', content: chatResponse.message }];

          if (chatResponse.action === 'suggest_platforms') {
            const groups: PlatformGroup[] = chatResponse.platformGroups ?? [];
            const suggestedNames = new Set(groups.flatMap((g) => g.platforms));
            const storedMatches = storedIntegrations.filter((i) => suggestedNames.has(i.name));

            onConversationUpdate({ messages: finalMessages });

            if (storedMatches.length > 0) {
              // Stored integrations cover what's needed — skip the picker and generate immediately
              await generateSkill(finalMessages, storedMatches);
            } else {
              // No stored matches — show the platform picker so the user can choose
              const defaultSelected = groups.flatMap((g) => g.platforms.slice(0, 1));
              setPhase({ phase: 'selecting', messages: finalMessages, platformGroups: groups, selected: defaultSelected, customIntegrations: [] });
            }
          } else {
            setPhase({ phase: 'chatting', messages: finalMessages, isStreaming: false });
            onConversationUpdate({ messages: finalMessages });
          }
        } else if (event.type === 'error') {
          throw new Error(event.message);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setPhase((prev) =>
        prev.phase === 'chatting'
          ? { ...prev, isStreaming: false, messages: prev.messages.slice(0, -1) }
          : prev,
      );
    }
  }, [phase, onConversationUpdate]);

  // ── Platform selection ─────────────────────────────────────────────────────

  function handleToggle(name: string) {
    setPhase((prev) => {
      if (prev.phase !== 'selecting') return prev;
      const selected = prev.selected.includes(name)
        ? prev.selected.filter((n) => n !== name)
        : [...prev.selected, name];
      return { ...prev, selected };
    });
  }

  function handleAddCustom(integration: Integration) {
    setPhase((prev) => {
      if (prev.phase !== 'selecting') return prev;
      if (prev.customIntegrations.some((i) => i.name.toLowerCase() === integration.name.toLowerCase())) return prev;
      return { ...prev, customIntegrations: [...prev.customIntegrations, integration], selected: [...prev.selected, integration.name] };
    });
  }

  // ── Skill generation ──────────────────────────────────────────────────────

  async function generateSkill(messages: ChatMessage[], selectedIntegrations: Integration[]) {
    setPhase({ phase: 'generating', messages, selectedIntegrations });
    setError(null);
    onConversationUpdate({ selectedIntegrations });

    try {
      const res = await fetch('/api/draft/skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, selectedIntegrations }),
      });
      if (!res.ok) throw new Error(res.statusText);

      for await (const event of readSseStream(res)) {
        if (event.type === 'result') {
          const result = event.payload as AnalysisResult;
          const skill = result.skills?.[0];
          if (!skill) throw new Error('No skill generated.');
          const completionMsg: ChatMessage = {
            role: 'assistant',
            content: 'Draft ready. Review it on the right — type here to refine anything, or publish when you\'re satisfied.',
          };
          const finalMessages = [...messages, completionMsg];
          setPhase({ phase: 'drafting', messages: finalMessages, selectedIntegrations, skill, isRevising: false });
          onConversationUpdate({ skill, messages: finalMessages });
        } else if (event.type === 'error') {
          throw new Error(event.message);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setPhase((prev) =>
        prev.phase === 'generating'
          ? { phase: 'selecting', messages: prev.messages, platformGroups: [], selected: prev.selectedIntegrations.map((i) => i.name), customIntegrations: [] }
          : prev,
      );
    }
  }

  async function handleConfirm() {
    if (phase.phase !== 'selecting') return;

    const knownSelected = phase.selected
      .filter((name) => !phase.customIntegrations.some((c) => c.name === name))
      .map(findOrCreate);
    const customSelected = phase.customIntegrations.filter((i) => phase.selected.includes(i.name));

    await generateSkill(phase.messages, [...knownSelected, ...customSelected]);
  }


  // ── Revision ───────────────────────────────────────────────────────────────

  const sendRevision = useCallback(async (feedback: string) => {
    if (phase.phase !== 'drafting' || phase.isRevising) return;

    const userMsg: ChatMessage = { role: 'user', content: feedback };
    const currentSkill = phase.skill;
    const selectedIntegrations = phase.selectedIntegrations;

    setPhase((prev) =>
      prev.phase === 'drafting'
        ? { ...prev, messages: [...prev.messages, userMsg, { role: 'assistant', content: '' }], isRevising: true }
        : prev,
    );
    setError(null);

    try {
      const res = await fetch('/api/draft/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill: currentSkill, feedback, messages: phase.messages, selectedIntegrations }),
      });
      if (!res.ok) throw new Error(res.statusText);

      let streamed = '';
      for await (const event of readSseStream(res)) {
        if (event.type === 'delta') {
          streamed += event.content;
          setPhase((prev) => {
            if (prev.phase !== 'drafting') return prev;
            const msgs = [...prev.messages];
            msgs[msgs.length - 1] = { role: 'assistant', content: streamed };
            return { ...prev, messages: msgs };
          });
        } else if (event.type === 'result') {
          const { message, skill } = event.payload as { message: string; skill: Skill };
          setPhase((prev) => {
            if (prev.phase !== 'drafting') return prev;
            const msgs = [...prev.messages];
            msgs[msgs.length - 1] = { role: 'assistant', content: message };
            return { ...prev, messages: msgs, skill, isRevising: false };
          });
          onConversationUpdate({ skill, messages: [...phase.messages, userMsg, { role: 'assistant', content: message }] });
        } else if (event.type === 'error') {
          throw new Error(event.message);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setPhase((prev) =>
        prev.phase === 'drafting'
          ? { ...prev, isRevising: false, messages: prev.messages.slice(0, -2) }
          : prev,
      );
    }
  }, [phase, onConversationUpdate]);

  // ── Submit handler — context-aware ────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    if (phase.phase === 'chatting') sendMessage(text);
    else if (phase.phase === 'drafting') sendRevision(text);
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const messages = phase.messages;
  const isStreaming = (phase.phase === 'chatting' && phase.isStreaming) || (phase.phase === 'drafting' && phase.isRevising);
  const showInput = phase.phase === 'chatting' || phase.phase === 'drafting';
  const inputPlaceholder = phase.phase === 'drafting' ? 'What would you like to change?' : 'Describe what you want the agent to do…';
  const inputDisabled = (phase.phase === 'chatting' && phase.isStreaming) || (phase.phase === 'drafting' && phase.isRevising);

  return (
    <div className="flex h-full flex-col">
      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <ChatBubble
              key={i}
              message={msg}
              isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
            />
          ))}

          {/* Platform picker */}
          {phase.phase === 'selecting' && (
            <div className="rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-cream p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <p className="mb-4 text-sm font-semibold text-navy">
                Which platforms will this skill connect to?
              </p>
              <PlatformPicker
                platformGroups={phase.platformGroups}
                selected={phase.selected}
                customIntegrations={phase.customIntegrations}
                onToggle={handleToggle}
                onAddCustom={handleAddCustom}
                onConfirm={handleConfirm}
              />
            </div>
          )}

          {/* Generating state */}
          {phase.phase === 'generating' && (
            <div className="flex items-center gap-2.5 py-2 text-sm text-charcoal/50">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-charcoal/10 border-t-navy" />
              Drafting{dots}
            </div>
          )}

          {error && <p className="text-xs text-poppy">{error}</p>}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      {showInput && (
        <div className="border-t border-[rgba(0,0,0,0.06)] px-5 py-4">
          <form onSubmit={handleSubmit} className="flex gap-2.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={inputDisabled}
              placeholder={inputPlaceholder}
              className="flex-1 rounded-[8px] border border-[rgba(0,0,0,0.1)] bg-cream px-4 py-2.5 text-sm text-charcoal placeholder-charcoal/35 outline-none transition-colors focus:border-navy/30 focus:bg-white focus:ring-2 focus:ring-navy/8 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || inputDisabled}
              className="rounded-[6px] bg-poppy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-poppy-hover disabled:bg-charcoal/10 disabled:text-charcoal/30"
            >
              {phase.phase === 'drafting' ? 'Revise' : 'Send'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
