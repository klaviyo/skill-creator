'use client';

import { useState } from 'react';
import type { Skill } from '@/types/skill';
import { SkillSection } from './SkillSection';
import { ToolCallTable } from './ToolCallTable';

export function SkillCard({ skill }: { skill: Skill }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = [
      `# ${skill.name}`,
      `\nExample: "${skill.exampleCustomerMessage}"`,
      ...skill.sections.map((s) => `\n## ${s.title}\n${s.content}`),
      skill.toolCalls.length > 0
        ? `\n## Tool Calls\n${skill.toolCalls.map((tc) => `- ${tc.name} (${tc.httpMethod} ${tc.urlTemplate}): ${tc.description}`).join('\n')}`
        : '',
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div>
      {/* Skill header */}
      <div className="flex items-start justify-between border-b border-zinc-100 px-5 py-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900">{skill.name}</p>
          <p className="mt-1 text-sm italic text-zinc-400">&ldquo;{skill.exampleCustomerMessage}&rdquo;</p>
        </div>
        <button
          onClick={handleCopy}
          className="ml-4 shrink-0 text-xs font-medium text-zinc-400 hover:text-zinc-700"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Sections */}
      {skill.sections.map((section) => (
        <div key={section.title} className="border-b border-zinc-100 px-5 py-4">
          <SkillSection title={section.title} content={section.content} />
        </div>
      ))}

      {/* Tool calls */}
      {skill.toolCalls.length > 0 && (
        <div className="px-5 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Tool calls</p>
          <ToolCallTable toolCalls={skill.toolCalls} />
        </div>
      )}
    </div>
  );
}
