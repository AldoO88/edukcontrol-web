// LoadingState reutilizable
// Spinner con mensaje opcional. Reemplaza los spinners inline dispersos.

"use client";

import { Spinner } from "./Spinner";
import type { ReactNode } from "react";

interface LoadingStateProps {
  message?: string;
  height?: "page" | "inline" | "compact";
  children?: ReactNode;
}

export function LoadingState({
  message,
  height = "page",
  children,
}: LoadingStateProps = {}) {
  const heightClasses = {
    page: "min-h-[60vh]",
    inline: "py-12",
    compact: "py-4",
  }[height];

  return (
    <div
      className={`flex flex-col items-center justify-center ${heightClasses}`}
    >
      <Spinner size="lg" />
      {message && (
        <p className="mt-3 text-text-secondary text-sm">{message}</p>
      )}
      {children}
    </div>
  );
}
