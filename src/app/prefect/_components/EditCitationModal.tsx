// Modal "Editar Citatorio" (solo creador) — puerto web de
// EditCitationModal.jsx: tipo (chips), lugar (chips + otro) y motivo;
// envía SOLO los campos que cambiaron (payload parcial → PUT).

"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { FieldLabel, LocationChips } from "@/app/prefect/_components/CitationFields";
import { CITATION_TYPE_LABELS } from "@/lib/citations";

const ALLOWED_TYPES = ["behavioral", "administrative"] as const;
type CitationType = (typeof ALLOWED_TYPES)[number];

export interface CitationEditPayload {
  reason?: string;
  location?: string;
  type?: CitationType;
}

interface EditCitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Valores actuales del citatorio (prefill).
  initial: { type: string; location: string; reason: string };
  onSubmit: (
    payload: CitationEditPayload
  ) => Promise<{ success: boolean; message: string }>;
}

export function EditCitationModal({
  isOpen,
  onClose,
  initial,
  onSubmit,
}: EditCitationModalProps) {
  // Solo tipos editables por el prefecto (si el citatorio fuera
  // academic, el chip queda fuera de ALLOWED_TYPES y se ignora).
  const typeCompatible = ALLOWED_TYPES.includes(initial.type as CitationType);

  const [type, setType] = useState<CitationType>(
    typeCompatible ? (initial.type as CitationType) : "behavioral"
  );
  const [location, setLocation] = useState(initial.location);
  const [reason, setReason] = useState(initial.reason);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prefill al abrir (initial puede cambiar entre aperturas).
  useEffect(() => {
    if (!isOpen) return;
    const compatible = ALLOWED_TYPES.includes(initial.type as CitationType);
    setType(compatible ? (initial.type as CitationType) : "behavioral");
    setLocation(initial.location);
    setReason(initial.reason);
    setError("");
  }, [isOpen, initial]);

  const locationValid = location.trim().length > 0;

  // Payload PARCIAL: solo campos que difieren del prefill (la app hace
  // exactamente lo mismo para no pisar datos no tocados).
  const buildPayload = (): CitationEditPayload => {
    const payload: CitationEditPayload = {};
    if (typeCompatible && type !== initial.type) payload.type = type;
    if (location.trim() !== initial.location.trim()) payload.location = location.trim();
    if (reason.trim() !== initial.reason.trim()) payload.reason = reason.trim();
    return payload;
  };

  const hasChanges = Object.keys(buildPayload()).length > 0;
  const canSubmit = hasChanges && locationValid && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError("");
    const result = await onSubmit(buildPayload());
    setIsSubmitting(false);
    if (result.success) onClose();
    else setError(result.message);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Citatorio" size="md">
      <div className="max-h-[75vh] overflow-y-auto pr-1 space-y-5">
        {/* Tipo */}
        <div>
          <FieldLabel>Motivo (tipo)</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {ALLOWED_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  type === t
                    ? "bg-sky-500 border-sky-500 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {CITATION_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Lugar */}
        <div>
          <FieldLabel>Lugar</FieldLabel>
          <LocationChips value={location} onChange={setLocation} />
          {!locationValid && (
            <p className="text-xs text-rose-500 mt-1">El lugar es obligatorio.</p>
          )}
        </div>

        {/* Motivo / notas */}
        <div>
          <FieldLabel>Motivo / notas</FieldLabel>
          <TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Describe el motivo del citatorio..."
          />
          <p className="text-[11px] text-slate-400 mt-1 text-right">
            {reason.length} / 1000
          </p>
        </div>

        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!canSubmit}
          >
            Guardar cambios
          </Button>
        </div>
      </div>
    </Modal>
  );
}
