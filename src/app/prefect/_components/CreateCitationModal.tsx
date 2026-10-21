// Modal "Crear Citatorio" — puerto web de GenerateCitationModal.jsx:
// paso grupo → alumno, tipo (SOLO behavioral/administrative: el
// prefecto no crea academic), fecha (min = hoy), hora (granularidad
// 30 min vía input step 1800), lugar (chips + otro) y motivo opcional
// (≤1000). scheduledDate sale como ISO LOCAL NAÏVE (convención del
// backend desde 2026-10-14).

"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { Input } from "@/components/ui/Input";
import { GroupStudentPicker } from "@/app/prefect/_components/GroupStudentPicker";
import { FieldLabel, LocationChips } from "@/app/prefect/_components/CitationFields";
import { useGroupStudentPicker } from "@/lib/hooks/useGroupStudentPicker";
import { CITATION_TYPE_LABELS } from "@/lib/citations";
import { localDateStr, naiveLocalIso } from "@/lib/dates";

// El prefecto NO crea citatorios de tipo academic (regla de permisos
// del backend — se refleja en la UI).
const ALLOWED_TYPES = ["behavioral", "administrative"] as const;
type CitationType = (typeof ALLOWED_TYPES)[number];

export interface CitationCreatePayload {
  student: string;
  scheduledDate: string;
  type: CitationType;
  location: string;
  reason?: string;
}

interface CreateCitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    payload: CitationCreatePayload
  ) => Promise<{ success: boolean; message: string }>;
}

export function CreateCitationModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateCitationModalProps) {
  const picker = useGroupStudentPicker();

  const [studentId, setStudentId] = useState<string | null>(null);
  const [type, setType] = useState<CitationType>("behavioral");
  const [date, setDate] = useState(() => localDateStr(new Date()));
  const [time, setTime] = useState("08:30");
  const [location, setLocation] = useState("Trabajo Social");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset al cerrar (reabrir siempre empieza limpio). El picker vive
  // dentro del modal, pero lo reseteamos igual por si se monta fuera.
  useEffect(() => {
    if (isOpen) return;
    picker.reset();
    setStudentId(null);
    setType("behavioral");
    setDate(localDateStr(new Date()));
    setTime("08:30");
    setLocation("Trabajo Social");
    setReason("");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const locationValid = location.trim().length > 0;
  const canSubmit = !!studentId && locationValid && !!date && !!time && !isSubmitting;

  const handleSubmit = async () => {
    if (!studentId || !canSubmit) return;
    setIsSubmitting(true);
    setError("");
    const result = await onSubmit({
      student: studentId,
      scheduledDate: naiveLocalIso(date, time),
      type,
      location: location.trim(),
      reason: reason.trim() || undefined,
    });
    setIsSubmitting(false);
    if (result.success) onClose();
    else setError(result.message);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generar Citatorio" size="lg">
      <div className="max-h-[75vh] overflow-y-auto pr-1 space-y-5">
        {/* Paso 1-2: grupo + alumno */}
        <GroupStudentPicker
          groups={picker.groups}
          groupsLoading={picker.groupsLoading}
          selectedGroupId={picker.selectedGroupId}
          onSelectGroup={(id) => {
            picker.setSelectedGroupId(id);
            setStudentId(null); // cambia el grupo → se limpia el alumno elegido
          }}
          students={picker.students}
          studentsLoading={picker.studentsLoading}
          selectedStudentId={studentId}
          onSelectStudent={setStudentId}
        />

        {/* Motivo (tipo de citatorio) */}
        <div>
          <FieldLabel>Motivo</FieldLabel>
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

        {/* Fecha + Hora */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Fecha</FieldLabel>
            <Input
              type="date"
              value={date}
              min={localDateStr(new Date())} // no se citan días pasados
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Hora</FieldLabel>
            {/* step 1800 = granularidad de 30 min (stepper de la app). */}
            <Input
              type="time"
              value={time}
              step={1800}
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

        {/* Motivo / notas (opcional, ≤1000) */}
        <div>
          <FieldLabel>Motivo / notas (opcional)</FieldLabel>
          <TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Describe el motivo del citatorio..."
          />
          <p className="text-xs text-slate-400 mt-1 text-right">
            {reason.length} / 1000
          </p>
        </div>

        {/* Error del backend */}
        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">{error}</p>
        )}

        {/* Acciones */}
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
            Crear Citatorio
          </Button>
        </div>
      </div>
    </Modal>
  );
}
