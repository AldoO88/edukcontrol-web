// Componente Checkbox con label, error e icono opcional

import { type InputHTMLAttributes, forwardRef, type ReactNode, useState } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  error?: string;
  description?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, description, className = "", checked, defaultChecked, onChange, ...props }, ref) => {
    const isControlled = checked !== undefined;
    const [internal, setInternal] = useState<boolean>(
      isControlled ? !!checked : !!defaultChecked
    );
    const value = isControlled ? !!checked : internal;

    return (
      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input
            ref={ref}
            type="checkbox"
            checked={value}
            onChange={(e) => {
              if (!isControlled) setInternal(e.target.checked);
              onChange?.(e);
            }}
            className={`
              mt-0.5 h-4 w-4 rounded border border-border
              text-accent focus:ring-2 focus:ring-accent/30 focus:ring-offset-0
              disabled:cursor-not-allowed disabled:opacity-60
              ${className}
            `}
            {...props}
          />
          {(label !== undefined) && (
            <span className="text-sm text-text-primary">
              {label}
              {description && (
                <span className="block text-xs font-normal text-text-muted mt-0.5">
                  {description}
                </span>
              )}
            </span>
          )}
        </label>
        {error && <p className="text-xs text-error ml-6">{error}</p>}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";