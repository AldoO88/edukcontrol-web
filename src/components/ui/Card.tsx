// Componente Card con header y body

import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-2xl border border-border shadow-sm
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return (
    <div
      className={`
        px-6 py-4 border-b border-divider
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className = "" }: CardBodyProps) {
  return (
    <div className={`px-6 py-4 ${className}`}>{children}</div>
  );
}
