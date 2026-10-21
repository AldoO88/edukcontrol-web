// Modal "Crear Aviso" — puerto web de CreateAnnouncementModal.jsx:
// tipo de audiencia (General / A Grupo multi-select / A Alumno con
// picker grupo→alumno), prioridad (Informativo/Urgente), título (≤200)
// y mensaje (≤5000, obligatorio). El botón "Guardar como borrador" NO
// se portó: en la app está sin implementar (Alert con TODO).
// school_id/created_by los pone el backend por JWT + tenant.

"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { GroupStudentPicker } from "@/app/prefect/_components/GroupStudentPicker";
import { FieldLabel } from "@/app/prefect/_components/CitationFields";
import { useGroupStudentPicker } from "@/lib/hooks/useGroupStudentPicker";

// Audiencias permitidas (mismos values que la app).
const TARGET_TYPES = [
  { value: "general", label: "General" },
  { value: "group", label: "A Grupo" },
  { value: "student", label: "A Alumno" },
] as const;
type TargetType = (typeof TARGET_TYPES)[number]["value"];

// Prioridades (label corto para los segmented, igual que la app).
const PRIORITIES = [
  { value: "informative", label: "Informativo" },
  { value: "urgent", label: "Urgente" },
] as const;
type Priority = (typeof PRIORITIES)[number]["value"];

export interface AnnouncementCreatePayload {
  title: string;
  message: string;
  priority: Priority;
  targetType: TargetType;
  targetGroups?: string[];
  targetStudents?: string[];
}

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    payload: AnnouncementCreatePayload
  ) => Promise<{ success: boolean; message: string }>;
}

export function CreateAnnouncementModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateAnnouncementModalProps) {
  const picker = useGroupStudentPicker();

  const [targetType, setTargetType] = useState<TargetType>("general");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  // Filtro de grado por pills en modo "A Grupo" (grados = 1°..6° según
  // los grupos cargados — la app los fija en el modal).
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [priority, setPriority] = useState<Priority>("informative");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset al cerrar.
  useEffect(() => {
    if (isOpen) return;
    picker.reset();
    setTargetType("general");
    setSelectedGroups([]);
    setSelectedStudentId(null);
    setGradeFilter(null);
    setPriority("informative");
    setTitle("");
    setMessage("");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Grados disponibles (enteros únicos de los grupos regulares).
  const grades = Array.from(
    new Set(picker.groups.map((g) => Number(String(g.label).replace("°.*", ""))))
  ).sort((a, b) => a - b);

  // Grupos visibles según el filtro de grado activo.
  const visibleGroups = picker.groups.filter((g) => {
    if (gradeFilter == null) return true;
    return Number(g.label.split("°")[0]) === gradeFilter;
  });

  // Toggle multi-select de grupos (idéntico a la app: clic agrega/quita).
  const toggleGroup = (id: string) => {
    setSelectedGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  // Validaciones compartidas con la app: título, mensaje, y según
  // audiencia ≥1 grupo o un alumno.
  const targetValid =
    targetType === "general" ||
    (targetType === "group" && selectedGroups.length > 0) ||
    (targetType === "student" && !!selectedStudentId);
  const canSubmit =
    title.trim().length > 0 && message.trim().length > 0 && targetValid && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError("");
    const payload: AnnouncementCreatePayload = {
      title: title.trim(),
      message: message.trim(),
      priority,
      targetType,
    };
    if (targetType === "group") payload.targetGroups = selectedGroups;
    if (targetType === "student" && selectedStudentId)
      payload.targetStudents = [selectedStudentId];
    const result = await onSubmit(payload);
    setIsSubmitting(false);
    if (result.success) onClose();
    else setError(result.message);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Aviso" size="lg">
      <div className="max-h-[75vh] overflow-y-auto pr-1 space-y-5">
        {/* Audiencia (segmented, estilo botones de la app) */}
        <div>
          <FieldLabel>Audiencia</FieldLabel>
          <div className="flex bg-slate-100 rounded-xl p-1">
            {TARGET_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTargetType(t.value)}
                className={`flex-1 py-2 rounded-lg text-xs transition-colors ${
                  targetType === t.value
                    ? "bg-white text-indigo-600 font-bold shadow-sm"
                    : "text-slate-500 font-medium hover:text-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audiencia "A Grupo": filtro de grado + chips multi-select */}
        {targetType === "group" && (
          <div>
            <FieldLabel>Grupos ({selectedGroups.length} seleccionados)</FieldLabel>
            {grades.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {grades.map((grade) => (
                  <button
                    key={grade}
                    onClick={() =>
                      setGradeFilter((prev) => (prev === grade ? null : grade))
                    }
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      gradeFilter === grade
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {grade}°
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pr-1">
              {picker.groupsLoading ? (
                <p className="text-sm text-slate-400">Cargando grupos…</p>
              ) : visibleGroups.length === 0 ? (
                <p className="text-sm text-slate-400">No hay grupos en este grado.</p>
              ) : (
                visibleGroups.map((group) => {
                  const isActive = selectedGroups.includes(group._id);
                  return (
                    <button
                      key={group._id}
                      onClick={() => toggleGroup(group._id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        isActive
                          ? "bg-sky-500 border-sky-500 text-white"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {group.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Audiencia "A Alumno": picker grupo → alumno (radio) */}
        {targetType === "student" && (
          <GroupStudentPicker
            groups={picker.groups}
            groupsLoading={picker.groupsLoading}
            selectedGroupId={picker.selectedGroupId}
            onSelectGroup={(id) => {
              picker.setSelectedGroupId(id);
              setSelectedStudentId(null);
            }}
            students={picker.students}
            studentsLoading={picker.studentsLoading}
            selectedStudentId={selectedStudentId}
            onSelectStudent={setSelectedStudentId}
          />
        )}

        {/* Prioridad (segmented, label completo como la app) */}
        <div>
          <FieldLabel>Prioridad</FieldLabel>
          <div className="flex bg-slate-100 rounded-xl p-1">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                className={`flex-1 py-2 rounded-lg text-xs transition-colors ${
                  priority === p.value
                    ? p.value === "urgent"
                      ? "bg-white text-rose-600 font-bold shadow-sm"
                      : "bg-white text-indigo-600 font-bold shadow-sm"
                    : "text-slate-500 font-medium hover:text-slate-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Título */}
        <div>
          <FieldLabel>Título</FieldLabel>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Ej. Reunión de padres del viernes"
          />
          <p className="text-xs text-slate-400 mt-1 text-right">{title.length} / 200</p>
        </div>

        {/* Mensaje */}
        <div>
          <FieldLabel>Mensaje</FieldLabel>
          <TextArea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={5000}
            rows={5}
            placeholder="Escribe el contenido del aviso..."
          />
          <p className="text-xs text-slate-400 mt-1 text-right">
            {message.length} / 5000
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
            Publicar Aviso
          </Button>
        </div>
      </div>
    </Modal>
  );
}
