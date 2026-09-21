// Página de Promoción Masiva de Alumnos (1→2→3)
// El backend expone POST /api/students/promote-bulk con body
// { promotions: [{ student_id, new_group_id }], school_year_id }.
// Aquí el admin selecciona los alumnos, asigna un grupo destino para cada
// uno (1°→2°, 2°→3°, o repetir grado) y se envía el batch.

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CheckCircle2, XCircle, GraduationCap, ChevronLeft } from "lucide-react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Student, Group } from "@/lib/types";

interface PromoteResult {
  student_id: string;
  status: "ok" | "error";
  controlNumber?: string;
  name?: string;
  error?: string;
}

export default function PromoteStudentsPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;

  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Mapeo student_id -> group_id destino (vacío = sin asignar)
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<PromoteResult[]>([]);

  const fetchData = async () => {
    try {
      const [studsRes, groupsRes] = await Promise.all([
        api.get<{ items: Student[] }>(
          `${ENDPOINTS.STUDENTS}?school_year_id=${yearId}`
        ),
        api.get<{ items: Group[] }>(
          `${ENDPOINTS.DASHBOARD_GROUPS(schoolId)}?yearId=${yearId}`
        ),
      ]);
      setStudents(studsRes.items || []);
      setGroups(groupsRes.items || []);
    } catch {
      // Error silencioso
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, yearId]);

  const filteredStudents = useMemo(() => {
    if (!filter) return students;
    const q = filter.toLowerCase();
    return students.filter(
      (s) =>
        s.first_name?.toLowerCase().includes(q) ||
        s.last_name?.toLowerCase().includes(q) ||
        s.controlNumber?.toLowerCase().includes(q)
    );
  }, [students, filter]);

  const toggleStudent = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filteredStudents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredStudents.map((s) => s._id)));
    }
  };

  const setAssignment = (studentId: string, groupId: string) => {
    setAssignments((prev) => ({ ...prev, [studentId]: groupId }));
  };

  const handleSubmit = async () => {
    // Build promotions array from selected students with assignments
    const promotions = Array.from(selected)
      .map((sid) => ({ student_id: sid, new_group_id: assignments[sid] }))
      .filter((p) => p.new_group_id); // skip students without a target group

    if (promotions.length === 0) {
      setResults([
        {
          student_id: "_",
          status: "error",
          error:
            "Selecciona alumnos y asígnales un grupo destino antes de promover.",
        },
      ]);
      return;
    }

    setSubmitting(true);
    setResults([]);
    try {
      const res = await api.post<{
        total: number;
        succeeded: number;
        failed: number;
        results: PromoteResult[];
      }>(`${ENDPOINTS.STUDENTS}/promote-bulk`, {
        promotions,
        school_year_id: yearId,
      });
      setResults(res.results || []);
      // Refrescar lista si hubo éxito
      if (res.succeeded > 0) fetchData();
    } catch (err) {
      setResults([
        {
          student_id: "_",
          status: "error",
          error: err instanceof Error ? err.message : "Error al promover",
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando..." height="page" />;
  }

  const groupOptions = groups.map((g) => ({
    value: g._id,
    label: `${g.grade}°${g.section}${g.shift === "vespertino" ? " (Vespertino)" : ""}`,
  }));

  const selectedCount = selected.size;
  const assignedCount = Array.from(selected).filter(
    (sid) => assignments[sid]
  ).length;

  return (
    <div className="space-y-6">
      <Link
        href={`/schools/${schoolId}/school-years/${yearId}/students`}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-accent-dark transition-colors"
      >
        <ChevronLeft size={16} />
        Volver a Alumnos
      </Link>

      <PageHeader
        title="Promoción de Ciclo"
        subtitle="Asigna el grupo destino para cada alumno (1°→2°, 2°→3°)"
      />

      {/* Resumen + acciones */}
      <Card>
        <CardBody className="!p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm">
            <span className="font-semibold text-text-primary">
              {selectedCount}
            </span>
            <span className="text-text-secondary">
              {" "}
              alumno{selectedCount === 1 ? "" : "s"} seleccionado
              {selectedCount === 1 ? "" : "s"}
            </span>
            {selectedCount > 0 && (
              <span className="text-text-secondary">
                {" · "}
                <span
                  className={
                    assignedCount === selectedCount
                      ? "text-emerald-600 font-semibold"
                      : "text-amber-600 font-semibold"
                  }
                >
                  {assignedCount}/{selectedCount}
                </span>{" "}
                con grupo destino
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAll}
              disabled={filteredStudents.length === 0}
            >
              {selected.size === filteredStudents.length
                ? "Deseleccionar todos"
                : "Seleccionar todos"}
            </Button>
            <Button
              variant="sky"
              size="sm"
              onClick={handleSubmit}
              disabled={selectedCount === 0 || assignedCount !== selectedCount}
              isLoading={submitting}
            >
              <GraduationCap size={14} className="mr-1.5" />
              Promover {selectedCount} alumno{selectedCount === 1 ? "" : "s"}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Filtro */}
      <Input
        placeholder="Buscar por nombre o número de control..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {results.length > 0 && (
        <Card>
          <CardBody>
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Resultado
            </h3>
            <div className="space-y-2">
              {results.map((r) => (
                <div
                  key={r.student_id}
                  className={`p-2 rounded-lg flex items-start gap-2 text-xs ${
                    r.status === "ok"
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-rose-50 text-rose-800"
                  }`}
                >
                  {r.status === "ok" ? (
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={14} className="shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">
                      {r.name ||
                        (r.controlNumber
                          ? `#${r.controlNumber}`
                          : "Batch")}{" "}
                      {r.status === "ok" ? "✓ promovido" : "✗ error"}
                    </p>
                    {r.error && <p>{r.error}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Lista de estudiantes */}
      {students.length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={48} />}
          title="No hay alumnos"
          description="Registra alumnos primero para poder promoverlos de ciclo."
        />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={48} />}
          title="Sin coincidencias"
          description="No hay alumnos que coincidan con la búsqueda."
        />
      ) : (
        <Card>
          <CardBody className="!p-0">
            <div className="divide-y divide-slate-100">
              {filteredStudents.map((s) => {
                const isSelected = selected.has(s._id);
                const currentGroup = s.current_group_id as
                  | (Group | string)
                  | undefined;
                const currentGroupLabel =
                  typeof currentGroup === "object"
                    ? `${currentGroup.grade}°${currentGroup.section}`
                    : "—";
                return (
                  <div
                    key={s._id}
                    className={`p-4 flex items-center gap-4 transition-colors ${
                      isSelected ? "bg-sky-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleStudent(s._id)}
                      className="w-4 h-4 accent-sky-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">
                        {s.first_name} {s.last_name}
                      </p>
                      <p className="text-xs text-text-secondary">
                        No. Control: {s.controlNumber} · Grupo actual:{" "}
                        {currentGroupLabel}
                      </p>
                    </div>
                    <div className="w-56 shrink-0">
                      <Select
                        placeholder="Grupo destino"
                        options={groupOptions}
                        value={assignments[s._id] || ""}
                        onChange={(e) =>
                          setAssignment(s._id, e.target.value)
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
