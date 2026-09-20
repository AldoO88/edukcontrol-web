// Componente EmptyState para estados vacíos

import { type ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="text-text-muted mb-3">{icon}</div>}
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary mt-1 max-w-sm">{description}</p>
      )}
      {action && (
        <a
          href={action.href}
          onClick={action.onClick}
          className="
            mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold
            bg-accent-dark text-white rounded-xl
            hover:bg-accent-deeper transition-colors
          "
        >
          {action.label}
        </a>
      )}
    </div>
  );
}
