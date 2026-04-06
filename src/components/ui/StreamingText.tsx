'use client';

import { useEffect, useRef } from 'react';

interface Props {
  text: string;
  isStreaming: boolean;
  className?: string;
}

export function StreamingText({ text, isStreaming, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [text]);

  return (
    <div
      ref={ref}
      className={`overflow-y-auto whitespace-pre-wrap font-mono text-sm text-gray-700 ${className}`}
    >
      {text}
      {isStreaming && (
        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-gray-600" />
      )}
    </div>
  );
}
