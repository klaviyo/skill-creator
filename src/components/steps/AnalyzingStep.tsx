'use client';

import { useEffect, useRef, useState } from 'react';
import type { SkillMode, AnalysisResult } from '@/types/skill';
import { readSseStream } from '@/lib/streaming';

interface Props {
  text: string;
  mode: SkillMode;
  onResult: (result: AnalysisResult) => void;
  onError: (message: string) => void;
}

export function AnalyzingStep({ text, mode, onResult, onError }: Props) {
  const [dots, setDots] = useState('');
  const hasStarted = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    (async () => {
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, mode }),
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
      }
    })();
  }, [text, mode, onResult, onError]);

  return (
    <div className="flex items-center gap-3 py-6 text-sm text-zinc-500">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-indigo-500" />
      Analyzing{dots}
    </div>
  );
}
