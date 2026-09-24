// Página Unificada de Alumnado
// Registro, inscripción, asignación de grupo/taller, promoción de ciclo.
// Todo en una sola tabla con acciones inline.

"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Student, Enrollment, Group, Subject } from "@/lib/types";
import {
  GraduationCap,
  Search,
  Plus,
  Upload,
  ChevronDown,
  UserPlus,
  Users,
  Wrench,
  FolderOpen,
  Eye,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// --- Schemas ---
const registerSchema = z.object({
  curp: z.string().regex(/^[A-Z0-9]{18}$/, "CURP debe tener 18 caracteres"),
  first_name: z.string().min(1, "Nombre requerido"),
  last_name: z.string().min(1, "Apellido requerido"),
  sex: z.enum(["male", "female", ""]).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  date_of_birth: z.string().optional(),
  blood_type: z.string().optional(),
  medical_notes: z.string().optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

// --- Types ---
type Tab = "all" | "no_group" | "enrolled" | "withdrawn";

interface EnrichedStudent {
  student: Student;
  enrollment: Enrollment | null;
  group: Group | null;
}

const CYCLE_STATUS_LABELS: Record<string, string> = {
  enrolled: "Inscrito",
  withdrawn: "Baja",
  graduated: "Graduado",
  transferred: "Transferido",
};

const CYCLE_STATUS_COLORS: Record<string, string> = {
  enrolled: "emerald",
  withdrawn: "rose",
  graduated: "sky",
  transferred: "amber",
};

export default function StudentsPage() {
  const router = useRouter();
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;

  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("all");

  // Register modal
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Assign group modal
  const [assignGroupStudent, setAssignGroupStudent] = useState<EnrichedStudent | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [isAssigningGroup, setIsAssigningGroup] = useState(false);

  // Assign taller modal
  const [assignTallerStudent, setAssignTallerStudent] = useState<EnrichedStudent | null>(null);
  const [selectedTallerId, setSelectedTallerId] = useState("");
  const [isAssigningTaller, setIsAssigningTaller] = useState(false);

  // Promote modal
  const [isPromoteOpen, setIsPromoteOpen] = useState(false);
  const [promoteSelectedIds, setPromoteSelectedIds] = useState<Set<string>>(new Set());
  const [promoteTargetYear, setPromoteTargetYear] = useState("");
  const [isPromoting, setIsPromoting] = useState(false);
  const [promoteResult, setPromoteResult] = useState<{ succeeded: number; failed: number } | null>(null);

  // Delete enrollment
  const [deleteTarget, setDeleteTarget] = useState<EnrichedStudent | null>(null);

  // Menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const fetchData = async () => {
    try {
      const [studentsRes, enrollmentsRes, groupsRes] = await Promise.all([
        api.get<{ items: Student[] }>(`${ENDPOINTS.STUDENTS}?status=active&limit=500`),
        api.get<{ items: Enrollment[] } | Enrollment[]>(
          `${ENDPOINTS.ENROLLMENTS}?school_year_id=${yearId}`
        ),
        api.get<Group[]>(`${ENDPOINTS.GROUPS}?school_year_id=${yearId}`),
      ]);

      setStudents(studentsRes.items || []);
      const enrollList = Array.isArray(enrollmentsRes)
        ? enrollmentsRes
        : enrollmentsRes.items || [];
      setEnrollments(enrollList);
      setGroups(groupsRes || []);
    } catch {
      setError("Error al cargar datos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolId, yearId]);

  // Build enriched data
  const enriched = useMemo<EnrichedStudent[]>(() => {
    const enrollByStudent = new Map<string, Enrollment>();
    for (const e of enrollments) {
      const sid = typeof e.student_id === "string" ? e.student_id : (e.student_id as Student)?._id;
      if (sid) enrollByStudent.set(sid, e);
    }

    return students.map((s) => {
      const enrollment = enrollByStudent.get(s._id) || null;
      const groupId =
        enrollment && typeof enrollment.group_id === "object"
          ? (enrollment.group_id as Group)._id
          : typeof enrollment?.group_id === "string"
            ? enrollment.group_id
            : null;
      const group = groupId ? groups.find((g) => g._id === groupId) || null : null;
      return { student: s, enrollment, group };
    });
  }, [students, enrollments, groups]);

  // Filter by tab
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return enriched.filter((e) => {
      // Tab filter
      if (activeTab === "no_group" && e.enrollment) return false;
      if (activeTab === "enrolled" && (!e.enrollment || e.enrollment.cycle_status !== "enrolled")) return false;
      if (activeTab === "withdrawn" && (!e.enrollment || e.enrollment.cycle_status !== "withdrawn")) return false;

      // Search filter
      if (!q) return true;
      return (
        e.student.first_name?.toLowerCase().includes(q) ||
        e.student.last_name?.toLowerCase().includes(q) ||
        e.student.controlNumber?.toLowerCase().includes(q)
      );
    });
  }, [enriched, activeTab, searchQuery]);

  const talleres = useMemo(() => groups.filter((g) => g.type === "taller"), [groups]);

  const tabCounts = useMemo(() => ({
    all: enriched.length,
    no_group: enriched.filter((e) => !e.enrollment).length,
    enrolled: enriched.filter((e) => e.enrollment?.cycle_status === "enrolled").length,
    withdrawn: enriched.filter((e) => e.enrollment?.cycle_status === "withdrawn").length,
  }), [enriched]);

  // --- Register ---
  const onRegister = async (data: RegisterFormData) => {
    setRegistering(true);
    setRegisterError(null);
    try {
      await api.post(`${ENDPOINTS.STUDENTS}/register`, {
        ...data,
        school: schoolId,
      });
      setIsRegisterOpen(false);
      reset();
      await fetchData();
    } catch (err: any) {
      setRegisterError(err?.message || "Error al registrar alumno.");
    } finally {
      setRegistering(false);
    }
  };

  // --- Assign Group ---
  const handleAssignGroup = async () => {
    if (!assignGroupStudent || !selectedGroupId) return;
    setIsAssigningGroup(true);
    try {
      await api.post(ENDPOINTS.ENROLLMENTS, {
        student_id: assignGroupStudent.student._id,
        group_id: selectedGroupId,
        school_year_id: yearId,
      });
      setAssignGroupStudent(null);
      setSelectedGroupId("");
      await fetchData();
    } catch {
      setError("Error al asignar grupo.");
    } finally {
      setIsAssigningGroup(false);
    }
  };

  // --- Assign Taller ---
  const handleAssignTaller = async () => {
    if (!assignTallerStudent) return;
    setIsAssigningTaller(true);
    try {
      await api.put(`${ENDPOINTS.STUDENTS}/${assignTallerStudent.student._id}`, {
        workshop_group_id: selectedTallerId || null,
      });
      setAssignTallerStudent(null);
      setSelectedTallerId("");
      await fetchData();
    } catch {
      setError("Error al asignar taller.");
    } finally {
      setIsAssigningTaller(false);
    }
  };

  // --- Delete Enrollment ---
  const handleDeleteEnrollment = async () => {
    if (!deleteTarget?.enrollment) return;
    try {
      await api.delete(`${ENDPOINTS.ENROLLMENTS}/${deleteTarget.enrollment._id}`);
      setDeleteTarget(null);
      await fetchData();
    } catch {
      setDeleteTarget(null);
    }
  };

  // --- Promote ---
  const handlePromote = async () => {
    if (promoteSelectedIds.size === 0 || !promoteTargetYear) return;
    setIsPromoting(true);
    try {
      const res = await api.post<{ succeeded: number; failed: number }>(
        `/api/students/promote-bulk`,
        {
          promotions: Array.from(promoteSelectedIds).map((studentId) => ({
            student_id: studentId,
            new_group_id: null,
          })),
          school_year_id: promoteTargetYear,
        }
      );
      setPromoteResult({ succeeded: res.succeeded || 0, failed: res.failed || 0 });
      setPromoteSelectedIds(new Set());
      await fetchData();
    } catch {
      setError("Error al promover alumnos.");
    } finally {
      setIsPromoting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando alumnado..." height="page" />;
  }

  if (error && !isRegisterOpen) {
    return (
      <ErrorState
        title="Error"
        message={error}
        action={{ label: "Reintentar", onClick: fetchData }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Alumnado</h1>
          <p className="text-sm text-text-secondary">
            {enriched.length} alumno{enriched.length !== 1 ? "s" : ""} registrado{enriched.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsRegisterOpen(true)}>
            <Plus size={16} className="mr-1" />
            Nuevo
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsPromoteOpen(true)}>
            <GraduationCap size={16} className="mr-1" />
            Promover
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {([
          { key: "all", label: "Todos" },
          { key: "no_group", label: "Sin grupo" },
          { key: "enrolled", label: "Inscritos" },
          { key: "withdrawn", label: "Bajas" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? "border-accent text-accent-dark"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {label}
            <span className="ml-1.5 text-xs text-text-muted">
              {tabCounts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <Input
        placeholder="Buscar por nombre o número de control..."
        icon={<Search size={18} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={48} />}
          title={
            searchQuery
              ? "Sin resultados"
              : activeTab === "no_group"
                ? "Todos los alumnos tienen grupo asignado"
                : "No hay alumnos registrados"
          }
          description={
            searchQuery
              ? "Intenta con otros términos."
              : activeTab === "no_group"
                ? "Todos los alumnos inscritos ya tienen un grupo."
                : "Registra un alumno para comenzar."
          }
          action={
            !searchQuery && activeTab === "all"
              ? { label: "Registrar Alumno", onClick: () => setIsRegisterOpen(true) }
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
                    <th className="text-left px-4 py-3 font-semibold text-text-primary">Nombre</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-primary">No. Control</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-primary">Grupo</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-primary">Taller</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-primary">Estado</th>
                    <th className="text-right px-4 py-3 font-semibold text-text-primary w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr
                      key={e.student._id}
                      className="border-b border-border last:border-b-0 hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-text-primary">
                          {e.student.first_name} {e.student.last_name || ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                        {e.student.controlNumber || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {e.group ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
                            {e.group.grade}°{e.group.section}
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const tid = typeof e.student.workshop_group_id === "string"
                            ? e.student.workshop_group_id
                            : (e.student.workshop_group_id as Group)?._id;
                          const taller = tid ? groups.find((g) => g._id === tid) : null;
                          return taller ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              {taller.grade}° {taller.section}
                            </span>
                          ) : (
                            <span className="text-xs text-text-muted">—</span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        {e.enrollment ? (
                          <Badge variant={(CYCLE_STATUS_COLORS[e.enrollment.cycle_status] as any) || "slate"}>
                            {CYCLE_STATUS_LABELS[e.enrollment.cycle_status] || e.enrollment.cycle_status}
                          </Badge>
                        ) : (
                          <Badge variant="slate">Sin grupo</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === e.student._id ? null : e.student._id)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-text-secondary transition-colors"
                        >
                          <ChevronDown size={16} />
                        </button>
                        {openMenuId === e.student._id && (
                          <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-white border border-border rounded-xl shadow-lg py-1">
                            {!e.enrollment && (
                              <button
                                onClick={() => {
                                  setAssignGroupStudent(e);
                                  setSelectedGroupId("");
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                              >
                                <FolderOpen size={14} className="text-text-muted" />
                                Asignar Grupo
                              </button>
                            )}
                            {e.enrollment && (
                              <button
                                onClick={() => {
                                  setAssignGroupStudent(e);
                                  setSelectedGroupId(
                                    typeof e.enrollment!.group_id === "object"
                                      ? (e.enrollment!.group_id as Group)._id
                                      : e.enrollment!.group_id || ""
                                  );
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                              >
                                <FolderOpen size={14} className="text-text-muted" />
                                Cambiar Grupo
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setAssignTallerStudent(e);
                                const tid = typeof e.student.workshop_group_id === "string"
                                  ? e.student.workshop_group_id
                                  : (e.student.workshop_group_id as Group)?._id || "";
                                setSelectedTallerId(tid);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Wrench size={14} className="text-text-muted" />
                              {e.student.workshop_group_id ? "Cambiar Taller" : "Asignar Taller"}
                            </button>
                            <button
                              onClick={() => {
                                router.push(`/students/${e.student._id}`);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Eye size={14} className="text-text-muted" />
                              Ver Expediente
                            </button>
                            {e.enrollment && (
                              <>
                                <div className="border-t border-border my-1" />
                                <button
                                  onClick={() => {
                                    setDeleteTarget(e);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-error flex items-center gap-2"
                                >
                                  <Trash2 size={14} />
                                  Eliminar Inscripción
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Modal: Registrar Alumno */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Registrar Alumno"
        size="lg"
      >
        <form onSubmit={handleSubmit(onRegister)} className="space-y-4">
          {registerError && (
            <div className="p-3 rounded-xl bg-error-light text-error text-sm">
              {registerError}
            </div>
          )}

          <Input
            label="CURP"
            placeholder="18 caracteres"
            error={errors.curp?.message}
            {...register("curp")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre(s)"
              error={errors.first_name?.message}
              {...register("first_name")}
            />
            <Input
              label="Apellido(s)"
              error={errors.last_name?.message}
              {...register("last_name")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Sexo"
              options={[
                { value: "", label: "No especificado" },
                { value: "male", label: "Masculino" },
                { value: "female", label: "Femenino" },
              ]}
              {...register("sex")}
            />
            <Input
              label="Teléfono"
              {...register("phone")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha de Nacimiento"
              type="date"
              {...register("date_of_birth")}
            />
            <Input
              label="Tipo de Sangre"
              placeholder="A+, O-, etc."
              {...register("blood_type")}
            />
          </div>

          <Input
            label="Dirección"
            {...register("address")}
          />

          <Input
            label="Notas Médicas"
            {...register("medical_notes")}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsRegisterOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="sky" isLoading={isRegistering}>
              Registrar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Asignar/Cambiar Grupo */}
      <Modal
        isOpen={!!assignGroupStudent}
        onClose={() => setAssignGroupStudent(null)}
        title={
          assignGroupStudent?.enrollment ? "Cambiar Grupo" : "Asignar Grupo"
        }
      >
        <div className="space-y-4">
          {assignGroupStudent && (
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">
                {assignGroupStudent.student.first_name}{" "}
                {assignGroupStudent.student.last_name}
              </span>
              {" — "}
              {assignGroupStudent.student.controlNumber}
            </p>
          )}
          <Select
            label="Grupo"
            placeholder="Seleccionar grupo"
            options={groups
              .filter((g) => g.type !== "taller")
              .sort((a, b) => a.grade * 100 + a.section.charCodeAt(0) - (b.grade * 100 + b.section.charCodeAt(0)))
              .map((g) => ({
                value: g._id,
                label: `${g.grade}° ${g.section} — ${g.shift === "matutino" ? "Matutino" : "Vespertino"}`,
              }))}
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setAssignGroupStudent(null)}>
              Cancelar
            </Button>
            <Button
              variant="sky"
              disabled={!selectedGroupId}
              isLoading={isAssigningGroup}
              onClick={handleAssignGroup}
            >
              Asignar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Asignar/Cambiar Taller */}
      <Modal
        isOpen={!!assignTallerStudent}
        onClose={() => setAssignTallerStudent(null)}
        title={
          assignTallerStudent?.student.workshop_group_id
            ? "Cambiar Taller"
            : "Asignar Taller"
        }
      >
        <div className="space-y-4">
          {assignTallerStudent && (
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">
                {assignTallerStudent.student.first_name}{" "}
                {assignTallerStudent.student.last_name}
              </span>
              {" — "}
              {assignTallerStudent.student.controlNumber}
            </p>
          )}
          <Select
            label="Taller"
            placeholder="Seleccionar taller"
            options={[
              { value: "", label: "Sin taller" },
              ...talleres
                .sort((a, b) => a.grade * 100 + a.section.charCodeAt(0) - (b.grade * 100 + b.section.charCodeAt(0)))
                .map((g) => ({
                  value: g._id,
                  label: `${g.grade}° ${g.section}`,
                })),
            ]}
            value={selectedTallerId}
            onChange={(e) => setSelectedTallerId(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setAssignTallerStudent(null)}>
              Cancelar
            </Button>
            <Button
              variant="sky"
              isLoading={isAssigningTaller}
              onClick={handleAssignTaller}
            >
              Asignar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Promover Ciclo */}
      <Modal
        isOpen={isPromoteOpen}
        onClose={() => { setIsPromoteOpen(false); setPromoteResult(null); }}
        title="Promover Ciclo"
        size="lg"
      >
        <div className="space-y-4">
          {promoteResult ? (
            <div className="text-center py-4">
              <GraduationCap size={48} className="mx-auto text-emerald-500 mb-3" />
              <h3 className="font-semibold text-text-primary text-lg">
                Promoción completada
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                {promoteResult.succeeded} promovido{promoteResult.succeeded !== 1 ? "s" : ""}
                {promoteResult.failed > 0 &&
                  ` · ${promoteResult.failed} fallido${promoteResult.failed !== 1 ? "s" : ""}`}
              </p>
              <Button
                variant="ghost"
                className="mt-4"
                onClick={() => { setIsPromoteOpen(false); setPromoteResult(null); }}
              >
                Cerrar
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-secondary">
                Selecciona los alumnos a promover al siguiente ciclo escolar.
              </p>
              <div className="max-h-64 overflow-y-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-slate-50">
                      <th className="px-3 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={promoteSelectedIds.size === enriched.length && enriched.length > 0}
                          onChange={() => {
                            if (promoteSelectedIds.size === enriched.length) {
                              setPromoteSelectedIds(new Set());
                            } else {
                              setPromoteSelectedIds(new Set(enriched.map((e) => e.student._id)));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                      </th>
                      <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                      <th className="px-3 py-2 text-left font-semibold">Control</th>
                      <th className="px-3 py-2 text-left font-semibold">Grupo Actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enriched.filter((e) => e.enrollment?.cycle_status === "enrolled").map((e) => (
                      <tr key={e.student._id} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={promoteSelectedIds.has(e.student._id)}
                            onChange={() => {
                              setPromoteSelectedIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(e.student._id)) next.delete(e.student._id);
                                else next.add(e.student._id);
                                return next;
                              });
                            }}
                            className="w-4 h-4 rounded border-slate-300"
                          />
                        </td>
                        <td className="px-3 py-2 font-medium">{e.student.first_name} {e.student.last_name}</td>
                        <td className="px-3 py-2 text-text-secondary font-mono text-xs">{e.student.controlNumber}</td>
                        <td className="px-3 py-2">{e.group ? `${e.group.grade}°${e.group.section}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setIsPromoteOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="sky"
                  disabled={promoteSelectedIds.size === 0}
                  isLoading={isPromoting}
                  onClick={handlePromote}
                >
                  Promover ({promoteSelectedIds.size})
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Confirm: Eliminar Inscripción */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteEnrollment}
        title="Eliminar Inscripción"
        message={
          deleteTarget
            ? `¿Eliminar la inscripción de ${deleteTarget.student.first_name} ${deleteTarget.student.last_name} del grupo ${deleteTarget.group?.grade}°${deleteTarget.group?.section}? El alumno permanecerá en el sistema.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />

      {/* Click outside to close menu */}
      {openMenuId && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpenMenuId(null)}
        />
      )}
    </div>
  );
}
