// =====================================================================
// src/app/social-worker/_components/JustifyAbsenceModal.tsx
// ---------------------------------------------------------------------
// Modal para justificar una inasistencia (Fase D — pantalla de
// justificantes). Puerto web de JustifyAbsenceModal.jsx de la app:
//   - Card de info: alumno, grupo y fecha de la falta
//   - TextArea de motivo (obligatorio)
//   - Estado de éxito (check + auto-cierre a los 1.2s, igual que la
//     la app)
// El PUT lo dispara la página vía `onSubmit` (el hook useJustificantes
// parchea el ítem en local y el item cambia de tab solo).

"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { CheckCircle, FileCheck } from "lucide-react";
import { formatShortDate } from "@/lib/dates";
import type { JustificanteItem } from "@/lib/hooks/useJustificantes";

interface JustifyAbsenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  absence: JustificanteItem | null;
  /** Etiqueta del grupo ("1°A") ya resuelta por la página. */
  groupLabel?: string;
  /** PUT justifica — resuelve { success, message }. */
  onSubmit: (reason: string) => Promise<{ success: boolean; message: string }>;
}

export function JustifyAbsenceModal({
  isOpen,
  onClose,
  absence,
  groupLabel,
  onSubmit,
}: JustifyAbsenceModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Reset al abrir/cerrar (mismo ciclo que la app).
  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
      setIsSuccess(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setReason("");
    setError(null);
    setIsSuccess(false);
    onClose();
  }, [onClose]);

  const handleJustify = useCallback(async () => {
    if (!absence) return;
    if (!reason.trim()) {
      setError("Por favor ingresa un motivo.");
      return;
    }
    setIsLoading(true);
    setError(null);
    const result = await onSubmit(reason.trim());
    setIsLoading(false);
    if (result.success) {
      setIsSuccess(true);
      // Auto-cierre tras el estado de éxito (misma UX que la app).
      setTimeout(() => {
        handleClose();
      }, 1200);
    } else {
      setError(result.message || "No se pudo justificar la inasistencia.");
    }
  }, [absence, reason, onSubmit, handleClose]);

  if (!absence) return null;

  // Datos del alumno (student poblado por el endpoint).
  const student = absence.student_id || {};
  const studentName =
    `${student.first_name || ""} ${student.last_name || ""}`.trim() || "Desconocido";
  const dateStr = formatShortDate(absence.event_time || absence.createdAt) || "";

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Justificar inasistencia" size="sm">
      {/* Icono + título (el Modal web ya trae header con X; el icono
          queda como acento dentro del contenido). */}
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-100 text-rose-700">
            <FileCheck size={20} />
          </span>
          <div>
            <p className="text-sm font-bold text-text-primary">Inasistencia del alumno</p>
            <p className="text-xs text-text-secondary">
              Se registrará el motivo en el expediente de asistencia.
            </p>
          </div>
        </div>

        {/* Info de la falta */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Alumno</p>
          <p className="text-sm font-bold text-text-primary">{studentName}</p>
          {groupLabel && (
            <p className="text-xs text-slate-500 mt-0.5">Grupo: {groupLabel}</p>
          )}
          {dateStr && (
            <p className="text-xs text-slate-500 mt-0.5">Fecha: {dateStr}</p>
          )}
        </div>

        {isSuccess ? (
          /* Estado de éxito */
          <div className="flex flex-col items-center py-6">
            <span className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-3">
              <CheckCircle size={32} className="text-emerald-600" />
            </span>
            <p className="text-emerald-700 font-bold text-base">Justificada correctamente</p>
            <p className="text-slate-500 text-sm mt-1">La inasistencia fue justificada.</p>
          </div>
        ) : (
          <>
            {/* Motivo */}
            <div>
              <label
                htmlFor="justify-reason"
                className="block text-xs font-bold text-slate-500 uppercase mb-1.5"
              >
                Motivo de la justificación *
              </label>
              <TextArea
                id="justify-reason"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Ej. Enfermedad, cita médica, asunto familiar…"
                rows={4}
                maxLength={500}
              />
              {error && (
                <p className="text-xs font-semibold text-rose-600 mt-1.5">{error}</p>
              )}
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button
                variant="emerald"
                onClick={handleJustify}
                isLoading={isLoading}
                disabled={!reason.trim()}
              >
                <FileCheck size={14} className="mr-1.5" /> Justificar
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
