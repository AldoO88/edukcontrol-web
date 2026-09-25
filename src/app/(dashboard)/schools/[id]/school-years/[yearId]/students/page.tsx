// Página Unificada de Alumnado — Centrada en inscripciones del ciclo.
// Reinscripción, registro nuevo, asignación de grupo/taller, promoción.

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
import type { Student, Enrollment, Group, SchoolYear } from "@/lib/types";
import {
  GraduationCap,
  Search,
  Plus,
  ChevronDown,
  UserPlus,
  UserCheck,
  Wrench,
  Eye,
  Trash2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
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

interface EnrichedEnrollment {
  enrollment: Enrollment;
  student: Student;
  group: Group | null;
  taller: Group | null;
}

// --- Constants ---
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

// ===================================================================
// COMPONENTE PRINCIPAL
// ===================================================================
export default function StudentsPage() {
  const router = useRouter();
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;

  // --- State ---
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Register modal
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Re-inscription wizard
  const [reinscStep, setReinscStep] = useState<0 | 1 | 2>(0);
  const [reinscPrevGroups, setReinscPrevGroups] = useState<Group[]>([]);
  const [reinscPrevGroupId, setReinscPrevGroupId] = useState("");
  const [reinscPrevEnrollments, setReinscPrevEnrollments] = useState<EnrichedEnrollment[]>([]);
  const [reinscSelected, setReinscSelected] = useState<Set<string>>(new Set());
  const [reinscLoading, setReinscLoading] = useState(false);
  const [isReinscOpen, setIsReinscOpen] = useState(false);

  // Assign group modal
  const [assignGroupTarget, setAssignGroupTarget] = useState<EnrichedEnrollment | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [isAssigningGroup, setIsAssigningGroup] = useState(false);

  // Assign taller modal
  const [assignTallerTarget, setAssignTallerTarget] = useState<EnrichedEnrollment | null>(null);
  const [selectedTallerId, setSelectedTallerId] = useState("");
  const [isAssigningTaller, setIsAssigningTaller] = useState(false);

  // Bulk assign groups
  const [isBulkGroupOpen, setIsBulkGroupOpen] = useState(false);
  const [bulkGroupSelected, setBulkGroupSelected] = useState<Set<string>>(new Set());
  const [bulkGroupId, setBulkGroupId] = useState("");
  const [isBulkGrouping, setIsBulkGrouping] = useState(false);

  // Promote modal
  const [isPromoteOpen, setIsPromoteOpen] = useState(false);
  const [promoteSelected, setPromoteSelected] = useState<Set<string>>(new Set());
  const [promoteTargetYear, setPromoteTargetYear] = useState("");
  const [isPromoting, setIsPromoting] = useState(false);
  const [promoteResult, setPromoteResult] = useState<{ succeeded: number; failed: number } | null>(null);

  // Delete enrollment
  const [deleteTarget, setDeleteTarget] = useState<EnrichedEnrollment | null>(null);

  // Register form
  const { register, handleSubmit, reset, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // --- Fetch ---
  const fetchData = useCallback(async () => {
    try {
      const [enrollmentsRes, groupsRes] = await Promise.all([
        api.get<Enrollment[]>(`${ENDPOINTS.ENROLLMENTS}?school_year_id=${yearId}`),
        api.get<Group[]>(`${ENDPOINTS.GROUPS}?school_year_id=${yearId}`),
      ]);
      setEnrollments(Array.isArray(enrollmentsRes) ? enrollmentsRes : []);
      setAllGroups(Array.isArray(groupsRes) ? groupsRes : []);
    } catch {
      setError("Error al cargar datos.");
    } finally {
      setIsLoading(false);
    }
  }, [yearId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Build enriched data ---
  const enriched = useMemo<EnrichedEnrollment[]>(() => {
    return enrollments.map((e) => {
      const student = (typeof e.student_id === "object" ? e.student_id : null) as unknown as Student | null;
      const group = (typeof e.group_id === "object" ? e.group_id : null) as unknown as Group | null;
      const tallerId = student && typeof student.workshop_group_id === "object"
        ? (student.workshop_group_id as unknown as Group)._id
        : typeof student?.workshop_group_id === "string"
          ? student.workshop_group_id
          : null;
      const taller = tallerId ? allGroups.find((g) => g._id === tallerId) || null : null;
      return {
        enrollment: e,
        student: student!,
        group,
        taller,
      };
    }).filter((e) => e.student);
  }, [enrollments, allGroups]);

  // --- Filter ---
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return enriched.filter((e) => {
      if (activeTab === "no_group" && e.enrollment.group_id) return false;
      if (activeTab === "enrolled" && e.enrollment.cycle_status !== "enrolled") return false;
      if (activeTab === "withdrawn" && e.enrollment.cycle_status !== "withdrawn") return false;
      if (!q) return true;
      return (
        e.student.first_name?.toLowerCase().includes(q) ||
        e.student.last_name?.toLowerCase().includes(q) ||
        e.student.controlNumber?.toLowerCase().includes(q)
      );
    });
  }, [enriched, activeTab, searchQuery]);

  const tabCounts = useMemo(() => ({
    all: enriched.length,
    no_group: enriched.filter((e) => !e.enrollment.group_id).length,
    enrolled: enriched.filter((e) => e.enrollment.cycle_status === "enrolled" && e.enrollment.group_id).length,
    withdrawn: enriched.filter((e) => e.enrollment.cycle_status === "withdrawn").length,
  }), [enriched]);

  const noGroupStudents = useMemo(
    () => enriched.filter((e) => !e.enrollment.group_id),
    [enriched]
  );

  const currentGroups = useMemo(
    () => allGroups.filter((g) => g.type !== "taller").sort((a, b) => a.grade - b.grade || a.section.localeCompare(b.section)),
    [allGroups]
  );

  const currentTalleres = useMemo(
    () => allGroups.filter((g) => g.type === "taller").sort((a, b) => a.grade - b.grade || a.section.localeCompare(b.section)),
    [allGroups]
  );

  // ===================================================================
  // HANDLERS
  // ===================================================================

  // --- Register new student ---
  const onRegister = async (data: RegisterFormData) => {
    setIsRegistering(true);
    setRegisterError(null);
    try {
      const student = await api.post<Student>(`${ENDPOINTS.STUDENTS}/register`, {
        ...data,
        school: schoolId,
      });
      await api.post(ENDPOINTS.ENROLLMENTS, {
        student_id: (student as any)._id || student,
        school_year_id: yearId,
        group_id: null,
        cycle_status: "enrolled",
      });
      setIsRegisterOpen(false);
      reset();
      await fetchData();
    } catch (err: any) {
      setRegisterError(err?.message || "Error al registrar alumno.");
    } finally {
      setIsRegistering(false);
    }
  };

  // --- Assign group (individual) ---
  const handleAssignGroup = async () => {
    if (!assignGroupTarget || !selectedGroupId) return;
    setIsAssigningGroup(true);
    try {
      await api.put(`${ENDPOINTS.ENROLLMENTS}/${assignGroupTarget.enrollment._id}`, {
        group_id: selectedGroupId,
      });
      setAssignGroupTarget(null);
      setSelectedGroupId("");
      await fetchData();
    } catch {
      setError("Error al asignar grupo.");
    } finally {
      setIsAssigningGroup(false);
    }
  };

  // --- Assign taller ---
  const handleAssignTaller = async () => {
    if (!assignTallerTarget) return;
    setIsAssigningTaller(true);
    try {
      await api.put(`${ENDPOINTS.STUDENTS}/${assignTallerTarget.student._id}`, {
        workshop_group_id: selectedTallerId || null,
      });
      setAssignTallerTarget(null);
      setSelectedTallerId("");
      await fetchData();
    } catch {
      setError("Error al asignar taller.");
    } finally {
      setIsAssigningTaller(false);
    }
  };

  // --- Delete enrollment ---
  const handleDeleteEnrollment = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`${ENDPOINTS.ENROLLMENTS}/${deleteTarget.enrollment._id}`);
      setDeleteTarget(null);
      await fetchData();
    } catch {
      setDeleteTarget(null);
    }
  };

  // --- Bulk assign groups ---
  const handleBulkGroup = async () => {
    if (bulkGroupSelected.size === 0 || !bulkGroupId) return;
    setIsBulkGrouping(true);
    try {
      await Promise.all(
        Array.from(bulkGroupSelected).map((enrollmentId) =>
          api.put(`${ENDPOINTS.ENROLLMENTS}/${enrollmentId}`, { group_id: bulkGroupId })
        )
      );
      setBulkGroupSelected(new Set());
      setBulkGroupId("");
      setIsBulkGroupOpen(false);
      await fetchData();
    } catch {
      setError("Error al asignar grupos.");
    } finally {
      setIsBulkGrouping(false);
    }
  };

  // --- Promote ---
  const handlePromote = async () => {
    if (promoteSelected.size === 0 || !promoteTargetYear) return;
    setIsPromoting(true);
    try {
      const res = await api.post<{ succeeded: number; failed: number }>(
        `/api/students/promote-bulk`,
        {
          promotions: Array.from(promoteSelected).map((studentId) => ({
            student_id: studentId,
            new_group_id: null,
          })),
          school_year_id: promoteTargetYear,
        }
      );
      setPromoteResult({ succeeded: res.succeeded || 0, failed: res.failed || 0 });
      setPromoteSelected(new Set());
      await fetchData();
    } catch {
      setError("Error al promover alumnos.");
    } finally {
      setIsPromoting(false);
    }
  };

  // ===================================================================
  // RE-INSSCRIPTION WIZARD
  // ===================================================================

  const openReinscWizard = async () => {
    setIsReinscOpen(true);
    setReinscStep(1);
    setReinscPrevGroupId("");
    setReinscPrevEnrollments([]);
    setReinscSelected(new Set());
    try {
      const prevYear = await api.get<{ items: SchoolYear[] }>(
        `${ENDPOINTS.SCHOOL_YEARS}?school=${schoolId}`
      );
      const years = prevYear.items || prevYear;
      const currentYear = years.find((y: any) => y._id === yearId);
      const prevYearData = years
        .filter((y: any) => y._id !== yearId && y.endDate < (currentYear?.startDate || ""))
        .sort((a: any, b: any) => b.startDate.localeCompare(a.startDate))[0];
      if (!prevYearData) {
        setError("No hay ciclo anterior disponible para reinscribir.");
        setIsReinscOpen(false);
        return;
      }
      const groups = await api.get<Group[]>(
        `${ENDPOINTS.GROUPS}?school_year_id=${prevYearData._id}`
      );
      setReinscPrevGroups((groups || []).filter((g) => g.type !== "taller"));
    } catch {
      setError("Error al cargar ciclos anteriores.");
      setIsReinscOpen(false);
    }
  };

  const loadPrevGroupStudents = async (prevGroupId: string) => {
    setReinscPrevGroupId(prevGroupId);
    setReinscLoading(true);
    try {
      const enrollments = await api.get<Enrollment[]>(
        `${ENDPOINTS.ENROLLMENTS}?group_id=${prevGroupId}&cycle_status=enrolled`
      );
      const list = Array.isArray(enrollments) ? enrollments : [];
      const enrichedList: EnrichedEnrollment[] = list.map((e) => {
        const student = (typeof e.student_id === "object" ? e.student_id : null) as unknown as Student | null;
        const group = (typeof e.group_id === "object" ? e.group_id : null) as unknown as Group | null;
        return { enrollment: e, student: student!, group, taller: null };
      }).filter((e) => e.student);
      setReinscPrevEnrollments(enrichedList);

      const existing = await api.get<Enrollment[]>(
        `${ENDPOINTS.ENROLLMENTS}?school_year_id=${yearId}`
      );
      const existingStudentIds = new Set(
        (Array.isArray(existing) ? existing : []).map((e) => {
          const sid = typeof e.student_id === "string" ? e.student_id : (e.student_id as any)?._id;
          return sid;
        })
      );
      const eligible = enrichedList
        .filter((e) => !existingStudentIds.has(e.student._id))
        .map((e) => e.enrollment._id!);
      setReinscSelected(new Set(eligible));
      setReinscStep(2);
    } catch {
      setError("Error al cargar alumnos del grupo.");
    } finally {
      setReinscLoading(false);
    }
  };

  const handleReinscribir = async () => {
    if (reinscSelected.size === 0 || !reinscPrevGroupId) return;
    setReinscLoading(true);
    try {
      const prevGroup = reinscPrevGroups.find((g) => g._id === reinscPrevGroupId);
      if (!prevGroup) return;
      const targetGroup = currentGroups.find(
        (g) => g.grade === prevGroup.grade + 1 && g.section === prevGroup.section && g.shift === prevGroup.shift
      );
      if (!targetGroup) {
        setError(`No se encontró grupo destino ${prevGroup.grade + 1}°${prevGroup.section} en el ciclo actual.`);
        setReinscLoading(false);
        return;
      }
      const eligible = reinscPrevEnrollments.filter(
        (e) => reinscSelected.has(e.enrollment._id!)
      );
      await Promise.all(
        eligible.map((e) =>
          api.post(ENDPOINTS.ENROLLMENTS, {
            student_id: e.student._id,
            group_id: targetGroup._id,
            school_year_id: yearId,
            cycle_status: "enrolled",
          })
        )
      );
      setIsReinscOpen(false);
      setReinscStep(0);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || "Error al reinscribir alumnos.");
    } finally {
      setReinscLoading(false);
    }
  };

  // ===================================================================
  // RENDER
  // ===================================================================

  if (isLoading) return <LoadingState message="Cargando alumnado..." height="page" />;
  if (error && !isRegisterOpen && !isReinscOpen) {
    return <ErrorState title="Error" message={error} action={{ label: "Reintentar", onClick: fetchData }} />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Alumnado</h1>
          <p className="text-sm text-text-secondary">
            {enriched.length} alumno{enriched.length !== 1 ? "s" : ""} inscrito{enriched.length !== 1 ? "s" : ""} en este ciclo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={openReinscWizard}>
            <UserCheck size={16} className="mr-1" />
            Reinscribir
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsRegisterOpen(true)}>
            <Plus size={16} className="mr-1" />
            Nuevo
          </Button>
          {noGroupStudents.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setIsBulkGroupOpen(true)}>
              <ArrowRight size={16} className="mr-1" />
              Asignar Grupos ({noGroupStudents.length})
            </Button>
          )}
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
            <span className="ml-1.5 text-xs text-text-muted">{tabCounts[key]}</span>
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
            searchQuery ? "Sin resultados"
            : activeTab === "no_group" ? "Todos los alumnos tienen grupo"
            : "No hay alumnos inscritos"
          }
          description={
            searchQuery ? "Intenta con otros términos."
            : activeTab === "no_group" ? "No hay alumnos pendientes de asignar grupo."
            : "Registra un alumno o reinscribe uno del ciclo anterior."
          }
          action={
            !searchQuery
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
                      key={e.enrollment._id}
                      className="border-b border-border last:border-b-0 hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => router.push(`/schools/${schoolId}/school-years/${yearId}/students/${e.student._id}`)}
                          className="font-medium text-accent-dark hover:underline text-left"
                        >
                          {e.student.first_name} {e.student.last_name || ""}
                        </button>
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
                          <span className="text-xs text-text-muted font-medium">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {e.taller ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            {e.taller.grade}° {e.taller.section}
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={(CYCLE_STATUS_COLORS[e.enrollment.cycle_status] as any) || "slate"}>
                          {CYCLE_STATUS_LABELS[e.enrollment.cycle_status] || e.enrollment.cycle_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === e.enrollment._id ? null : e.enrollment._id)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-text-secondary transition-colors"
                        >
                          <ChevronDown size={16} />
                        </button>
                        {openMenuId === e.enrollment._id && (
                          <div className="absolute right-0 top-full mt-1 z-20 w-52 bg-white border border-border rounded-xl shadow-lg py-1">
                            {!e.enrollment.group_id ? (
                              <button
                                onClick={() => { setAssignGroupTarget(e); setSelectedGroupId(""); setOpenMenuId(null); }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                              >
                                <ArrowRight size={14} className="text-text-muted" />
                                Asignar Grupo
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setAssignGroupTarget(e);
                                  setSelectedGroupId(e.group?._id || "");
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                              >
                                <ArrowRight size={14} className="text-text-muted" />
                                Cambiar Grupo
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setAssignTallerTarget(e);
                                setSelectedTallerId(
                                  typeof e.student.workshop_group_id === "object"
                                    ? (e.student.workshop_group_id as any)?._id || ""
                                    : e.student.workshop_group_id || ""
                                );
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Wrench size={14} className="text-text-muted" />
                              {e.student.workshop_group_id ? "Cambiar Taller" : "Asignar Taller"}
                            </button>
                            <button
                              onClick={() => {
                                router.push(`/schools/${schoolId}/school-years/${yearId}/students/${e.student._id}`);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Eye size={14} className="text-text-muted" />
                              Ver Expediente
                            </button>
                            <div className="border-t border-border my-1" />
                            <button
                              onClick={() => { setDeleteTarget(e); setOpenMenuId(null); }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-error flex items-center gap-2"
                            >
                              <Trash2 size={14} />
                              Eliminar Inscripción
                            </button>
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

      {/* ===================================================================
          MODALS
          =================================================================== */}

      {/* Modal: Registrar Alumno */}
      <Modal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} title="Registrar Alumno" size="lg">
        <form onSubmit={handleSubmit(onRegister)} className="space-y-4">
          {registerError && (
            <div className="p-3 rounded-xl bg-error-light text-error text-sm">{registerError}</div>
          )}
          <Input label="CURP" placeholder="18 caracteres" error={errors.curp?.message} {...register("curp")} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre(s)" error={errors.first_name?.message} {...register("first_name")} />
            <Input label="Apellido(s)" error={errors.last_name?.message} {...register("last_name")} />
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
            <Input label="Teléfono" {...register("phone")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha de Nacimiento" type="date" {...register("date_of_birth")} />
            <Input label="Tipo de Sangre" placeholder="A+, O-, etc." {...register("blood_type")} />
          </div>
          <Input label="Dirección" {...register("address")} />
          <Input label="Notas Médicas" {...register("medical_notes")} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsRegisterOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="sky" isLoading={isRegistering}>Registrar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Reinscripción Wizard */}
      <Modal
        isOpen={isReinscOpen}
        onClose={() => { setIsReinscOpen(false); setReinscStep(0); }}
        title="Reinscribir Alumnos"
        size="lg"
      >
        {/* Step 1: Select previous group */}
        {reinscStep === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Selecciona el grupo del ciclo anterior del cual quieres reinscribir alumnos.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {reinscPrevGroups.length === 0 ? (
                <p className="col-span-2 text-sm text-text-muted">No hay grupos en el ciclo anterior.</p>
              ) : (
                reinscPrevGroups
                  .sort((a, b) => a.grade - b.grade || a.section.localeCompare(b.section))
                  .map((g) => (
                    <button
                      key={g._id}
                      onClick={() => loadPrevGroupStudents(g._id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        reinscPrevGroupId === g._id
                          ? "border-accent bg-accent/5"
                          : "border-border hover:border-accent/30"
                      }`}
                    >
                      <span className="font-medium text-text-primary">{g.grade}°{g.section}</span>
                      <span className="text-xs text-text-muted ml-2">
                        {g.shift === "matutino" ? "Matutino" : "Vespertino"}
                      </span>
                    </button>
                  ))
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => { setIsReinscOpen(false); setReinscStep(0); }}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* Step 2: Select students */}
        {reinscStep === 2 && (
          <div className="space-y-4">
            {(() => {
              const prevGroup = reinscPrevGroups.find((g) => g._id === reinscPrevGroupId);
              const targetGroup = prevGroup
                ? currentGroups.find(
                    (g) => g.grade === prevGroup.grade + 1 && g.section === prevGroup.section && g.shift === prevGroup.shift
                  )
                : null;
              return (
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-1 rounded bg-slate-100 font-medium">
                    {prevGroup?.grade}°{prevGroup?.section}
                  </span>
                  <ArrowRight size={16} className="text-text-muted" />
                  <span className="px-2 py-1 rounded bg-sky-100 font-medium text-sky-700">
                    {targetGroup ? `${targetGroup.grade}°${targetGroup.section}` : "Sin grupo destino"}
                  </span>
                  {!targetGroup && (
                    <span className="text-xs text-error ml-2">
                      No existe este grupo en el ciclo actual
                    </span>
                  )}
                </div>
              );
            })()}

            {reinscLoading ? (
              <LoadingState message="Cargando alumnos..." height="compact" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    {reinscSelected.size} de {reinscPrevEnrollments.length} seleccionados
                  </span>
                  <button
                    onClick={() => {
                      if (reinscSelected.size === reinscPrevEnrollments.length) {
                        setReinscSelected(new Set());
                      } else {
                        setReinscSelected(new Set(reinscPrevEnrollments.map((e) => e.enrollment._id!)));
                      }
                    }}
                    className="text-xs text-accent-dark hover:underline"
                  >
                    {reinscSelected.size === reinscPrevEnrollments.length ? "Deseleccionar todos" : "Seleccionar todos"}
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto border border-border rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-slate-50">
                        <th className="px-3 py-2 text-left w-10"></th>
                        <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                        <th className="px-3 py-2 text-left font-semibold">Control</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reinscPrevEnrollments.map((e) => (
                        <tr key={e.enrollment._id} className="border-b border-border last:border-b-0">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={reinscSelected.has(e.enrollment._id!)}
                              onChange={() => {
                                setReinscSelected((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(e.enrollment._id!)) next.delete(e.enrollment._id!);
                                  else next.add(e.enrollment._id!);
                                  return next;
                                });
                              }}
                              className="w-4 h-4 rounded border-slate-300"
                            />
                          </td>
                          <td className="px-3 py-2 font-medium">{e.student.first_name} {e.student.last_name}</td>
                          <td className="px-3 py-2 text-text-secondary font-mono text-xs">{e.student.controlNumber}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setReinscStep(1)}>
                <ArrowLeft size={16} className="mr-1" /> Atrás
              </Button>
              <Button
                variant="sky"
                disabled={reinscSelected.size === 0}
                isLoading={reinscLoading}
                onClick={handleReinscribir}
              >
                <CheckCircle2 size={16} className="mr-1" />
                Reinscribir ({reinscSelected.size})
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Asignar/Cambiar Grupo */}
      <Modal
        isOpen={!!assignGroupTarget}
        onClose={() => setAssignGroupTarget(null)}
        title={assignGroupTarget?.enrollment.group_id ? "Cambiar Grupo" : "Asignar Grupo"}
      >
        <div className="space-y-4">
          {assignGroupTarget && (
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">
                {assignGroupTarget.student.first_name} {assignGroupTarget.student.last_name}
              </span>
              {" — "}
              {assignGroupTarget.student.controlNumber}
            </p>
          )}
          <Select
            label="Grupo"
            placeholder="Seleccionar grupo"
            options={currentGroups.map((g) => ({
              value: g._id,
              label: `${g.grade}° ${g.section} — ${g.shift === "matutino" ? "Matutino" : "Vespertino"}`,
            }))}
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setAssignGroupTarget(null)}>Cancelar</Button>
            <Button variant="sky" disabled={!selectedGroupId} isLoading={isAssigningGroup} onClick={handleAssignGroup}>
              Asignar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Asignar/Cambiar Taller */}
      <Modal
        isOpen={!!assignTallerTarget}
        onClose={() => setAssignTallerTarget(null)}
        title={assignTallerTarget?.student.workshop_group_id ? "Cambiar Taller" : "Asignar Taller"}
      >
        <div className="space-y-4">
          {assignTallerTarget && (
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">
                {assignTallerTarget.student.first_name} {assignTallerTarget.student.last_name}
              </span>
              {" — "}
              {assignTallerTarget.student.controlNumber}
            </p>
          )}
          <Select
            label="Taller"
            placeholder="Seleccionar taller"
            options={[
              { value: "", label: "Sin taller" },
              ...currentTalleres.map((g) => ({
                value: g._id,
                label: `${g.grade}° ${g.section}`,
              })),
            ]}
            value={selectedTallerId}
            onChange={(e) => setSelectedTallerId(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setAssignTallerTarget(null)}>Cancelar</Button>
            <Button variant="sky" isLoading={isAssigningTaller} onClick={handleAssignTaller}>
              Asignar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Asignar Grupos (Bulk) */}
      <Modal
        isOpen={isBulkGroupOpen}
        onClose={() => { setIsBulkGroupOpen(false); setBulkGroupSelected(new Set()); setBulkGroupId(""); }}
        title="Asignar Grupos"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            {noGroupStudents.length} alumno{noGroupStudents.length !== 1 ? "s" : ""} sin grupo asignado.
          </p>
          <Select
            label="Grupo destino"
            placeholder="Seleccionar grupo"
            options={currentGroups.map((g) => ({
              value: g._id,
              label: `${g.grade}° ${g.section} — ${g.shift === "matutino" ? "Matutino" : "Vespertino"}`,
            }))}
            value={bulkGroupId}
            onChange={(e) => setBulkGroupId(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">
              {bulkGroupSelected.size} de {noGroupStudents.length} seleccionados
            </span>
            <button
              onClick={() => {
                if (bulkGroupSelected.size === noGroupStudents.length) {
                  setBulkGroupSelected(new Set());
                } else {
                  setBulkGroupSelected(new Set(noGroupStudents.map((e) => e.enrollment._id!)));
                }
              }}
              className="text-xs text-accent-dark hover:underline"
            >
              {bulkGroupSelected.size === noGroupStudents.length ? "Deseleccionar" : "Seleccionar todos"}
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto border border-border rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50">
                  <th className="px-3 py-2 text-left w-10"></th>
                  <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                  <th className="px-3 py-2 text-left font-semibold">Control</th>
                </tr>
              </thead>
              <tbody>
                {noGroupStudents.map((e) => (
                  <tr key={e.enrollment._id} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={bulkGroupSelected.has(e.enrollment._id!)}
                        onChange={() => {
                          setBulkGroupSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(e.enrollment._id!)) next.delete(e.enrollment._id!);
                            else next.add(e.enrollment._id!);
                            return next;
                          });
                        }}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">{e.student.first_name} {e.student.last_name}</td>
                    <td className="px-3 py-2 text-text-secondary font-mono text-xs">{e.student.controlNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => { setIsBulkGroupOpen(false); setBulkGroupSelected(new Set()); setBulkGroupId(""); }}>
              Cancelar
            </Button>
            <Button
              variant="sky"
              disabled={bulkGroupSelected.size === 0 || !bulkGroupId}
              isLoading={isBulkGrouping}
              onClick={handleBulkGroup}
            >
              Asignar ({bulkGroupSelected.size})
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
              <h3 className="font-semibold text-text-primary text-lg">Promoción completada</h3>
              <p className="text-sm text-text-secondary mt-1">
                {promoteResult.succeeded} promovido{promoteResult.succeeded !== 1 ? "s" : ""}
                {promoteResult.failed > 0 && ` · ${promoteResult.failed} fallido${promoteResult.failed !== 1 ? "s" : ""}`}
              </p>
              <Button variant="ghost" className="mt-4" onClick={() => { setIsPromoteOpen(false); setPromoteResult(null); }}>
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
                          checked={promoteSelected.size === enriched.filter((e) => e.enrollment.cycle_status === "enrolled").length && enriched.length > 0}
                          onChange={() => {
                            const enrolled = enriched.filter((e) => e.enrollment.cycle_status === "enrolled");
                            if (promoteSelected.size === enrolled.length) setPromoteSelected(new Set());
                            else setPromoteSelected(new Set(enrolled.map((e) => e.student._id)));
                          }}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                      </th>
                      <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                      <th className="px-3 py-2 text-left font-semibold">Control</th>
                      <th className="px-3 py-2 text-left font-semibold">Grupo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enriched.filter((e) => e.enrollment.cycle_status === "enrolled").map((e) => (
                      <tr key={e.student._id} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={promoteSelected.has(e.student._id)}
                            onChange={() => {
                              setPromoteSelected((prev) => {
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
                <Button variant="ghost" onClick={() => setIsPromoteOpen(false)}>Cancelar</Button>
                <Button
                  variant="sky"
                  disabled={promoteSelected.size === 0}
                  isLoading={isPromoting}
                  onClick={handlePromote}
                >
                  Promover ({promoteSelected.size})
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
            ? `¿Eliminar la inscripción de ${deleteTarget.student.first_name} ${deleteTarget.student.last_name} del ciclo? El alumno permanecerá en el sistema.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />

      {/* Click outside to close menu */}
      {openMenuId && <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />}
    </div>
  );
}
