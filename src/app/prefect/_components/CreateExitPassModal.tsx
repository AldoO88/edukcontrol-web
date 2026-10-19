// Modal "Generar Pase de Salida" — puerto web de
// GenerateExitPassModal.jsx: picker grupo→alumno, nombre de quien
// retira (≤120), parentesco y motivo (chips) y detalles adicionales
// (opcional, ≤500). El backend pone exit_time (no se envía hora).

"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { GroupStudentPicker } from "@/app/prefect/_components/GroupStudentPicker";
import { FieldLabel } from "@/app/prefect/_components/CitationFields";
import { useGroupStudentPicker } from "@/lib/hooks/useGroupStudentPicker";

// Parentescos (mismos values/labels que la app).
const RELATIONSHIPS = [
  { value: "father", label: "Padre" },
  { value: "mother", label: "Madre" },
  { value: "guardian", label: "Tutor" },
  { value: "family", label: "Familiar" },
] as const;
type Relationship = (typeof RELATIONSHIPS)[number]["value"];

// Motivos (mismos values/labels que la app).
const REASONS = [
  { value: "illness", label: "Enfermedad" },
  { value: "medical", label: "Cita médica" },
  { value: "family", label: "Asunto familiar" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Otro" },
] as const;
type Reason = (typeof REASONS)[number]["value"];

export interface ExitPassCreatePayload {
  student_id: string;
  guardian_name: string;
  relationship: Relationship;
  reason: Reason;
  reason_detail?: string;
}

interface CreateExitPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    payload: ExitPassCreatePayload
  ) => Promise<{ success: boolean; message: string }>;
}

export function CreateExitPassModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateExitPassModalProps) {
  const picker = useGroupStudentPicker();

  const [studentId, setStudentId] = useState<string | null>(null);
  const [guardianName, setGuardianName] = useState("");
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [reason, setReason] = useState<Reason | null>(null);
  const [reasonDetail, setReasonDetail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset al cerrar.
  useEffect(() => {
    if (isOpen) return;
    picker.reset();
    setStudentId(null);
    setGuardianName("");
    setRelationship(null);
    setReason(null);
    setReasonDetail("");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Validación igual a la app: alumno + nombre + parentesco + motivo.
  const canSubmit =
    !!studentId &&
    guardianName.trim().length > 0 &&
    guardianName.trim().length <= 120 &&
    !!relationship &&
    !!reason &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit || !studentId || !relationship || !reason) return;
    setIsSubmitting(true);
    setError("");
    const result = await onSubmit({
      student_id: studentId,
      guardian_name: guardianName.trim(),
      relationship,
      reason,
      reason_detail: reasonDetail.trim() || undefined,
    });
    setIsSubmitting(false);
    if (result.success) onClose();
    else setError(result.message);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generar Pase de Salida" size="lg">
      <div className="max-h-[75vh] overflow-y-auto pr-1 space-y-5">
        {/* Paso 1-2: grupo + alumno */}
        <GroupStudentPicker
          groups={picker.groups}
          groupsLoading={picker.groupsLoading}
          selectedGroupId={picker.selectedGroupId}
          onSelectGroup={(id) => {
            picker.setSelectedGroupId(id);
            setStudentId(null); // cambia grupo → se limpia el alumno
          }}
          students={picker.students}
          studentsLoading={picker.studentsLoading}
          selectedStudentId={studentId}
          onSelectStudent={setStudentId}
        />

        {/* Quien retira */}
        <div>
          <FieldLabel>Nombre completo de quien retira</FieldLabel>
          <Input
            value={guardianName}
            onChange={(e) => setGuardianName(e.target.value)}
            maxLength={120}
            placeholder="Ej. María López García"
          />
        </div>

        {/* Parentesco */}
        <div>
          <FieldLabel>Parentesco</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {RELATIONSHIPS.map((r) => (
              <button
                key={r.value}
                onClick={() => setRelationship(r.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  relationship === r.value
                    ? "bg-sky-500 border-sky-500 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Motivo */}
        <div>
          <FieldLabel>Motivo de salida</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setReason(r.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  reason === r.value
                    ? "bg-sky-500 border-sky-500 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Detalles (opcional) */}
        <div>
          <FieldLabel>Detalles adicionales (opcional)</FieldLabel>
          <TextArea
            value={reasonDetail}
            onChange={(e) => setReasonDetail(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Información adicional sobre la salida..."
          />
          <p className="text-[11px] text-slate-400 mt-1 text-right">
            {reasonDetail.length} / 500
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
            Generar Pase
          </Button>
        </div>
      </div>
    </Modal>
  );
}
