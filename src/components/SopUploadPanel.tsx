'use client';

import { useState, useCallback } from 'react';
import type { AnalysisResult, FaqItem, Skill, SkillMode } from '@/types/skill';
import { readSseStream } from '@/lib/streaming';

type PanelStep =
  | { step: 'input' }
  | { step: 'analyzing'; text: string; mode: SkillMode }
  | { step: 'clarifying'; text: string; mode: SkillMode; questions: string[]; partialFaq: FaqItem[] }
  | { step: 'done'; skills: Skill[]; faqItems: FaqItem[] };

interface Props {
  onSkillsCreated: (skills: Skill[]) => void;
}

export function SopUploadPanel({ onSkillsCreated }: Props) {
  const [panelStep, setPanelStep] = useState<PanelStep>({ step: 'input' });
  const [text, setText] = useState('');
  const [mode, setMode] = useState<SkillMode>('multiple');
  const [answers, setAnswers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addedAll, setAddedAll] = useState(false);

  const handleResult = useCallback((result: AnalysisResult, sourceText: string, sourceMode: SkillMode) => {
    if (result.needsClarification && result.clarifyingQuestions?.length) {
      setAnswers(result.clarifyingQuestions.map(() => ''));
      setPanelStep({
        step: 'clarifying',
        text: sourceText,
        mode: sourceMode,
        questions: result.clarifyingQuestions,
        partialFaq: result.faqItems ?? [],
      });
    } else {
      setPanelStep({ step: 'done', skills: result.skills ?? [], faqItems: result.faqItems ?? [] });
    }
  }, []);

  async function analyze(sourceText: string, sourceMode: SkillMode) {
    setPanelStep({ step: 'analyzing', text: sourceText, mode: sourceMode });
    setError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sourceText, mode: sourceMode }),
      });
      if (!res.ok) throw new Error(res.statusText);
      for await (const event of readSseStream(res)) {
        if (event.type === 'result') handleResult(event.payload as AnalysisResult, sourceText, sourceMode);
        else if (event.type === 'error') throw new Error(event.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setPanelStep({ step: 'input' });
    }
  }

  async function submitClarification() {
    if (panelStep.step !== 'clarifying') return;
    setError(null);
    const { text: sourceText, mode: sourceMode, questions } = panelStep;
    setPanelStep({ step: 'analyzing', text: sourceText, mode: sourceMode });
    try {
      const res = await fetch('/api/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalText: sourceText, mode: sourceMode, questions, answers }),
      });
      if (!res.ok) throw new Error(res.statusText);
      for await (const event of readSseStream(res)) {
        if (event.type === 'result') handleResult(event.payload as AnalysisResult, sourceText, sourceMode);
        else if (event.type === 'error') throw new Error(event.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setPanelStep({ step: 'input' });
    }
  }

  function reset() {
    setPanelStep({ step: 'input' });
    setText('');
    setAnswers([]);
    setError(null);
    setAddedAll(false);
  }

  function addAllToLibrary() {
    if (panelStep.step !== 'done') return;
    onSkillsCreated(panelStep.skills);
    setAddedAll(true);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-cream">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(0,0,0,0.06)] bg-white px-6">
        <h2 className="text-sm font-semibold text-navy">Upload SOP</h2>
        {panelStep.step !== 'input' && (
          <button
            onClick={reset}
            className="text-xs text-charcoal/40 hover:text-charcoal transition-colors"
          >
            Start over
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-xl">

          {/* ── Input ── */}
          {panelStep.step === 'input' && (
            <>
              <h3 className="text-base font-semibold text-navy">Paste your SOP or playbook</h3>
              <p className="mt-1 mb-6 text-sm text-charcoal/50">
                We'll read your support documentation and turn it into structured skills with the right tool calls. Paste as much or as little as you have.
              </p>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={12}
                placeholder="Paste a workflow doc, SOP, support playbook, or any process description…"
                className="w-full resize-y rounded-[10px] border border-[rgba(0,0,0,0.1)] bg-white px-4 py-3 text-sm text-charcoal placeholder-charcoal/30 outline-none focus:border-navy/30 focus:ring-2 focus:ring-navy/8"
              />
              <p className="mt-1 mb-5 text-right text-xs text-charcoal/30">
                {text.length.toLocaleString()} chars
              </p>

              <div className="mb-6">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-charcoal/40">
                  How many skills are in this document?
                </p>
                <div className="flex gap-2">
                  {([
                    { value: 'single' as SkillMode, label: 'One skill' },
                    { value: 'multiple' as SkillMode, label: 'Multiple skills' },
                  ]).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setMode(value)}
                      className={`rounded-[8px] border px-4 py-2 text-sm font-medium transition-all ${
                        mode === value
                          ? 'border-navy bg-navy text-white'
                          : 'border-[rgba(0,0,0,0.1)] bg-white text-charcoal hover:border-navy/30 hover:text-navy'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="mb-4 text-sm text-poppy">{error}</p>}

              <button
                onClick={() => analyze(text.trim(), mode)}
                disabled={!text.trim()}
                className="w-full rounded-[8px] bg-poppy px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-poppy-hover disabled:bg-charcoal/10 disabled:text-charcoal/30"
              >
                Analyze document
              </button>
            </>
          )}

          {/* ── Analyzing ── */}
          {panelStep.step === 'analyzing' && (
            <div className="flex items-center gap-3 py-12 text-sm text-charcoal/50">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-charcoal/10 border-t-navy" />
              Analyzing document…
            </div>
          )}

          {/* ── Clarifying ── */}
          {panelStep.step === 'clarifying' && (
            <>
              <h3 className="text-base font-semibold text-navy">A few questions first</h3>
              <p className="mt-1 mb-6 text-sm text-charcoal/50">
                Answer these so we can generate accurate skills.
              </p>

              {panelStep.partialFaq.length > 0 && (
                <div className="mb-5 rounded-[10px] border border-[rgba(0,0,0,0.07)] bg-white px-4 py-3">
                  <p className="text-xs font-semibold text-charcoal/50">
                    {panelStep.partialFaq.length} knowledge base item{panelStep.partialFaq.length !== 1 ? 's' : ''} found — we'll include those too.
                  </p>
                </div>
              )}

              <div className="space-y-4 mb-6">
                {panelStep.questions.map((q, i) => (
                  <div key={i}>
                    <label className="mb-1.5 block text-sm text-charcoal/70">
                      {i + 1}. {q}
                    </label>
                    <textarea
                      rows={2}
                      value={answers[i] ?? ''}
                      onChange={(e) => setAnswers((prev) => { const next = [...prev]; next[i] = e.target.value; return next; })}
                      className="w-full resize-none rounded-[8px] border border-[rgba(0,0,0,0.1)] bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-navy/30 focus:ring-2 focus:ring-navy/8"
                      placeholder="Your answer…"
                    />
                  </div>
                ))}
              </div>

              {error && <p className="mb-4 text-sm text-poppy">{error}</p>}

              <button
                onClick={submitClarification}
                disabled={!answers.every((a) => a.trim())}
                className="w-full rounded-[8px] bg-poppy px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-poppy-hover disabled:bg-charcoal/10 disabled:text-charcoal/30"
              >
                Generate skills
              </button>
            </>
          )}

          {/* ── Done ── */}
          {panelStep.step === 'done' && (
            <>
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-navy">
                    {panelStep.skills.length} skill{panelStep.skills.length !== 1 ? 's' : ''} found
                  </h3>
                  <p className="mt-1 text-sm text-charcoal/50">
                    Add them to your library to review, refine, and publish.
                  </p>
                </div>
                {!addedAll && panelStep.skills.length > 0 && (
                  <button
                    onClick={addAllToLibrary}
                    className="shrink-0 rounded-[6px] bg-poppy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-poppy-hover"
                  >
                    Add all to library
                  </button>
                )}
                {addedAll && (
                  <span className="shrink-0 rounded-[6px] bg-sage/15 px-3 py-2 text-sm font-semibold text-sage">
                    ✓ Added
                  </span>
                )}
              </div>

              {/* Skill previews */}
              {panelStep.skills.length > 0 && (
                <div className="mb-6 space-y-3">
                  {panelStep.skills.map((skill, i) => (
                    <div
                      key={i}
                      className="rounded-[10px] border border-[rgba(0,0,0,0.07)] bg-white px-5 py-4"
                    >
                      <p className="text-sm font-semibold text-navy">{skill.name}</p>
                      <p className="mt-0.5 text-xs italic text-charcoal/40">
                        &ldquo;{skill.exampleCustomerMessage}&rdquo;
                      </p>
                      {skill.toolCalls.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {skill.toolCalls.map((tc, j) => (
                            <span
                              key={j}
                              className="rounded-[4px] bg-navy/6 px-1.5 py-0.5 font-mono text-[10px] text-navy/60"
                            >
                              {tc.httpMethod} {tc.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* FAQ items */}
              {panelStep.faqItems.length > 0 && (
                <div className="rounded-[10px] border border-[rgba(0,0,0,0.07)] bg-white px-5 py-4">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-charcoal/40">
                    Knowledge base entries ({panelStep.faqItems.length})
                  </p>
                  <div className="space-y-3">
                    {panelStep.faqItems.map((item, i) => (
                      <div key={i} className="border-t border-[rgba(0,0,0,0.05)] pt-3 first:border-0 first:pt-0">
                        <p className="text-sm font-medium text-charcoal">{item.question}</p>
                        <p className="mt-0.5 text-sm text-charcoal/55">{item.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {panelStep.skills.length === 0 && panelStep.faqItems.length === 0 && (
                <p className="text-sm text-charcoal/40">No skills or FAQ items were found. Try adding more detail to your document.</p>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
