import { cn } from '@/lib/utils';

interface ToggleButtonGroupProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}

export function ToggleButtonGroup<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: ToggleButtonGroupProps<T>) {
  return (
    <div className="inline-flex items-center bg-muted rounded-lg p-1 gap-0.5 flex-wrap">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md font-medium transition-all duration-200 whitespace-nowrap",
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            value === option.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
