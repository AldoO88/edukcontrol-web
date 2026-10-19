// Modal "Crear Reporte de Conducta" (SOLO el prefecto puede crear en
// toda la plataforma — regla de permisos del backend) — puerto web de
// ConductModal.jsx: picker grupo→alumno, tipo (demerit/merit),
// gravedad (solo demerit), stepper de puntos con rangos y descripción
// (≤5000, obligatoria). school_year_id lo inyecta useReportsList desde
// el dashboard.

"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { GroupStudentPicker } from "@/app/prefect/_components/GroupStudentPicker";
import { FieldLabel } from "@/app/prefect/_components/CitationFields";
import { useGroupStudentPicker } from "@/lib/hooks/useGroupStudentPicker";

// Tipo de evento (mismos values que la app).
const EVENT_TYPES = [
  { value: "demerit", label: "Demérito" },
  { value: "merit", label: "Mérito" },
] as const;
type EventType = (typeof EVENT_TYPES)[number]["value"];

// Gravedad — SOLO aplica a demerit (en merit la app lo omite).
const SEVERITIES = [
  { value: "minor", label: "Leve" },
  { value: "moderate", label: "Moderado" },
  { value: "severe", label: "Grave" },
] as const;
type Severity = (typeof SEVERITIES)[number]["value"];

// Rangos del stepper por severidad/tipo: [min, max, default]
// (idénticos al backend ConductLogService.computePoints).
const POINTS_RANGE: Record<string, { min: number; max: number; def: number }> = {
  minor: { min: 1, max: 5, def: 5 },
  moderate: { min: 5, max: 9, def: 9 },
  severe: { min: 10, max: 18, def: 18 },
  merit: { min: 1, max: 5, def: 5 },
};

export interface ReportCreatePayload {
  student_id: string;
  eventType: EventType;
  severity?: Severity;
  description: string;
  points_impact_override: number;
}

interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    payload: ReportCreatePayload
  ) => Promise<{ success: boolean; message: string }>;
}

export function CreateReportModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateReportModalProps) {
  const picker = useGroupStudentPicker();

  const [studentId, setStudentId] = useState<string | null>(null);
  const [eventType, setEventType] = useState<EventType>("demerit");
  const [severity, setSeverity] = useState<Severity>("minor");
  const [points, setPoints] = useState(POINTS_RANGE.minor.def);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset al cerrar.
  useEffect(() => {
    if (isOpen) return;
    picker.reset();
    setStudentId(null);
    setEventType("demerit");
    setSeverity("minor");
    setPoints(POINTS_RANGE.minor.def);
    setDescription("");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Rango activo: merit usa su propio rango; demerit por severidad.
  const range =
    eventType === "merit" ? POINTS_RANGE.merit : POINTS_RANGE[severity];

  // Al cambiar tipo/gravedad el stepper vuelve al default del rango
  // (misma lógica que la app: se resetea el contador).
  const handleEventType = (t: EventType) => {
    setEventType(t);
    setPoints(t === "merit" ? POINTS_RANGE.merit.def : POINTS_RANGE[severity].def);
  };
  const handleSeverity = (s: Severity) => {
    setSeverity(s);
    setPoints(POINTS_RANGE[s].def);
  };

  // Clamp del stepper al rango activo.
  const clampPoints = (n: number) => Math.min(range.max, Math.max(range.min, n));

  const canSubmit =
    !!studentId && description.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit || !studentId) return;
    setIsSubmitting(true);
    setError("");
    const payload: ReportCreatePayload = {
      student_id: studentId,
      eventType,
      description: description.trim(),
      points_impact_override: clampPoints(points),
    };
    // severity solo viaja en demerit (la app lo omite en merit).
    if (eventType === "demerit") payload.severity = severity;
    const result = await onSubmit(payload);
    setIsSubmitting(false);
    if (result.success) onClose();
    else setError(result.message);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Reporte de Conducta" size="lg">
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

        {/* Tipo de evento */}
        <div>
          <FieldLabel>Tipo de Reporte</FieldLabel>
          <div className="flex bg-slate-100 rounded-xl p-1">
            {EVENT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => handleEventType(t.value)}
                className={`flex-1 py-2 rounded-lg text-xs transition-colors ${
                  eventType === t.value
                    ? t.value === "demerit"
                      ? "bg-white text-rose-600 font-bold shadow-sm"
                      : "bg-white text-emerald-600 font-bold shadow-sm"
                    : "text-slate-500 font-medium hover:text-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Gravedad — solo demerit */}
        {eventType === "demerit" && (
          <div>
            <FieldLabel>Gravedad</FieldLabel>
            <div className="flex bg-slate-100 rounded-xl p-1">
              {SEVERITIES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => handleSeverity(s.value)}
                  className={`flex-1 py-2 rounded-lg text-xs transition-colors ${
                    severity === s.value
                      ? "bg-white text-indigo-600 font-bold shadow-sm"
                      : "text-slate-500 font-medium hover:text-slate-700"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Puntos (stepper con rangos) */}
        <div>
          <FieldLabel>Puntos</FieldLabel>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPoints((p) => clampPoints(p - 1))}
              disabled={points <= range.min}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center disabled:opacity-40 transition-colors"
              aria-label="Restar punto"
            >
              <Minus size={16} />
            </button>
            <div className="flex-1 text-center">
              <p
                className={`text-3xl font-extrabold ${
                  eventType === "merit" ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {eventType === "merit" ? "+" : "-"}
                {points}
              </p>
              <p className="text-[11px] text-slate-400">
                rango {range.min}–{range.max} pts
              </p>
            </div>
            <button
              onClick={() => setPoints((p) => clampPoints(p + 1))}
              disabled={points >= range.max}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center disabled:opacity-40 transition-colors"
              aria-label="Sumar punto"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Descripción */}
        <div>
          <FieldLabel>Descripción</FieldLabel>
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            rows={4}
            placeholder="Describe el hecho observado..."
          />
          <p className="text-[11px] text-slate-400 mt-1 text-right">
            {description.length} / 5000
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
            Crear Reporte
          </Button>
        </div>
      </div>
    </Modal>
  );
}
