'use client';

import { useState } from 'react';
import type { SkillMode } from '@/types/skill';

interface Props {
  onSubmit: (text: string, mode: SkillMode) => void;
}

export function InputStep({ onSubmit }: Props) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<SkillMode>('single');

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700">
          Paste your document
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          placeholder="Paste a workflow doc, SOP, or support playbook..."
          className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <p className="mt-1 text-right text-xs text-zinc-400">{text.length.toLocaleString()} chars</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-700">Number of skills</p>
        <div className="flex gap-2">
          {([
            { value: 'single', label: 'One skill' },
            { value: 'multiple', label: 'Multiple skills' },
          ] as { value: SkillMode; label: string }[]).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors
                ${mode === value
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onSubmit(text.trim(), mode)}
        disabled={!text.trim()}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:bg-zinc-100 disabled:text-zinc-400"
      >
        Analyze
      </button>
    </div>
  );
}
