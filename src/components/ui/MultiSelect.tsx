// MultiSelect reutilizable
// Lista de checkboxes con badges de las opciones seleccionadas.

"use client";

import { X } from "lucide-react";

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  error,
}: MultiSelectProps) {
  const toggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const remove = (optionValue: string) => {
    onChange(value.filter((v) => v !== optionValue));
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-semibold text-text-primary">
          {label}
        </label>
      )}

      {/* Checkboxes */}
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg border transition-colors ${
              value.includes(option.value)
                ? "bg-accent/5 border-accent/30"
                : "border-border hover:bg-slate-50"
            }`}
          >
            <input
              type="checkbox"
              checked={value.includes(option.value)}
              onChange={() => toggle(option.value)}
              className="accent-accent rounded"
            />
            <span className="text-sm text-text-primary">{option.label}</span>
          </label>
        ))}
      </div>

      {/* Badges de seleccionados */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {value.map((v) => {
            const option = options.find((o) => o.value === v);
            return (
              <span
                key={v}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent/10 text-accent-dark"
              >
                {option?.label || v}
                <button
                  type="button"
                  onClick={() => remove(v)}
                  className="hover:text-error transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
