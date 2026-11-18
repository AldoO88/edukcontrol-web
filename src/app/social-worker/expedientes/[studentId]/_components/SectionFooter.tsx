// Footer compartido de las secciones de la ficha de expediente.
// Dos botones: "Guardar" (solo persiste) y "Guardar y siguiente"
// (persiste y avanza a la siguiente sección de la nav lateral).
// Los handlers ya vienen envueltos en handleSubmit() de react-hook-form
// desde cada sección — aquí solo se pintan.

"use client";

import { Button } from "@/components/ui/Button";
import { ArrowRight, Save } from "lucide-react";

interface SectionFooterProps {
  /** Persiste la sección (validación + PATCH). */
  onSave: () => void;
  /** Persiste y navega a la siguiente sección. Ausente en la última. */
  onNext?: () => void;
  isSaving: boolean;
  /** Label del botón secundario (default "Guardar"). */
  saveLabel?: string;
}

export function SectionFooter({
  onSave,
  onNext,
  isSaving,
  saveLabel = "Guardar",
}: SectionFooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 pt-4 mt-2 border-t border-divider">
      <Button
        type="button"
        variant="secondary"
        onClick={onSave}
        disabled={isSaving}
      >
        <Save size={16} />
        {saveLabel}
      </Button>
      {onNext && (
        <Button
          type="button"
          variant="emerald"
          onClick={onNext}
          disabled={isSaving}
          isLoading={isSaving}
        >
          Guardar y siguiente
          <ArrowRight size={16} />
        </Button>
      )}
    </div>
  );
}
