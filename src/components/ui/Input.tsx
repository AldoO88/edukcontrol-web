// Componente Input con label, error e icono

import { type InputHTMLAttributes, forwardRef, type ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-semibold text-text-primary">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full px-3 py-2 text-sm rounded-xl border
              bg-white text-text-primary
              placeholder:text-text-muted
              focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
              disabled:bg-slate-50 disabled:text-text-muted disabled:cursor-not-allowed
              ${icon ? "pl-10" : ""}
              ${error ? "border-error focus:ring-error/30 focus:border-error" : "border-border"}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
