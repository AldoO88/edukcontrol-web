// Página de Asignación de Materias a Maestros
// Permite asignar una materia a múltiples grupos a la vez.
// La tabla agrupa por maestro+materia para no generar filas duplicadas.

"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { TeacherSubject, User, Subject, Group } from "@/lib/types";
import { UserCheck, Trash2 } from "lucide-react";

type PopulatedAssignment = Omit<TeacherSubject, "teacher_id" | "subject_id" | "group_id"> & {
  teacher_id: User;
  subject_id: Subject;
  group_id: Group;
};

interface GroupedRow {
  key: string;
  teacher: User;
  subject: Subject;
  groups: { group: Group; assignmentId: string }[];
}

export default function TeacherSubjectsPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;

  const [assignments, setAssignments] = useState<PopulatedAssignment[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  // Delete state
  const [deletingGroup, setDeletingGroup] = useState<GroupedRow | null>(null);
  const [deletingSingle, setDeletingSingle] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [assignRes, teachersRes, subjectsRes, groupsRes] =
        await Promise.all([
          api.get<{ items: PopulatedAssignment[] }>(
            `${ENDPOINTS.DASHBOARD_TEACHER_SUBJECTS(schoolId)}?yearId=${yearId}`
          ),
          api.get<{ items: User[] }>(`${ENDPOINTS.DASHBOARD_TEACHERS(schoolId)}`),
          api.get<{ items: Subject[] }>(
            `${ENDPOINTS.SUBJECTS}?school=${schoolId}`
          ),
          api.get<{ items: Group[] }>(
            `${ENDPOINTS.DASHBOARD_GROUPS(schoolId)}?yearId=${yearId}`
          ),
        ]);
      setAssignments(assignRes.items || []);
      setTeachers(teachersRes.items || []);
      setSubjects(subjectsRes.items || []);
      setGroups(groupsRes.items || []);
    } catch {
      // Error silencioso
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolId, yearId]);

  const openCreateModal = () => {
    setSelectedTeacher("");
    setSelectedSubject("");
    setSelectedGroups(new Set());
    setError(null);
    setIsModalOpen(true);
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const toggleAllGroups = () => {
    if (selectedGroups.size === groups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(groups.map((g) => g._id)));
    }
  };

  const onSubmit = async () => {
    if (!selectedTeacher || !selectedSubject || selectedGroups.size === 0) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const groupIds = Array.from(selectedGroups);
      const results = await Promise.allSettled(
        groupIds.map((groupId) =>
          api.post(ENDPOINTS.TEACHER_SUBJECTS, {
            teacher_id: selectedTeacher,
            subject_id: selectedSubject,
            group_id: groupId,
            school_year_id: yearId,
          })
        )
      );

      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0 && failures.length < groupIds.length) {
        setError(`${groupIds.length - failures.length} asignaciones creadas. ${failures.length} fallaron.`);
      } else if (failures.length === groupIds.length) {
        setError("Error al crear las asignaciones.");
      } else {
        setIsModalOpen(false);
      }
      await fetchData();
    } catch {
      setError("Error al crear las asignaciones.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Agrupar por teacher+subject
  const grouped = useMemo<GroupedRow[]>(() => {
    const map = new Map<string, GroupedRow>();
    for (const a of assignments) {
      const teacher = a.teacher_id as User;
      const subject = a.subject_id as Subject;
      const group = a.group_id as Group;
      if (!teacher || !subject || !group) continue;

      const key = `${teacher._id}-${subject._id}`;
      if (!map.has(key)) {
        map.set(key, { key, teacher, subject, groups: [] });
      }
      map.get(key)!.groups.push({ group, assignmentId: a._id });
    }

    return Array.from(map.values()).sort((a, b) => {
      const nameA = `${a.teacher.name} ${a.teacher.last_name || ""}`;
      const nameB = `${b.teacher.name} ${b.teacher.last_name || ""}`;
      return nameA.localeCompare(nameB);
    });
  }, [assignments]);

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;
    try {
      await Promise.all(
        deletingGroup.groups.map((g) =>
          api.delete(`${ENDPOINTS.TEACHER_SUBJECTS}/${g.assignmentId}`)
        )
      );
      setDeletingGroup(null);
      await fetchData();
    } catch {
      setDeletingGroup(null);
    }
  };

  const handleDeleteSingle = async () => {
    if (!deletingSingle) return;
    try {
      await api.delete(`${ENDPOINTS.TEACHER_SUBJECTS}/${deletingSingle}`);
      setDeletingSingle(null);
      await fetchData();
    } catch {
      setDeletingSingle(null);
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando..." height="page" />;
  }

  const hasPrerequisites =
    teachers.length > 0 && subjects.length > 0 && groups.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asignar Materias"
        subtitle="Asignar materias a maestros por grupo"
        action={{
          label: "Nueva Asignación",
          onClick: openCreateModal,
        }}
      />

      {error && (
        <div className="p-3 rounded-xl bg-error-light text-error text-sm">
          {error}
        </div>
      )}

      {!hasPrerequisites && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Para crear asignaciones necesitas tener al menos un maestro, una
          materia y un grupo configurados.
        </div>
      )}

      {grouped.length === 0 ? (
        <EmptyState
          icon={<UserCheck size={48} />}
          title="No hay asignaciones"
          description="Asigna materias a maestros para que puedan calificar y tomar asistencia."
          action={
            hasPrerequisites
              ? { label: "Crear Asignación", onClick: openCreateModal }
              : undefined
          }
        />
      ) : (
        <Card>
          <CardBody className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50">
                    <th className="text-left px-4 py-3 font-semibold text-text-primary">Maestro</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-primary">Materia</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-primary">Grupos</th>
                    <th className="text-right px-4 py-3 font-semibold text-text-primary w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map((row) => (
                    <tr key={row.key} className="border-b border-border last:border-b-0 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-text-primary">
                          {row.teacher.name} {row.teacher.last_name || ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {row.subject.code && (
                            <span className="text-xs font-mono text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded">
                              {row.subject.code}
                            </span>
                          )}
                          <span className="text-text-primary">{row.subject.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {row.groups
                            .sort((a, b) => {
                              const ga = a.group.grade * 100 + a.group.section.charCodeAt(0);
                              const gb = b.group.grade * 100 + b.group.section.charCodeAt(0);
                              return ga - gb;
                            })
                            .map((g) => (
                              <span
                                key={g.assignmentId}
                                className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700 hover:bg-sky-200 cursor-default"
                                title="Click para eliminar"
                                onClick={() => setDeletingSingle(g.assignmentId)}
                              >
                                {g.group.grade}°{g.group.section}
                              </span>
                            ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDeletingGroup(row)}
                          className="p-1.5 rounded-lg hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                          title="Eliminar todas las asignaciones de este maestro"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Modal Nueva Asignación */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nueva Asignación"
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Maestro"
            placeholder="Seleccionar maestro"
            options={teachers.map((t) => ({
              value: t._id,
              label: `${t.name} ${t.last_name || ""}`,
            }))}
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
          />

          <Select
            label="Materia"
            placeholder="Seleccionar materia"
            options={subjects.map((s) => ({
              value: s._id,
              label: `${s.code} — ${s.name}`,
            }))}
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-text-primary">
                Grupos
              </label>
              <button
                type="button"
                onClick={toggleAllGroups}
                className="text-xs text-accent-dark hover:underline"
              >
                {selectedGroups.size === groups.length
                  ? "Deseleccionar todo"
                  : "Seleccionar todo"}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 p-3 rounded-xl border border-border bg-slate-50">
              {groups
                .sort((a, b) => {
                  const ga = a.grade * 100 + a.section.charCodeAt(0);
                  const gb = b.grade * 100 + b.section.charCodeAt(0);
                  return ga - gb;
                })
                .map((g) => (
                  <label
                    key={g._id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      selectedGroups.has(g._id)
                        ? "bg-accent/10 border border-accent/30"
                        : "bg-white border border-border hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.has(g._id)}
                      onChange={() => toggleGroup(g._id)}
                      className="w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent/30"
                    />
                    <span className="text-sm font-medium text-text-primary">
                      {g.grade}°{g.section}
                    </span>
                  </label>
                ))}
            </div>
            {selectedGroups.size > 0 && (
              <p className="text-xs text-text-muted">
                {selectedGroups.size} grupo{selectedGroups.size !== 1 ? "s" : ""} seleccionado{selectedGroups.size !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="sky"
              isLoading={isSubmitting}
              disabled={!selectedTeacher || !selectedSubject || selectedGroups.size === 0}
              onClick={onSubmit}
            >
              Asignar ({selectedGroups.size})
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm: eliminar todas las asignaciones de un maestro+materia */}
      <ConfirmDialog
        isOpen={!!deletingGroup}
        onClose={() => setDeletingGroup(null)}
        onConfirm={handleDeleteGroup}
        title="Eliminar asignaciones"
        message={
          deletingGroup
            ? `¿Eliminar la materia "${deletingGroup.subject.name}" de ${deletingGroup.teacher.name} ${deletingGroup.teacher.last_name || ""} en ${deletingGroup.groups.length} grupo${deletingGroup.groups.length !== 1 ? "s" : ""}?`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />

      {/* Confirm: eliminar una sola asignación */}
      <ConfirmDialog
        isOpen={!!deletingSingle}
        onClose={() => setDeletingSingle(null)}
        onConfirm={handleDeleteSingle}
        title="Eliminar asignación"
        message="¿Eliminar esta asignación individual?"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />
    </div>
  );
}
