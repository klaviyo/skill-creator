'use client';

import { useState } from 'react';
import type { Skill, FaqItem } from '@/types/skill';
import { SkillCard } from '@/components/skill/SkillCard';

interface Props {
  skills: Skill[];
  faqItems: FaqItem[];
  onStartOver: () => void;
}

function KnowledgeBlurb({ item }: { item: FaqItem }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(`Q: ${item.question}\nA: ${item.answer}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="px-4 py-3">
        <p className="text-sm font-medium text-zinc-900">{item.question}</p>
        <p className="mt-1.5 text-sm text-zinc-600">{item.answer}</p>
        {item.reason && (
          <p className="mt-2 text-xs text-zinc-400">{item.reason}</p>
        )}
      </div>
      <div className="flex items-center justify-end border-t border-zinc-100 px-4 py-2">
        <button
          onClick={handleCopy}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

export function ResultStep({ skills, faqItems, onStartOver }: Props) {
  return (
    <div>
      {skills.length === 0 && faqItems.length === 0 && (
        <div className="px-5 py-8 text-center text-sm text-zinc-500">
          No output was generated. Try again with more detail.
        </div>
      )}

      {skills.length > 0 && (
        <div>
          {skills.map((skill, i) => (
            <SkillCard key={i} skill={skill} />
          ))}
        </div>
      )}

      {faqItems.length > 0 && (
        <div className="border-t border-zinc-100 px-5 py-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Knowledge base entries</p>
              <p className="mt-0.5 text-xs text-zinc-400">
                This content should be added to your Klaviyo knowledge base, not a skill.
              </p>
            </div>
            <a
              href="https://www.klaviyo.com/knowledge-base"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              Open knowledge base →
            </a>
          </div>
          <div className="space-y-2">
            {faqItems.map((item, i) => <KnowledgeBlurb key={i} item={item} />)}
          </div>
        </div>
      )}

      <div className="border-t border-zinc-100 px-5 py-4">
        <button
          onClick={onStartOver}
          className="text-sm text-zinc-400 hover:text-zinc-600"
        >
          ← Start over
        </button>
      </div>
    </div>
  );
}
