// ErrorState reutilizable
// Card de error con icono, mensaje y acción opcional.

"use client";

import { Card, CardBody } from "./Card";
import { Button } from "./Button";
import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
    href?: string;
  };
  children?: ReactNode;
}

export function ErrorState({
  title = "Ocurrió un error",
  message = "Intenta de nuevo más tarde.",
  action,
  children,
}: ErrorStateProps = {}) {
  return (
    <Card>
      <CardBody>
        <div className="flex flex-col items-center text-center py-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-error-light mb-3">
            <AlertCircle size={28} className="text-error" />
          </div>
          <h3 className="text-base font-bold text-text-primary">{title}</h3>
          {message && (
            <p className="text-sm text-text-secondary mt-1 max-w-md">
              {message}
            </p>
          )}
          {action && (
            <div className="mt-4">
              {action.href ? (
                <a
                  href={action.href}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent-deeper transition-colors"
                >
                  {action.label}
                </a>
              ) : (
                <Button variant="sky" onClick={action.onClick}>
                  {action.label}
                </Button>
              )}
            </div>
          )}
          {children}
        </div>
      </CardBody>
    </Card>
  );
}
