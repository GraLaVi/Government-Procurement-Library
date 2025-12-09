interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioGroupProps {
  name: string;
  label?: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  columns?: 2 | 3 | 4;
}

export function RadioGroup({
  name,
  label,
  options,
  value,
  onChange,
  disabled = false,
  className = "",
  columns = 4,
}: RadioGroupProps) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-3">
          {label}
        </label>
      )}
      <div
        className={`grid ${gridCols[columns]} gap-3`}
        role="radiogroup"
        aria-label={label}
      >
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <label
              key={option.value}
              className={`
                relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer
                transition-all duration-200
                ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-white hover:border-muted hover:bg-muted-light/50"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                disabled={disabled}
                className="sr-only"
                aria-checked={isSelected}
              />
              {/* Custom radio indicator */}
              <span
                className={`
                  mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2
                  transition-all duration-200
                  ${
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-muted bg-white"
                  }
                `}
              >
                {isSelected && (
                  <span className="block w-full h-full rounded-full bg-white scale-[0.4]" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <span
                  className={`
                    block text-sm font-medium
                    ${isSelected ? "text-primary" : "text-foreground"}
                  `}
                >
                  {option.label}
                </span>
                {option.description && (
                  <span className="block text-xs text-muted mt-0.5">
                    {option.description}
                  </span>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
