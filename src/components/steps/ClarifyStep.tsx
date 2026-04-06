'use client';

import { useState } from 'react';
import type { SkillMode, FaqItem, AnalysisResult } from '@/types/skill';
import { readSseStream } from '@/lib/streaming';

interface Props {
  originalText: string;
  mode: SkillMode;
  questions: string[];
  partialFaq?: FaqItem[];
  onResult: (result: AnalysisResult) => void;
  onError: (message: string) => void;
}

export function ClarifyStep({ originalText, mode, questions, partialFaq, onResult, onError }: Props) {
  const [answers, setAnswers] = useState<string[]>(questions.map(() => ''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dots, setDots] = useState('');

  function setAnswer(i: number, value: string) {
    setAnswers((prev) => { const next = [...prev]; next[i] = value; return next; });
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    const interval = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 500);

    try {
      const response = await fetch('/api/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalText, mode, questions, answers }),
      });
      if (!response.ok) { onError(`Request failed: ${response.statusText}`); return; }

      for await (const event of readSseStream(response)) {
        if (event.type === 'result') {
          onResult(event.payload as AnalysisResult);
        } else if (event.type === 'error') {
          onError(event.message);
        }
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Network error');
    } finally {
      clearInterval(interval);
    }
  }

  if (isSubmitting) {
    return (
      <div className="flex items-center gap-3 py-6 text-sm text-zinc-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-indigo-500" />
        Generating{dots}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {partialFaq && partialFaq.length > 0 && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {partialFaq.length} item{partialFaq.length > 1 ? 's' : ''} found that belong in your knowledge base, not a skill.
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-zinc-900">A few questions before we continue</p>
        <p className="mt-0.5 text-sm text-zinc-500">Answer all to generate the skill.</p>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={i}>
            <label className="mb-1.5 block text-sm text-zinc-700">
              {i + 1}. {q}
            </label>
            <textarea
              rows={2}
              value={answers[i]}
              onChange={(e) => setAnswer(i, e.target.value)}
              className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Your answer..."
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!answers.every((a) => a.trim())}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-zinc-100 disabled:text-zinc-400"
      >
        Generate skill
      </button>
    </div>
  );
}
