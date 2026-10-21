// Componente Select con label y error

import { type SelectHTMLAttributes, forwardRef } from "react";

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-semibold text-text-primary">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            w-full px-3 py-2 text-sm rounded-xl border
            bg-white text-text-primary
            {/* Foco reforzado (Fase F a11y): accent-dark en vez de
                accent/30 — indicador de foco con contraste ≥3:1. */}
            focus:outline-none focus:ring-2 focus:ring-accent-dark/40 focus:border-accent-dark
            disabled:bg-slate-50 disabled:text-text-muted disabled:cursor-not-allowed
            ${error ? "border-error focus:ring-error/50 focus:border-error" : "border-border"}
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
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
