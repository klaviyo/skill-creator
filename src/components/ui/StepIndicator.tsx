const STEPS = ['Input', 'Analyzing', 'Clarify', 'Result'];

type StepName = 'input' | 'analyzing' | 'clarifying' | 'result';

const STEP_INDEX: Record<StepName, number> = {
  input: 0,
  analyzing: 1,
  clarifying: 2,
  result: 3,
};

export function StepIndicator({ current }: { current: StepName }) {
  const currentIndex = STEP_INDEX[current];

  return (
    <div className="flex items-center gap-1.5">
      {STEPS.map((label, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;

        return (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className={`h-1.5 w-1.5 rounded-full transition-colors
                ${isActive ? 'bg-indigo-500' : isDone ? 'bg-indigo-200' : 'bg-zinc-200'}`}
            />
            <span className={`text-xs ${isActive ? 'text-zinc-700 font-medium' : isDone ? 'text-zinc-400' : 'text-zinc-300'}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="text-zinc-200 text-xs">·</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
