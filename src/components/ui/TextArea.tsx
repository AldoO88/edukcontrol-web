// Componente TextArea con label y error

import { type TextareaHTMLAttributes, forwardRef } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-semibold text-text-primary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full px-3 py-2 text-sm rounded-xl border
            bg-white text-text-primary
            placeholder:text-text-muted
            {/* Foco reforzado (Fase F a11y): accent-dark en vez de
                accent/30 — indicador de foco con contraste ≥3:1. */}
            focus:outline-none focus:ring-2 focus:ring-accent-dark/40 focus:border-accent-dark
            disabled:bg-slate-50 disabled:text-text-muted disabled:cursor-not-allowed
            min-h-[80px] resize-y
            ${error ? "border-error focus:ring-error/50 focus:border-error" : "border-border"}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  }
);

TextArea.displayName = "TextArea";
