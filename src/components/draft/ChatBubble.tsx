import type { ChatMessage } from '@/types/skill';

interface Props {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function ChatBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user';
  const isEmpty = !message.content && isStreaming;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed transition-all
          ${isUser
            ? 'rounded-tr-sm bg-navy text-white'
            : 'rounded-tl-sm bg-cream text-charcoal'
          }`}
      >
        {isEmpty ? (
          /* Typing indicator — three pulsing dots */
          <span className="flex items-center gap-1 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40 animate-bounce [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40 animate-bounce [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40 animate-bounce [animation-delay:300ms]" />
          </span>
        ) : (
          <>
            {message.content}
            {isStreaming && (
              <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-current opacity-40" />
            )}
          </>
        )}
      </div>
    </div>
  );
}
