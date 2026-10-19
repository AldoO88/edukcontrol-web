// Modal "Reagendar Citatorio" (solo creador) — puerto web de
// RescheduleModal.jsx: fecha (min = hoy), hora (30 min) y lugar
// (chips + otro, prefills actuales) → PATCH
// /api/citations/:id/reschedule con scheduledDate ISO local naïve y
// location solo si cambió.

"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FieldLabel, LocationChips } from "@/app/prefect/_components/CitationFields";
import { localDateStr, naiveLocalIso } from "@/lib/dates";

interface RescheduleCitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Prefill: fecha/hora/lugar actuales del citatorio.
  initial: { date: string; time: string; location: string };
  onSubmit: (payload: {
    scheduledDate: string;
    location?: string;
  }) => Promise<{ success: boolean; message: string }>;
}

export function RescheduleCitationModal({
  isOpen,
  onClose,
  initial,
  onSubmit,
}: RescheduleCitationModalProps) {
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time || "08:30");
  const [location, setLocation] = useState(initial.location);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prefill al abrir.
  useEffect(() => {
    if (!isOpen) return;
    setDate(initial.date);
    setTime(initial.time || "08:30");
    setLocation(initial.location);
    setError("");
  }, [isOpen, initial]);

  const locationValid = location.trim().length > 0;
  const canSubmit = !!date && !!time && locationValid && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError("");
    const payload: { scheduledDate: string; location?: string } = {
      scheduledDate: naiveLocalIso(date, time),
    };
    // Location solo si cambió respecto al actual.
    if (location.trim() !== initial.location.trim()) {
      payload.location = location.trim();
    }
    const result = await onSubmit(payload);
    setIsSubmitting(false);
    if (result.success) onClose();
    else setError(result.message);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reagendar Citatorio" size="md">
      <div className="space-y-5">
        {/* Fecha + Hora */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Nueva fecha</FieldLabel>
            <Input
              type="date"
              value={date}
              min={localDateStr(new Date())} // no se reagenda al pasado
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Hora</FieldLabel>
            <Input
              type="time"
              value={time}
              step={1800} // 30 min, igual que la app
              onChange={(e) => setTime(e.target.value)}
            />
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
            Reagendar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
