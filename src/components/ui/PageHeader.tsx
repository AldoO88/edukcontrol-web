// Componente PageHeader con título y acción

import { type ReactNode } from "react";
import Link from "next/link";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: ReactNode;
  };
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, action, children }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        {subtitle && (
          <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {children}
        {action && action.href ? (
          <Link
            href={action.href}
            className="
              inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold
              bg-accent-dark text-white rounded-xl
              hover:bg-accent-deeper transition-colors
              shadow-sm
            "
          >
            {action.icon}
            {action.label}
          </Link>
        ) : action ? (
          <button
            onClick={action.onClick}
            className="
              inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold
              bg-accent-dark text-white rounded-xl
              hover:bg-accent-deeper transition-colors
              shadow-sm
            "
          >
            {action.icon}
            {action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
