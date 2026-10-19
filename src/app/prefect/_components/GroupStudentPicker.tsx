// Paso visual Grupo → Alumno para los modales de creación (citatorio,
// reporte, pase de salida, aviso dirigido). Chips de grupo + lista de
// alumnos del grupo elegido con selección única tipo radio.

"use client";

import { Check, Users } from "lucide-react";
import { StudentAvatar } from "@/app/prefect/_components/StudentAvatar";
import type { GroupOption } from "@/lib/hooks/useGroupStudentPicker";
import type { PrefectStudent } from "@/lib/types";

interface GroupStudentPickerProps {
  groups: GroupOption[];
  groupsLoading?: boolean;
  selectedGroupId: string | null;
  onSelectGroup: (id: string) => void;
  students: PrefectStudent[];
  studentsLoading?: boolean;
  selectedStudentId: string | null;
  onSelectStudent: (id: string) => void;
}

// Label del paso ("1. Selecciona un grupo").
function StepLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
      {children}
    </p>
  );
}

export function GroupStudentPicker({
  groups,
  groupsLoading,
  selectedGroupId,
  onSelectGroup,
  students,
  studentsLoading,
  selectedStudentId,
  onSelectStudent,
}: GroupStudentPickerProps) {
  return (
    <div className="space-y-4">
      {/* Paso 1: grupo */}
      <div>
        <StepLabel>1. Selecciona un grupo</StepLabel>
        {groupsLoading ? (
          <p className="text-sm text-slate-400">Cargando grupos…</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-slate-400">No hay grupos disponibles.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
            {groups.map((group) => {
              const isActive = selectedGroupId === group._id;
              return (
                <button
                  key={group._id}
                  onClick={() => onSelectGroup(group._id)}
                  className={`py-2 rounded-lg text-sm font-bold border transition-colors ${
                    isActive
                      ? "bg-sky-500 border-sky-500 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {group.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Paso 2: alumno (solo tras elegir grupo) */}
      {selectedGroupId && (
        <div>
          <StepLabel>2. Selecciona el alumno</StepLabel>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
              {studentsLoading ? (
                <p className="text-sm text-slate-400 p-4">Cargando alumnos…</p>
              ) : students.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-slate-400">
                  <Users size={28} />
                  <p className="text-sm mt-2">Este grupo no tiene alumnos.</p>
                </div>
              ) : (
                students.map((student) => {
                  const fullName =
                    `${student.first_name || ""} ${student.last_name || ""}`.trim();
                  const isActive = selectedStudentId === student._id;
                  return (
                    <button
                      key={student._id}
                      onClick={() => onSelectStudent(student._id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        isActive ? "bg-sky-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <StudentAvatar photoUrl={student.photoUrl} name={fullName} size={36} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-text-primary truncate">
                          {student.last_name}, {student.first_name}
                        </span>
                        <span className="block text-xs text-text-secondary">
                          {student.controlNumber || ""}
                        </span>
                      </span>
                      {isActive && (
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-500 text-white shrink-0">
                          <Check size={14} />
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
