// Página Unificada de Alumnado — Centrada en inscripciones del ciclo.
// Reinscripción, registro nuevo, asignación de grupo/taller, promoción.

"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
import type { Student, Enrollment, Group, SchoolYear, Guardian } from "@/lib/types";
import {
  GraduationCap,
  Search,
  Plus,
  Upload,
  ChevronDown,
  UserPlus,
  UserCheck,
  User,
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
  grade: z.coerce.number().min(1).max(3),
  sex: z.enum(["male", "female", ""]).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  date_of_birth: z.string().optional(),
  blood_type: z.string().optional(),
  medical_notes: z.string().optional(),
  guardian_name: z.string().optional(),
  guardian_lastname: z.string().optional(),
  guardian_phone: z.string().optional(),
  guardian_relationship: z.string().optional(),
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
  enrolled: "Activo",
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
  const [filterGroupId, setFilterGroupId] = useState("");
  const [filterTallerId, setFilterTallerId] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Register modal
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  // Avisos no fatales al registrar (p.ej. "Teléfono ya registrado").
  const [registerWarn, setRegisterWarn] = useState<string | null>(null);

  // Re-inscription wizard
  const [reinscStep, setReinscStep] = useState<0 | 1 | 2>(0);
  const [reinscPrevGroups, setReinscPrevGroups] = useState<Group[]>([]);
  const [reinscPrevGroupId, setReinscPrevGroupId] = useState("");
  const [reinscPrevEnrollments, setReinscPrevEnrollments] = useState<EnrichedEnrollment[]>([]);
  const [reinscSelected, setReinscSelected] = useState<Set<string>>(new Set());
  const [reinscLoading, setReinscLoading] = useState(false);
  const [isReinscOpen, setIsReinscOpen] = useState(false);
  const [reinscEligibleCounts, setReinscEligibleCounts] = useState<Record<string, number>>({});
  const [reinscTargetGrade, setReinscTargetGrade] = useState<"next" | "same">("next");

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

  // Graduate modal
  const [isGraduateOpen, setIsGraduateOpen] = useState(false);
  const [graduateSelected, setGraduateSelected] = useState<Set<string>>(new Set());
  const [isGraduating, setIsGraduating] = useState(false);
  const [graduateResult, setGraduateResult] = useState<{ succeeded: number; failed: number } | null>(null);

  // Import modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    total: number;
    succeeded: number;
    failed: number;
    warnings?: number;
    results: Array<{
      index: number;
      status: string;
      curp?: string;
      errors?: string[];
      guardian_reused?: boolean;
      guardian?: string;
      // El backend marca `guardian_missing=true` en las filas OK que
      // quedaron sin tutor y no dispararon un `warning` específico
      // (fila sin datos de tutor o con nombre pero sin celular).
      // La web las agrupa en la lista "Alumnos sin tutor".
      guardian_missing?: boolean;
      student_name?: string;
      guardian_missing_reason?: "missing_phone" | "no_data";
    }>;
  } | null>(null);

  // Register form
  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // --- Tutor (guardian) selection ---
  // `selectedGuardian` es la fuente de verdad de "el admin ya eligió
  // un tutor existente y NO debe mandar datos del tutor en el submit".
  // La modal "Buscar tutor existente" y la auto-detección en blur del
  // teléfono lo setean; el botón "Cambiar tutor" lo limpia. Los 4
  // inputs del tutor se renderizan con `disabled` cuando está set.
  const [selectedGuardian, setSelectedGuardian] = useState<Guardian | null>(null);
  const [isGuardianPickerOpen, setIsGuardianPickerOpen] = useState(false);
  const [guardianSearch, setGuardianSearch] = useState("");
  const [guardianResults, setGuardianResults] = useState<Guardian[]>([]);
  const [isGuardianSearching, setIsGuardianSearching] = useState(false);
  // Sugerencia de auto-detección en blur del teléfono. "idle" = no
  // se ha tecleado aún; "loading" = consulta en curso; "found" =
  // existe un tutor con ese número y aún no se ha decidido;
  // "empty" = no existe (se crearía uno nuevo al enviar).
  const [guardianLookup, setGuardianLookup] = useState<{ status: "idle" | "loading" | "found" | "empty"; guardian?: Guardian }>({ status: "idle" });
  // Flag mutable: "el admin ya tomó una decisión sobre el tutor" —
  // suprime futuras auto-detección en blur y descarta sugerencias
  // pendientes. No usamos useState porque no queremos re-render por
  // este cambio (sólo es leído dentro de handlers).
  const guardianChosen = useRef<"none" | "picker" | "blur" | "manual">("none");

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
      const tallerId = student && typeof student.workshop_group_id === "object" && student.workshop_group_id !== null
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
      if (activeTab === "no_group" && (e.enrollment.group_id || e.student.workshop_group_id)) return false;
      if (activeTab === "enrolled" && e.enrollment.cycle_status !== "enrolled") return false;
      if (activeTab === "withdrawn" && e.enrollment.cycle_status !== "withdrawn") return false;
      if (filterGroupId && (!e.group || e.group._id !== filterGroupId)) return false;
      if (filterTallerId && (!e.taller || e.taller._id !== filterTallerId)) return false;
      if (!q) return true;
      return (
        e.student.first_name?.toLowerCase().includes(q) ||
        e.student.last_name?.toLowerCase().includes(q) ||
        e.student.controlNumber?.toLowerCase().includes(q)
      );
    });
  }, [enriched, activeTab, searchQuery, filterGroupId, filterTallerId]);

  const tabCounts = useMemo(() => ({
    all: enriched.length,
    no_group: enriched.filter((e) => !e.enrollment.group_id && !e.student.workshop_group_id).length,
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

  // --- Limpia la selección del tutor (modal / blur) y deja los inputs
  //     listos para captura manual. Llamado desde el botón "Cambiar
  //     tutor" o al abrir el form de nuevo.
  const clearGuardianSelection = useCallback(() => {
    setSelectedGuardian(null);
    setGuardianLookup({ status: "idle" });
    setValue("guardian_name", "");
    setValue("guardian_lastname", "");
    setValue("guardian_phone", "");
    setValue("guardian_relationship", "");
    guardianChosen.current = "manual";
  }, [setValue]);

  // --- Setea `selectedGuardian` desde la modal o desde la sugerencia
  //     del blur. Pre-rellena los inputs del form (para que se vean
  //     con los datos del tutor) y los deja deshabilitados porque ya
  //     no se editan — la identidad del tutor viene del backend.
  const selectGuardian = useCallback((g: Guardian, source: "picker" | "blur") => {
    setSelectedGuardian(g);
    setGuardianLookup({ status: "idle" });
    setValue("guardian_name", g.name || "");
    setValue("guardian_lastname", g.lastname || "");
    setValue("guardian_phone", g.phone || "");
    setValue("guardian_relationship", g.relationship || "");
    guardianChosen.current = source;
  }, [setValue]);

  // --- Búsqueda en la modal "Buscar tutor existente". Usa el endpoint
  //     existente GET /api/guardians con `?search=` (regex sobre
  //     nombre/apellido/teléfono) o `?phone=` exacto cuando hay 10
  //     dígitos — el segundo usa el índice {school, phone}.
  const searchGuardians = useCallback(async (q: string) => {
    setIsGuardianSearching(true);
    try {
      const params = new URLSearchParams({ limit: "10" });
      if (/^\d{10}$/.test(q.trim())) {
        params.set("phone", q.trim());
      } else if (q.trim().length >= 2) {
        params.set("search", q.trim());
      }
      const res = await api.get<{ items: Guardian[]; total: number }>(
        `${ENDPOINTS.GUARDIANS}?${params.toString()}`
      );
      setGuardianResults(res?.items || []);
    } catch {
      setGuardianResults([]);
    } finally {
      setIsGuardianSearching(false);
    }
  }, []);

  // Dispara búsqueda cada vez que cambia `guardianSearch` (mientras la
  // modal está abierta). Debounce simple.
  useEffect(() => {
    if (!isGuardianPickerOpen) return;
    const t = setTimeout(() => searchGuardians(guardianSearch), 200);
    return () => clearTimeout(t);
  }, [guardianSearch, isGuardianPickerOpen, searchGuardians]);

  // --- Auto-detección al perder foco del teléfono. Si el número
  //     coincide con un tutor existente, mostramos una sugerencia con
  //     botón "Usar este tutor" (que llama `selectGuardian("blur")`).
  //     No auto-selecciona — la decisión final es del admin.
  const onGuardianPhoneBlur = useCallback(async () => {
    // Suprimir si el admin ya eligió manualmente, por modal o por blur.
    if (guardianChosen.current !== "none") return;
    if (selectedGuardian) return;
    const phone = (watch("guardian_phone") || "").trim();
    if (!/^\d{10}$/.test(phone)) {
      setGuardianLookup({ status: "idle" });
      return;
    }
    setGuardianLookup({ status: "loading" });
    try {
      const res = await api.get<{ items: Guardian[] }>(
        `${ENDPOINTS.GUARDIANS}?phone=${phone}`
      );
      const found = res?.items?.[0];
      if (found) {
        setGuardianLookup({ status: "found", guardian: found });
      } else {
        setGuardianLookup({ status: "empty" });
      }
    } catch {
      setGuardianLookup({ status: "idle" });
    }
  }, [selectedGuardian, watch]);

  // --- Register new student ---
  const onRegister = async (data: RegisterFormData) => {
    setIsRegistering(true);
    setRegisterError(null);
    setRegisterWarn(null);
    try {
      // `selectedGuardian` es la fuente de verdad de "no enviar datos
      // del tutor porque ya está registrado". Cuando está set, el
      // frontend ramifica al endpoint nuevo por ID
      // (POST /api/guardians/:id/students) que solo recibe IDs.
      // En cualquier otro caso, si el admin tecleó teléfono + nombre,
      // se manda al flujo clásico de POST /api/guardians (el backend
      // ya reusa por teléfono; nunca pisa name/lastname/relationship).
      const { guardian_name, guardian_lastname, guardian_phone, guardian_relationship, grade, ...studentData } = data;
      const student = await api.post<Student>(`${ENDPOINTS.STUDENTS}/register`, {
        ...studentData,
        school: schoolId,
      });
      const studentId = (student as any)._id || student;

      let guardianLinkWarning: string | null = null;
      let guardianLinkedLabel: string | null = null;

      if (selectedGuardian) {
        // Rama modal: el tutor ya existe en la DB. Solo vinculamos
        // este alumno al tutor por ID. No enviamos nombre/teléfono.
        try {
          const linked = await api.post<Guardian>(
            ENDPOINTS.GUARDIAN_STUDENTS(selectedGuardian._id),
            { student_ids: [studentId] }
          );
          const fullName = [linked.name, linked.lastname].filter(Boolean).join(" ") || "tutor";
          const count = linked.students?.length ?? 0;
          guardianLinkedLabel = `Tutor ${fullName} vinculado (ahora tiene ${count} alumno${count === 1 ? "" : "s"}).`;
        } catch {
          guardianLinkWarning = "Alumno creado, pero no se pudo vincular al tutor seleccionado. Intenta desde el detalle del alumno.";
        }
      } else if (guardian_name && guardian_phone) {
        // Rama manual: el backend reusa por teléfono (índice único
        // {school, phone}) y solo completa campos vacíos del tutor
        // existente. Nunca pisa name/lastname/relationship.
        try {
          const guardian = await api.post<any>(ENDPOINTS.GUARDIANS, {
            name: guardian_name,
            lastname: guardian_lastname,
            phone: guardian_phone,
            relationship: guardian_relationship || "tutor legal",
            school: schoolId,
            students: [studentId],
          });
          // El backend ya hace $addToSet en ambos lados (Guardian.students
          // y Student.guardians), por eso ya NO hay que hacer un
          // PUT /api/students/:id { guardians: [id] } — esa llamada
          // sobreescribía el array y era peligrosa si el alumno ya
          // tenía tutores previos.
          if ((guardian as any)?.warning) {
            guardianLinkWarning = (guardian as any).warning;
          }
        } catch {
          guardianLinkWarning = "Alumno creado, pero no se pudo registrar el tutor. Revisa los datos e inténtalo desde el detalle del alumno.";
        }
      }

      await api.post(ENDPOINTS.ENROLLMENTS, {
        student_id: studentId,
        school_year_id: yearId,
        school: schoolId,
        group_id: null,
        cycle_status: "enrolled",
      });
      setIsRegisterOpen(false);
      reset();
      // Limpiamos la selección del tutor para el próximo alta.
      setSelectedGuardian(null);
      setGuardianLookup({ status: "idle" });
      guardianChosen.current = "none";
      await fetchData();
      // Avisos no fatales se muestran como toast efímero después de
      // cerrar el modal. Como no tenemos un toast global, los
      // guardamos en `registerWarn` y los mostraremos en la cabecera
      // de la lista (un componente dedicado en otro pase).
      if (guardianLinkedLabel) setRegisterWarn(guardianLinkedLabel);
      else if (guardianLinkWarning) setRegisterWarn(guardianLinkWarning);
      // Auto-clear tras 6s.
      if (guardianLinkedLabel || guardianLinkWarning) {
        setTimeout(() => setRegisterWarn(null), 6000);
      }
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
      await api.put(`${ENDPOINTS.ENROLLMENTS}/${deleteTarget.enrollment._id}`, { cycle_status: "withdrawn" });
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

  // --- Graduate ---
  const handleGraduate = async () => {
    if (graduateSelected.size === 0) return;
    setIsGraduating(true);
    try {
      let succeeded = 0;
      let failed = 0;
      for (const enrollmentId of graduateSelected) {
        try {
          await api.put(`${ENDPOINTS.ENROLLMENTS}/${enrollmentId}`, {
            cycle_status: "graduated",
          });
          succeeded++;
        } catch {
          failed++;
        }
      }
      setGraduateResult({ succeeded, failed });
      setGraduateSelected(new Set());
      await fetchData();
    } catch {
      setError("Error al graduar alumnos.");
    } finally {
      setIsGraduating(false);
    }
  };

  // --- Import ---
  const handleImport = async () => {
    if (!importFile) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("school_year_id", yearId);
      formData.append("school", schoolId);

      const data = await api.upload<{
        total: number;
        succeeded: number;
        failed: number;
        results: { index: number; status: string; curp?: string; errors?: string[] }[];
      }>(ENDPOINTS.STUDENTS_IMPORT, formData);
      setImportResult(data);
      if (data.succeeded > 0) await fetchData();
    } catch {
      setError("Error al importar alumnos.");
    } finally {
      setIsImporting(false);
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
    setReinscEligibleCounts({});
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

      const [groups, currentEnrollments] = await Promise.all([
        api.get<Group[]>(`${ENDPOINTS.GROUPS}?school_year_id=${prevYearData._id}`),
        api.get<Enrollment[]>(`${ENDPOINTS.ENROLLMENTS}?school_year_id=${yearId}`),
      ]);

      const prevGroups = (groups || []).filter((g) => g.type !== "taller" && g.grade < 3);
      setReinscPrevGroups(prevGroups);

      // Build set of student IDs already enrolled in current cycle
      const enrolledIds = new Set(
        (Array.isArray(currentEnrollments) ? currentEnrollments : []).map((e) => {
          return typeof e.student_id === "string" ? e.student_id : (e.student_id as any)?._id;
        })
      );

      // For each previous group, count how many students are NOT yet enrolled
      const counts: Record<string, number> = {};
      await Promise.all(
        prevGroups.map(async (g) => {
          const enrollments = await api.get<Enrollment[]>(
            `${ENDPOINTS.ENROLLMENTS}?group_id=${g._id}&cycle_status=enrolled`
          );
          const list = Array.isArray(enrollments) ? enrollments : [];
          const eligible = list.filter((e) => {
            const sid = typeof e.student_id === "string" ? e.student_id : (e.student_id as any)?._id;
            return sid && !enrolledIds.has(sid);
          });
          counts[g._id] = eligible.length;
        })
      );
      setReinscEligibleCounts(counts);
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
      const targetGrade = reinscTargetGrade === "next" ? prevGroup.grade + 1 : prevGroup.grade;
      const targetGroup = currentGroups.find(
        (g) => g.grade === targetGrade && g.section === prevGroup.section && g.shift === prevGroup.shift
      );
      if (!targetGroup) {
        setError(`No se encontró grupo destino ${targetGrade}°${prevGroup.section} en el ciclo actual.`);
        setReinscLoading(false);
        return;
      }
      const eligible = reinscPrevEnrollments.filter(
        (e) => reinscSelected.has(e.enrollment._id!)
      );

      // Create enrollments + carry over taller
      await Promise.all(
        eligible.map(async (e) => {
          await api.post(ENDPOINTS.ENROLLMENTS, {
            student_id: e.student._id,
            group_id: targetGroup._id,
            school_year_id: yearId,
            school: schoolId,
            cycle_status: "enrolled",
          });

          // Carry over taller: find matching taller in new cycle by section
          const prevTallerId = typeof e.student.workshop_group_id === "object"
            ? (e.student.workshop_group_id as any)?._id
            : typeof e.student.workshop_group_id === "string"
              ? e.student.workshop_group_id
              : null;
          if (!prevTallerId) return;

          const prevTallerSection = typeof e.student.workshop_group_id === "object"
            ? (e.student.workshop_group_id as any)?.section
            : null;
          if (!prevTallerSection) return;

          const newTaller = currentTalleres.find(
            (t) => t.section === prevTallerSection && t.grade === targetGrade
          );
          if (newTaller) {
            await api.put(`${ENDPOINTS.STUDENTS}/${e.student._id}`, {
              workshop_group_id: newTaller._id,
            });
          }
        })
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
          <Button variant="ghost" size="sm" onClick={() => setIsGraduateOpen(true)}>
            <GraduationCap size={16} className="mr-1" />
            Graduar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setIsImportOpen(true); setImportResult(null); setImportFile(null); }}>
            <Upload size={16} className="mr-1" />
            Importar Excel
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {([
          { key: "all", label: "Todos" },
          { key: "no_group", label: "Sin grupo" },
          { key: "enrolled", label: "Activos" },
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
        placeholder="Buscar por nombre o numero de control..."
        icon={<Search size={18} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3">
        <Select
          placeholder="Todos los grupos"
          options={[
            { value: "", label: "Todos los grupos" },
            ...currentGroups.map((g) => ({
              value: g._id,
              label: `${g.grade}° ${g.section} — ${g.shift === "matutino" ? "Matutino" : "Vespertino"}`,
            })),
          ]}
          value={filterGroupId}
          onChange={(e) => setFilterGroupId(e.target.value)}
        />
        <Select
          placeholder="Todos los talleres"
          options={[
            { value: "", label: "Todos los talleres" },
            ...currentTalleres.map((g) => ({
              value: g._id,
              label: `${g.grade}° ${g.section}`,
            })),
          ]}
          value={filterTallerId}
          onChange={(e) => setFilterTallerId(e.target.value)}
        />
      </div>

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
                    <th className="text-left px-4 py-3 font-semibold text-text-primary">Acceso</th>
                    <th className="text-right px-4 py-3 font-semibold text-text-primary w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, idx) => (
                    <tr
                      key={e.enrollment._id}
                      className="border-b border-border last:border-b-0 hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            const ids = filtered.map((x) => x.student._id).join(",");
                            router.push(`/schools/${schoolId}/school-years/${yearId}/students/${e.student._id}?ids=${encodeURIComponent(ids)}&idx=${idx}`);
                          }}
                          className="flex items-center gap-2.5 font-medium text-accent-dark hover:underline text-left"
                        >
                          {e.student.photoUrl ? (
                            <img
                              src={e.student.photoUrl}
                              alt={`${e.student.first_name} ${e.student.last_name}`}
                              className="w-14 h-14 rounded-full object-cover border border-border flex-shrink-0"
                            />
                          ) : (
                            <span className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                              <User size={20} className="text-accent-dark" />
                            </span>
                          )}
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
                      <td className="px-4 py-3">
                        {e.student.isFaceEnrolled ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            Facial
                          </span>
                        ) : e.student.rfid_card || e.student.biometricId ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
                            RFID / PIN
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                            Sin acceso
                          </span>
                        )}
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
          {registerWarn && (
            <div className="p-3 rounded-xl bg-amber-100 text-amber-800 text-sm">{registerWarn}</div>
          )}
          <Input label="CURP" placeholder="18 caracteres" error={errors.curp?.message} {...register("curp")} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre(s)" error={errors.first_name?.message} {...register("first_name")} />
            <Input label="Apellido(s)" error={errors.last_name?.message} {...register("last_name")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Grado"
              options={[
                { value: "1", label: "1° Grado" },
                { value: "2", label: "2° Grado" },
                { value: "3", label: "3° Grado" },
              ]}
              error={errors.grade?.message}
              {...register("grade")}
            />
            <Select
              label="Sexo"
              options={[
                { value: "", label: "No especificado" },
                { value: "male", label: "Masculino" },
                { value: "female", label: "Femenino" },
              ]}
              {...register("sex")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha de Nacimiento" type="date" {...register("date_of_birth")} />
            <Input label="Tipo de Sangre" placeholder="A+, O-, etc." {...register("blood_type")} />
          </div>
          <Input label="Dirección" {...register("address")} />
          <Input label="Teléfono del Alumno" {...register("phone")} />
          <Input label="Notas Médicas" {...register("medical_notes")} />

          {/* Tutor Legal */}
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary">Tutor Legal</h3>
              {selectedGuardian ? (
                <div className="flex items-center gap-2">
                  <Badge variant="emerald">
                    <UserCheck size={12} className="mr-1" />
                    Tutor existente
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearGuardianSelection}
                  >
                    Cambiar tutor
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsGuardianPickerOpen(true)}
                >
                  <Search size={14} />
                  Buscar tutor existente
                </Button>
              )}
            </div>

            {selectedGuardian && (
              <p className="text-xs text-text-muted mb-3">
                Los datos del tutor ya están registrados — solo se vinculará al nuevo alumno.
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nombre(s) del Tutor"
                placeholder="Nombre(s)"
                disabled={!!selectedGuardian}
                {...register("guardian_name")}
              />
              <Input
                label="Apellido(s) del Tutor"
                placeholder="Apellido(s)"
                disabled={!!selectedGuardian}
                {...register("guardian_lastname")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Teléfono del Tutor"
                placeholder="10 dígitos"
                disabled={!!selectedGuardian}
                {...register("guardian_phone", {
                  // Auto-detección al perder foco: si el teléfono ya
                  // pertenece a un tutor existente, mostramos una
                  // sugerencia con botón "Usar este tutor". Solo se
                  // dispara si el admin NO seleccionó uno por modal.
                  onBlur: onGuardianPhoneBlur,
                })}
              />
              <Select
                label="Parentesco"
                disabled={!!selectedGuardian}
                options={[
                  { value: "madre", label: "Madre" },
                  { value: "padre", label: "Padre" },
                  { value: "tutor legal", label: "Tutor Legal" },
                  { value: "abuelo/a", label: "Abuelo/a" },
                  { value: "otro", label: "Otro" },
                ]}
                {...register("guardian_relationship")}
              />
            </div>

            {/* Aviso: el tutor NO se guarda si falta alguno de los
                datos de identificación (nombre O celular). El
                alumno se crea igual; el aviso solo explica que el
                tutor no quedará registrado. No bloquea el envío:
                casos intencionales (ej. alumno sin tutor por
                trámites legales en curso) se siguen permitiendo. */}
            {!selectedGuardian && (() => {
              const gName = (watch("guardian_name") || "").trim();
              const gPhone = (watch("guardian_phone") || "").trim();
              const tieneNombre = gName.length > 0;
              const tieneCelular = gPhone.length > 0;
              if (tieneNombre && !tieneCelular) {
                return (
                  <div className="mt-3 p-3 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900">
                    <strong>No se guardarán los datos del tutor:</strong>{" "}
                    es necesario el número de celular (10 dígitos). El alumno quedará sin tutor registrado.
                    {" "}
                    {guardianLookup.status === "found" && guardianLookup.guardian
                      ? "El celular que escribiste ya está registrado — pulsa “Usar este tutor” arriba para vincularlo."
                      : "Si el tutor ya está registrado, pulsa “Buscar tutor existente”."}
                  </div>
                );
              }
              if (!tieneNombre && tieneCelular) {
                return (
                  <div className="mt-3 p-3 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900">
                    <strong>No se guardarán los datos del tutor:</strong>{" "}
                    falta el nombre. El celular sin nombre no basta para registrar al tutor.
                  </div>
                );
              }
              return null;
            })()}

            {/* Sugerencia de auto-detección en blur del teléfono. */}
            {!selectedGuardian && guardianLookup.status === "loading" && (
              <p className="text-xs text-text-muted mt-2">Buscando tutor existente…</p>
            )}
            {!selectedGuardian && guardianLookup.status === "found" && guardianLookup.guardian && (
              <div className="mt-3 p-3 rounded-xl border border-amber-200 bg-amber-50 flex items-center justify-between gap-3">
                <div className="text-xs text-amber-900">
                  <strong>Ya es tutor de: </strong>
                  {[guardianLookup.guardian.name, guardianLookup.guardian.lastname].filter(Boolean).join(" ")}
                  {" · "}
                  {guardianLookup.guardian.students?.length ?? 0} alumno
                  {(guardianLookup.guardian.students?.length ?? 0) === 1 ? "" : "s"}
                </div>
                <Button
                  type="button"
                  variant="sky"
                  size="sm"
                  onClick={() => selectGuardian(guardianLookup.guardian!, "blur")}
                >
                  Usar este tutor
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsRegisterOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="sky" isLoading={isRegistering}>Registrar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Buscar tutor existente. Búsqueda reactiva (debounced)
          por nombre o teléfono; al seleccionar se setea
          `selectedGuardian` y los 4 inputs del form se deshabilitan
          para que el admin visualice los datos sin poder editarlos. */}
      <Modal
        isOpen={isGuardianPickerOpen}
        onClose={() => {
          setIsGuardianPickerOpen(false);
          setGuardianSearch("");
          setGuardianResults([]);
        }}
        title="Buscar tutor existente"
        size="md"
      >
        <Input
          placeholder="Buscar por nombre, apellido o teléfono"
          icon={<Search size={16} />}
          autoFocus
          value={guardianSearch}
          onChange={(e) => setGuardianSearch(e.target.value)}
        />
        <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
          {isGuardianSearching && (
            <p className="text-sm text-text-muted text-center py-4">Buscando…</p>
          )}
          {!isGuardianSearching && guardianSearch.trim().length < 2 && (
            <p className="text-sm text-text-muted text-center py-4">
              Escribe al menos 2 caracteres para buscar.
            </p>
          )}
          {!isGuardianSearching && guardianSearch.trim().length >= 2 && guardianResults.length === 0 && (
            <p className="text-sm text-text-muted text-center py-4">
              Sin coincidencias. Si lo registras a mano, se creará un nuevo tutor.
            </p>
          )}
          {guardianResults.map((g) => (
            <button
              key={g._id}
              type="button"
              onClick={() => {
                selectGuardian(g, "picker");
                setIsGuardianPickerOpen(false);
                setGuardianSearch("");
                setGuardianResults([]);
              }}
              className="w-full text-left p-3 rounded-xl border border-border hover:border-accent hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium text-text-primary">
                    {[g.name, g.lastname].filter(Boolean).join(" ") || "—"}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {g.phone} · {g.relationship}
                  </div>
                </div>
                <Badge variant="sky">
                  {g.students?.length ?? 0} alumno{(g.students?.length ?? 0) === 1 ? "" : "s"}
                </Badge>
              </div>
            </button>
          ))}
        </div>
        <div className="flex justify-end pt-4">
          <Button
            variant="ghost"
            onClick={() => {
              setIsGuardianPickerOpen(false);
              setGuardianSearch("");
              setGuardianResults([]);
            }}
          >
            Cancelar
          </Button>
        </div>
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
                  .map((g) => {
                    const eligible = reinscEligibleCounts[g._id] ?? 0;
                    const disabled = eligible === 0;
                    return (
                      <button
                        key={g._id}
                        disabled={disabled}
                        onClick={() => loadPrevGroupStudents(g._id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          disabled
                            ? "border-border bg-slate-50 opacity-50 cursor-not-allowed"
                            : reinscPrevGroupId === g._id
                              ? "border-accent bg-accent/5"
                              : "border-border hover:border-accent/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-text-primary">{g.grade}°{g.section}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${disabled ? "bg-slate-200 text-text-muted" : "bg-emerald-100 text-emerald-700"}`}>
                            {disabled ? "Ya reinscrito" : `${eligible} pendiente${eligible !== 1 ? "s" : ""}`}
                          </span>
                        </div>
                        <span className="text-xs text-text-muted">
                          {g.shift === "matutino" ? "Matutino" : "Vespertino"}
                        </span>
                      </button>
                    );
                  })
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
              const targetGrade = reinscTargetGrade === "next" ? (prevGroup?.grade || 0) + 1 : (prevGroup?.grade || 0);
              const targetGroup = prevGroup
                ? currentGroups.find(
                    (g) => g.grade === targetGrade && g.section === prevGroup.section && g.shift === prevGroup.shift
                  )
                : null;
              return (
                <>
                  <div className="flex items-center gap-4">
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
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                    <span className="text-sm font-medium text-text-primary">Grado destino:</span>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="targetGrade"
                        value="next"
                        checked={reinscTargetGrade === "next"}
                        onChange={() => setReinscTargetGrade("next")}
                        className="w-4 h-4"
                      />
                      Siguiente grado ({prevGroup ? prevGroup.grade + 1 : "?"}°)
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="targetGrade"
                        value="same"
                        checked={reinscTargetGrade === "same"}
                        onChange={() => setReinscTargetGrade("same")}
                        className="w-4 h-4"
                      />
                      Mismo grado ({prevGroup?.grade}°) — Reprobado
                    </label>
                  </div>
                </>
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
                          <td className="px-3 py-2 font-medium">
                            <span className="flex items-center gap-2">
                              {e.student.photoUrl ? (
                                <img src={e.student.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-border" />
                              ) : (
                                <span className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                                  <User size={12} className="text-accent-dark" />
                                </span>
                              )}
                              {e.student.first_name} {e.student.last_name}
                            </span>
                          </td>
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
          {assignGroupTarget?.group && (
            <p className="text-xs text-text-muted">
              Solo se muestran grupos de {assignGroupTarget.group.grade}° grado.
            </p>
          )}
          <Select
            label="Grupo"
            placeholder={assignGroupTarget?.group ? `${assignGroupTarget.group.grade}° grado` : "Seleccionar grupo"}
            options={
              assignGroupTarget?.group
                ? currentGroups.filter((g) => g.grade === assignGroupTarget.group!.grade).map((g) => ({
                    value: g._id,
                    label: `${g.grade}° ${g.section} — ${g.shift === "matutino" ? "Matutino" : "Vespertino"}`,
                  }))
                : currentGroups.map((g) => ({
                    value: g._id,
                    label: `${g.grade}° ${g.section} — ${g.shift === "matutino" ? "Matutino" : "Vespertino"}`,
                  }))
            }
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
          {assignTallerTarget?.group && (
            <p className="text-xs text-text-muted">
              Solo se muestran talleres de {assignTallerTarget.group.grade}° grado.
            </p>
          )}
          <Select
            label="Taller"
            placeholder={assignTallerTarget?.group ? `${assignTallerTarget.group.grade}° grado` : "Seleccionar taller"}
            options={[
              { value: "", label: "Sin taller" },
              ...(assignTallerTarget?.group
                ? currentTalleres.filter((g) => g.grade === assignTallerTarget.group!.grade)
                : currentTalleres
              ).map((g) => ({
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
                    <td className="px-3 py-2 font-medium">
                      <span className="flex items-center gap-2">
                        {e.student.photoUrl ? (
                          <img src={e.student.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-border" />
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                            <User size={12} className="text-accent-dark" />
                          </span>
                        )}
                        {e.student.first_name} {e.student.last_name}
                      </span>
                    </td>
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
                        <td className="px-3 py-2 font-medium">
                          <span className="flex items-center gap-2">
                            {e.student.photoUrl ? (
                              <img src={e.student.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-border" />
                            ) : (
                              <span className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                                <User size={12} className="text-accent-dark" />
                              </span>
                            )}
                            {e.student.first_name} {e.student.last_name}
                          </span>
                        </td>
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

      {/* Modal: Graduar */}
      <Modal
        isOpen={isGraduateOpen}
        onClose={() => { setIsGraduateOpen(false); setGraduateResult(null); }}
        title="Graduar Alumnos"
        size="lg"
      >
        <div className="space-y-4">
          {graduateResult ? (
            <div className="text-center py-4">
              <GraduationCap size={48} className="mx-auto text-emerald-500 mb-3" />
              <h3 className="font-semibold text-text-primary text-lg">Graduación completada</h3>
              <p className="text-sm text-text-secondary mt-1">
                {graduateResult.succeeded} graduado{graduateResult.succeeded !== 1 ? "s" : ""}
                {graduateResult.failed > 0 && ` · ${graduateResult.failed} fallido${graduateResult.failed !== 1 ? "s" : ""}`}
              </p>
              <Button variant="ghost" className="mt-4" onClick={() => { setIsGraduateOpen(false); setGraduateResult(null); }}>
                Cerrar
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-secondary">
                Selecciona los alumnos de 3° grado a marcar como graduados.
              </p>
              <div className="max-h-64 overflow-y-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-slate-50">
                      <th className="px-3 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={graduateSelected.size === enriched.filter((e) => e.group?.grade === 3 && e.enrollment.cycle_status === "enrolled").length && enriched.length > 0}
                          onChange={() => {
                            const grad3 = enriched.filter((e) => e.group?.grade === 3 && e.enrollment.cycle_status === "enrolled");
                            if (graduateSelected.size === grad3.length) setGraduateSelected(new Set());
                            else setGraduateSelected(new Set(grad3.map((e) => e.enrollment._id!)));
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
                    {enriched.filter((e) => e.group?.grade === 3 && e.enrollment.cycle_status === "enrolled").map((e) => (
                      <tr key={e.enrollment._id} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={graduateSelected.has(e.enrollment._id!)}
                            onChange={() => {
                              setGraduateSelected((prev) => {
                                const next = new Set(prev);
                                if (next.has(e.enrollment._id!)) next.delete(e.enrollment._id!);
                                else next.add(e.enrollment._id!);
                                return next;
                              });
                            }}
                            className="w-4 h-4 rounded border-slate-300"
                          />
                        </td>
                        <td className="px-3 py-2 font-medium">
                          <span className="flex items-center gap-2">
                            {e.student.photoUrl ? (
                              <img src={e.student.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-border" />
                            ) : (
                              <span className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                                <User size={12} className="text-accent-dark" />
                              </span>
                            )}
                            {e.student.first_name} {e.student.last_name}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-text-secondary font-mono text-xs">{e.student.controlNumber}</td>
                        <td className="px-3 py-2">{e.group?.grade}°{e.group?.section}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setIsGraduateOpen(false)}>Cancelar</Button>
                <Button
                  variant="sky"
                  disabled={graduateSelected.size === 0}
                  isLoading={isGraduating}
                  onClick={handleGraduate}
                >
                  Graduar ({graduateSelected.size})
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Modal: Importar Excel */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => { setIsImportOpen(false); setImportResult(null); setImportFile(null); }}
        title="Importar Alumnos desde Excel"
        size="lg"
      >
        <div className="space-y-4">
          {importResult ? (
            <div className="space-y-3">
              <div className="text-center py-4">
                <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" />
                <h3 className="font-semibold text-text-primary text-lg">Importación completada</h3>
                <p className="text-sm text-text-secondary mt-1">
                  {importResult.succeeded} de {importResult.total} alumnos importados
                  {importResult.failed > 0 && ` · ${importResult.failed} fallidos`}
                  {(importResult.warnings ?? 0) > 0 && ` · ${importResult.warnings} con avisos en tutor`}
                  {(() => {
                    const sinTutor = (importResult.results || []).filter((r: any) => r.status === "ok" && r.guardian_missing).length;
                    return sinTutor > 0 ? ` · ${sinTutor} creados sin tutor` : null;
                  })()}
                </p>
              </div>
              {importResult.failed > 0 && (
                <div className="max-h-48 overflow-y-auto border border-border rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-slate-50">
                        <th className="px-3 py-2 text-left font-semibold">Fila</th>
                        <th className="px-3 py-2 text-left font-semibold">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.results
                        .filter((r: any) => r.status === "error")
                        .map((r: any, i: number) => (
                          <tr key={i} className="border-b border-border last:border-b-0">
                            <td className="px-3 py-2 text-text-secondary">{r.index + 1}</td>
                            <td className="px-3 py-2 text-error">{r.errors?.join(", ")}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
              {(importResult.warnings ?? 0) > 0 && (
                <div className="max-h-48 overflow-y-auto border border-amber-200 rounded-xl bg-amber-50/40">
                  <div className="px-3 py-2 text-xs font-semibold text-amber-800 border-b border-amber-200">
                    Avisos del tutor (no bloquean al alumno)
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-amber-200">
                        <th className="px-3 py-2 text-left font-semibold text-amber-900">Fila</th>
                        <th className="px-3 py-2 text-left font-semibold text-amber-900">Aviso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.results
                        .filter((r: any) => r.status === "warning")
                        .map((r: any, i: number) => (
                          <tr key={i} className="border-b border-amber-100 last:border-b-0">
                            <td className="px-3 py-2 text-text-secondary">{r.index + 1}</td>
                            <td className="px-3 py-2 text-amber-800">{r.errors?.join(", ")}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Tutores reusados: el Excel traía un teléfono que ya
                  pertenecía a un tutor registrado — se vinculó al
                  alumno en lugar de crear un duplicado. */}
              {(() => {
                const reused = (importResult.results || []).filter((r: any) => r.status === "ok" && r.guardian_reused);
                if (reused.length === 0) return null;
                return (
                  <div className="max-h-48 overflow-y-auto border border-sky-200 rounded-xl bg-sky-50/40">
                    <div className="px-3 py-2 text-xs font-semibold text-sky-800 border-b border-sky-200">
                      Tutores reusados (vincularon alumnos a tutores ya registrados)
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-sky-200">
                          <th className="px-3 py-2 text-left font-semibold text-sky-900">Fila</th>
                          <th className="px-3 py-2 text-left font-semibold text-sky-900">Tutor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reused.map((r: any, i: number) => (
                          <tr key={i} className="border-b border-sky-100 last:border-b-0">
                            <td className="px-3 py-2 text-text-secondary">{r.index + 1}</td>
                            <td className="px-3 py-2 text-sky-900">{r.guardian}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
              {/* Alumnos creados sin tutor: el Excel no traía teléfono
                  del tutor, así que la fila se importó sin tutor
                  vinculado. "missing_phone" = tenía nombre pero
                  faltó celular (dato incompleto, corregir). "no_data"
                  = la fila no traía datos de tutor (probablemente
                  intencional; dar seguimiento si no lo es). */}
              {(() => {
                const sinTutor = (importResult.results || []).filter((r: any) => r.status === "ok" && r.guardian_missing);
                if (sinTutor.length === 0) return null;
                return (
                  <div className="max-h-48 overflow-y-auto border border-amber-200 rounded-xl bg-amber-50/40">
                    <div className="px-3 py-2 text-xs font-semibold text-amber-800 border-b border-amber-200">
                      Alumnos creados sin tutor ({sinTutor.length}) — recuerda que el celular del tutor es obligatorio para notificaciones y activación
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-amber-200">
                          <th className="px-3 py-2 text-left font-semibold text-amber-900">Fila</th>
                          <th className="px-3 py-2 text-left font-semibold text-amber-900">Alumno</th>
                          <th className="px-3 py-2 text-left font-semibold text-amber-900">CURP</th>
                          <th className="px-3 py-2 text-left font-semibold text-amber-900">Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sinTutor.map((r: any, i: number) => (
                          <tr key={i} className="border-b border-amber-100 last:border-b-0">
                            <td className="px-3 py-2 text-text-secondary">{r.index + 1}</td>
                            <td className="px-3 py-2 text-amber-900">{r.student_name || "—"}</td>
                            <td className="px-3 py-2 text-text-secondary font-mono text-xs">{r.curp || "—"}</td>
                            <td className="px-3 py-2 text-amber-800">
                              {r.guardian_missing_reason === "missing_phone"
                                ? "Tenía nombre del tutor pero faltó el celular"
                                : "Sin datos de tutor en la fila"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
              <div className="flex justify-end pt-4">
                <Button variant="ghost" onClick={() => { setIsImportOpen(false); setImportResult(null); setImportFile(null); }}>
                  Cerrar
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 bg-slate-50 rounded-xl">
                <h4 className="font-medium text-text-primary mb-2">Estructura del archivo</h4>
                <ul className="text-xs text-text-secondary space-y-1">
                  <li>Un solo archivo Excel (.xlsx, .xls) o CSV</li>
                  <li>Una sola hoja de calculo con encabezados en la primera fila</li>
                  <li>Cada fila restante es un alumno</li>
                </ul>

                <h4 className="font-medium text-text-primary mt-4 mb-2">Columnas requeridas</h4>
                <ul className="text-xs text-text-secondary space-y-1">
                  <li><span className="font-mono bg-slate-200 px-1 rounded">curp</span> CURP del alumno (18 caracteres)</li>
                  <li><span className="font-mono bg-slate-200 px-1 rounded">nombre</span> Nombre(s) del alumno</li>
                  <li><span className="font-mono bg-slate-200 px-1 rounded">apellido</span> Apellido(s) del alumno</li>
                </ul>

                <h4 className="font-medium text-text-primary mt-4 mb-2">Columnas opcionales</h4>
                <ul className="text-xs text-text-secondary space-y-1">
                  <li><span className="font-mono bg-slate-200 px-1 rounded">sexo</span> M o F (tambien: masculino/femenino)</li>
                  <li><span className="font-mono bg-slate-200 px-1 rounded">telefono</span> 10 digitos</li>
                  <li><span className="font-mono bg-slate-200 px-1 rounded">direccion</span> Direccion completa</li>
                  <li><span className="font-mono bg-slate-200 px-1 rounded">fecha_nacimiento</span> Formato: YYYY-MM-DD</li>
                  <li><span className="font-mono bg-slate-200 px-1 rounded">tipo_sangre</span> Ej: A+, O-</li>
                  <li><span className="font-mono bg-slate-200 px-1 rounded">grupo</span> Grupo destino (ej: 1A, 2B). El alumno se asigna automaticamente</li>
                </ul>

                <h4 className="font-medium text-text-primary mt-4 mb-2">
                  Datos del tutor <span className="font-normal text-text-secondary">(opcional)</span>
                </h4>
                <p className="text-xs text-text-secondary mb-2">
                  El nombre del tutor ahora va en <strong>dos columnas separadas</strong>{" "}
                  (<code className="font-mono bg-slate-200 px-1 rounded">tutor_nombre</code>{" "}
                  + <code className="font-mono bg-slate-200 px-1 rounded">tutor_apellido</code>).
                  Antes se capturaba todo en una sola celda — esa columna ya no es solo
                  el nombre completo.
                </p>
                <ul className="text-xs text-text-secondary space-y-1">
                  <li>
                    <span className="font-mono bg-slate-200 px-1 rounded">tutor_nombre</span>{" "}
                    Solo los <strong>nombre(s)</strong> del tutor. Ej:{" "}
                    <span className="font-mono bg-slate-100 px-1 rounded">Lupita</span>,{" "}
                    <span className="font-mono bg-slate-100 px-1 rounded">Juan Pedro</span>.{" "}
                    <span className="text-amber-700">(no pongas aquí el apellido).</span>
                  </li>
                  <li>
                    <span className="font-mono bg-slate-200 px-1 rounded">tutor_apellido</span>{" "}
                    Los <strong>apellidos</strong> del tutor. Ej:{" "}
                    <span className="font-mono bg-slate-100 px-1 rounded">Vázquez Ríos</span>,{" "}
                    <span className="font-mono bg-slate-100 px-1 rounded">Pérez Hernández</span>.{" "}
                    Es opcional: si la dejas vacía y <code className="font-mono bg-slate-200 px-1 rounded">tutor_nombre</code>{" "}
                    tiene varias palabras, se separa automáticamente (1ª palabra = nombre,
                    el resto = apellido). Si el nombre es una sola palabra, el apellido queda
                    vacío y el tutor podrá activar su cuenta igual.
                  </li>
                  <li>
                    <span className="font-mono bg-slate-200 px-1 rounded">tutor_telefono</span>{" "}
                    10 dígitos.
                  </li>
                  <li>
                    <span className="font-mono bg-slate-200 px-1 rounded">tutor_parentesco</span>{" "}
                    madre, padre, tutor legal, etc. (si lo omites se asume{" "}
                    <span className="font-mono">tutor legal</span>).
                  </li>
                </ul>

                <div className="mt-3 p-2 bg-slate-100 border border-slate-200 rounded-lg">
                  <p className="text-xs text-slate-700">
                    <strong>Equivalencia con archivos viejos:</strong> si antes tenías{" "}
                    <code className="font-mono bg-white px-1 rounded">Lupita Vázquez Ríos</code>
                    {" "}en <code className="font-mono bg-white px-1 rounded">tutor_nombre</code>,
                    ahora se reparte en{" "}
                    <code className="font-mono bg-white px-1 rounded">tutor_nombre</code>=
                    <span className="font-mono bg-white px-1 rounded">Lupita</span>,{" "}
                    <code className="font-mono bg-white px-1 rounded">tutor_apellido</code>=
                    <span className="font-mono bg-white px-1 rounded">Vázquez Ríos</span>.
                  </p>
                </div>

                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800">
                    <strong>Nota:</strong> Si el alumno ya existe (misma CURP), se salta. Maximo 500 alumnos por importacion.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Archivo Excel o CSV</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-accent/10 file:text-accent-dark hover:file:bg-accent/20 file:cursor-pointer"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => { setIsImportOpen(false); setImportResult(null); setImportFile(null); }}>
                  Cancelar
                </Button>
                <Button
                  variant="sky"
                  disabled={!importFile}
                  isLoading={isImporting}
                  onClick={handleImport}
                >
                  Importar
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
