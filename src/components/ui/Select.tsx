import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = "", id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-card-foreground mb-2"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          // Sized to match Input exactly. It used to run px-4 py-3 at the
          // default text-base against Input's px-3 py-2 text-sm, so a Select
          // stood 12px taller than the Input beside it and the two never lined
          // up in a shared grid row.
          className={`
            w-full px-3 py-2 rounded-md border border-border
            bg-card-bg text-card-foreground text-sm
            transition-colors duration-200
            focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
            ${error ? "border-error focus:border-error focus:ring-error/20" : ""}
            ${className}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-2 text-sm text-error">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
