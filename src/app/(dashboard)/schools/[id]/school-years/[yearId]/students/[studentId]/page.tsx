// Expediente del Alumno — Detalle dentro del ciclo escolar.
// Muestra datos personales, inscripción actual, historial y opciones de gestión.

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { PhotoCropModal } from "@/components/students/PhotoCropModal";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Student, Enrollment, Group, Guardian } from "@/lib/types";
import {
  User,
  UserPlus,
  Users,
  Search,
  Phone,
  MapPin,
  Calendar,
  Heart,
  FileText,
  ArrowLeft,
  ArrowRight,
  Edit,
  Wrench,
  Trash2,
  Camera,
  Loader2,
} from "lucide-react";

// --- Types ---
interface StudentDetail {
  student: Student;
  currentEnrollment: Enrollment | null;
  currentGroup: Group | null;
  enrollments: Enrollment[];
}

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

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;
  const studentId = params.studentId as string;

  // Navigation IDs from alumnado list
  const navIds = searchParams.get("ids")?.split(",").filter(Boolean) || [];
  const navIdx = parseInt(searchParams.get("idx") || "0", 10);
  const hasPrev = navIdx > 0;
  const hasNext = navIdx < navIds.length - 1;

  // Número de lista del alumno en la vista actual del alumnado.
  // `navIds` es la lista alfabética filtrada que la pantalla de
  // alumnado arma al hacer click en una fila (apellido → nombre,
  // localeCompare "es"), y `navIdx` es el índice 0-based dentro
  // de esa lista. Por tanto `navIdx + 1` ES el número de lista del
  // alumno en la vista desde la que se abrió el expediente.
  // Fallback a null cuando el expediente se abre sin query (deep
  // link, botón "Ver Expediente" del menú de fila) o cuando el
  // alumno no está en `navIds` (caso defensivo que no debería
  // ocurrir en flujo normal pero la UI no debe mostrar `1 / 0`).
  const numeroDeLista =
    navIds.length > 0 && navIds.includes(studentId) ? navIdx + 1 : null;

  const goToStudent = (idx: number) => {
    const id = navIds[idx];
    if (!id) return;
    const qs = `?ids=${encodeURIComponent(navIds.join(","))}&idx=${idx}`;
    router.push(`/schools/${schoolId}/school-years/${yearId}/students/${id}${qs}`);
  };

  const [data, setData] = useState<StudentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: "", last_name: "", sex: "", phone: "", address: "",
    date_of_birth: "", blood_type: "", medical_notes: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Taller modal
  const [isTallerOpen, setIsTallerOpen] = useState(false);
  const [selectedTallerId, setSelectedTallerId] = useState("");
  const [isAssigningTaller, setIsAssigningTaller] = useState(false);

  // Group modal
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [isAssigningGroup, setIsAssigningGroup] = useState(false);

  // Delete enrollment
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Photo upload
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);

  // Tutor edit/add modal (también usado para agregar tutor cuando
  // el alumno no tiene ninguno — `editingGuardianId === null`).
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [tutorForm, setTutorForm] = useState({ name: "", lastname: "", phone: "", relationship: "" });
  const [editingGuardianId, setEditingGuardianId] = useState<string | null>(null);
  const [isSavingTutor, setIsSavingTutor] = useState(false);
  const [customRelationship, setCustomRelationship] = useState("");
  // Error visible dentro del modal: el `error` global solo se
  // muestra en la carga inicial del expediente, no después.
  const [tutorFormError, setTutorFormError] = useState<string | null>(null);

  const openAddTutorModal = () => {
    setTutorForm({ name: "", lastname: "", phone: "", relationship: "" });
    setCustomRelationship("");
    setEditingGuardianId(null);
    setTutorFormError(null);
    // Default tab: "Vincular existente" para que lo habitual
    // (ya hay un tutor registrado para papá/mamá de un hermano)
    // sea un click en vez de teclear el celular a mano.
    setTutorModalTab("existing");
    setExistingGuardianSearch("");
    setExistingGuardianResults([]);
    setIsTutorOpen(true);
  };

  // --- Tab del modal: 'existing' = buscar/vincular tutor ya
  //     registrado, 'new' = crear uno desde cero. El tab existe
  //     solo en modo ADD (no en edit), por eso el JSX lo oculta
  //     cuando `editingGuardianId` está set. ---
  const [tutorModalTab, setTutorModalTab] = useState<"existing" | "new">("existing");
  const [existingGuardianSearch, setExistingGuardianSearch] = useState("");
  const [existingGuardianResults, setExistingGuardianResults] = useState<Guardian[]>([]);
  const [isExistingGuardianSearching, setIsExistingGuardianSearching] = useState(false);
  const [isLinkingGuardian, setIsLinkingGuardian] = useState(false);

  // Búsqueda reactiva (debounced 200ms) por nombre o teléfono —
  // reutiliza el mismo endpoint que la modal del alumnado:
  // GET /api/guardians?phone=10dígitos (lookup exacto, índice
  // {school,phone}) o ?search=regex (mínimo 2 caracteres).
  const searchExistingGuardians = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length === 0) {
      setExistingGuardianResults([]);
      setIsExistingGuardianSearching(false);
      return;
    }
    setIsExistingGuardianSearching(true);
    try {
      const params = new URLSearchParams({ limit: "10" });
      if (/^\d{10}$/.test(trimmed)) {
        params.set("phone", trimmed);
      } else if (trimmed.length >= 2) {
        params.set("search", trimmed);
      }
      const res = await api.get<{ items: Guardian[]; total: number }>(
        `${ENDPOINTS.GUARDIANS}?${params.toString()}`
      );
      setExistingGuardianResults(res?.items || []);
    } catch {
      setExistingGuardianResults([]);
    } finally {
      setIsExistingGuardianSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!isTutorOpen || tutorModalTab !== "existing") return;
    const t = setTimeout(() => searchExistingGuardians(existingGuardianSearch), 200);
    return () => clearTimeout(t);
  }, [existingGuardianSearch, isTutorOpen, tutorModalTab, searchExistingGuardians]);

  // Vincular un tutor existente (por ID) al alumno actual. Usa
  // el endpoint POST /api/guardians/:id/students con
  // { student_ids: [studentId] } — aditivo ($addToSet), no pisa
  // datos del tutor ni de otros alumnos que ya tuviera.
  const linkExistingGuardianToStudent = async (g: Guardian) => {
    setIsLinkingGuardian(true);
    setTutorFormError(null);
    try {
      await api.post<Guardian>(
        ENDPOINTS.GUARDIAN_STUDENTS(g._id),
        { student_ids: [studentId] }
      );
      setIsTutorOpen(false);
      setEditingGuardianId(null);
      setExistingGuardianSearch("");
      setExistingGuardianResults([]);
      await fetchData();
    } catch (err) {
      setTutorFormError(
        err instanceof Error ? err.message : "No se pudo vincular el tutor."
      );
    } finally {
      setIsLinkingGuardian(false);
    }
  };

  const [groupsRes, setGroupsRes] = useState<Group[]>([]);
  const [talleresRes, setTalleresRes] = useState<Group[]>([]);

  // Access devices (inline edit)
  const [editingRfid, setEditingRfid] = useState(false);
  const [rfidValue, setRfidValue] = useState("");
  const [editingBiometric, setEditingBiometric] = useState(false);
  const [biometricValue, setBiometricValue] = useState("");
  const [isSavingAccess, setIsSavingAccess] = useState(false);
  const [faceError, setFaceError] = useState("");

  const fetchData = async () => {
    try {
      const [studentRes, enrollmentsRes, groupsData] = await Promise.all([
        api.get<Student>(`${ENDPOINTS.STUDENTS}/${studentId}`),
        api.get<Enrollment[]>(`${ENDPOINTS.STUDENTS}/${studentId}/enrollments`),
        api.get<Group[]>(`${ENDPOINTS.GROUPS}?school=${schoolId}&school_year_id=${yearId}`),
      ]);

      const groupsList = Array.isArray(groupsData) ? groupsData : [];
      setGroupsRes(groupsList);
      setTalleresRes(groupsList.filter((g) => g.type === "taller"));

      const enrollList = Array.isArray(enrollmentsRes) ? enrollmentsRes : (enrollmentsRes as any)?.items || [];
      const currentEnrollment = enrollList.find((e: any) => {
        const yearIdStr = typeof e.school_year_id === "string" ? e.school_year_id : (e.school_year_id as any)?._id;
        return yearIdStr === yearId;
      }) || null;

      const currentGroupId = currentEnrollment && typeof currentEnrollment.group_id === "object"
        ? (currentEnrollment.group_id as any)._id
        : typeof currentEnrollment?.group_id === "string"
          ? currentEnrollment.group_id
          : null;
      const currentGroup = currentGroupId
        ? groupsList.find((g) => g._id === currentGroupId) || null
        : null;

      setData({
        student: studentRes,
        currentEnrollment,
        currentGroup,
        enrollments: enrollList,
      });
    } catch {
      setError("Error al cargar expediente.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [studentId, yearId]);

  // --- Handlers ---
  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      await api.put(`${ENDPOINTS.STUDENTS}/${studentId}`, editForm);
      setIsEditOpen(false);
      await fetchData();
    } catch {
      setError("Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignTaller = async () => {
    setIsAssigningTaller(true);
    try {
      await api.put(`${ENDPOINTS.STUDENTS}/${studentId}`, {
        workshop_group_id: selectedTallerId || null,
      });
      setIsTallerOpen(false);
      setSelectedTallerId("");
      await fetchData();
    } catch {
      setError("Error al asignar taller.");
    } finally {
      setIsAssigningTaller(false);
    }
  };

  const handleAssignGroup = async () => {
    if (!selectedGroupId || !data?.currentEnrollment) return;
    setIsAssigningGroup(true);
    try {
      await api.put(`${ENDPOINTS.ENROLLMENTS}/${data.currentEnrollment._id}`, {
        group_id: selectedGroupId,
      });
      setIsGroupOpen(false);
      setSelectedGroupId("");
      await fetchData();
    } catch {
      setError("Error al cambiar grupo.");
    } finally {
      setIsAssigningGroup(false);
    }
  };

  const handleDeleteEnrollment = async () => {
    if (!data?.currentEnrollment) return;
    setIsDeleting(true);
    try {
      await api.put(`${ENDPOINTS.ENROLLMENTS}/${data.currentEnrollment._id}`, { cycle_status: "withdrawn" });
      setIsDeleteOpen(false);
      await fetchData();
    } catch {
      setError("Error al dar de baja.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingPhotoFile(file);
    setIsCropOpen(true);
  };

  const handlePhotoCropCancel = () => {
    setIsCropOpen(false);
    setPendingPhotoFile(null);
  };

  const handlePhotoCropConfirm = async (blob: Blob) => {
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", blob, "photo.jpg");
      await api.upload(ENDPOINTS.STUDENT_PHOTO(studentId), formData);
      await fetchData();
    } catch {
      setError("Error al subir la foto.");
    } finally {
      setIsUploadingPhoto(false);
      setIsCropOpen(false);
      setPendingPhotoFile(null);
    }
  };

  const handleSaveTutor = async () => {
    const name = tutorForm.name.trim();
    const lastname = tutorForm.lastname.trim();
    const phone = tutorForm.phone.trim();
    const relationshipRaw =
      tutorForm.relationship === "otro" ? customRelationship.trim() : tutorForm.relationship;

    // Validación mínima antes de pegar al backend. El schema del
    // backend exige `name` y `phone` (10 dígitos) y rechaza
    // parentescos vacíos; mostramos el error inline porque el
    // `error` global solo se renderiza en la carga inicial.
    if (!name) {
      setTutorFormError("El nombre del tutor es obligatorio.");
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      setTutorFormError("El teléfono debe tener 10 dígitos.");
      return;
    }
    if (!relationshipRaw) {
      setTutorFormError("Selecciona un parentesco.");
      return;
    }

    setIsSavingTutor(true);
    setTutorFormError(null);
    try {
      const payload = {
        name,
        lastname,
        phone,
        relationship: relationshipRaw,
      };
      if (editingGuardianId) {
        // Modo edición: actualiza el tutor existente.
        await api.put(`${ENDPOINTS.GUARDIANS}/${editingGuardianId}`, payload);
      } else {
        // Modo alta: crea el tutor y lo vincula a este alumno en
        // el mismo request (`POST /api/guardians` acepta
        // `students: [...]` y hace el mirror en ambos lados).
        // Si el teléfono ya pertenece a un tutor de la escuela,
        // el backend lo REUSA y solo suma este alumno — los datos
        // existentes del tutor no se pisan.
        await api.post(ENDPOINTS.GUARDIANS, {
          ...payload,
          school: schoolId,
          students: [studentId],
        });
      }
      setIsTutorOpen(false);
      setEditingGuardianId(null);
      setCustomRelationship("");
      setTutorForm({ name: "", lastname: "", phone: "", relationship: "" });
      await fetchData();
    } catch (err) {
      setTutorFormError(err instanceof Error ? err.message : "Error al guardar tutor.");
    } finally {
      setIsSavingTutor(false);
    }
  };

  const handleSaveRfid = async () => {
    setIsSavingAccess(true);
    try {
      await api.put(`${ENDPOINTS.STUDENTS}/${studentId}`, { rfid_card: rfidValue || null });
      setEditingRfid(false);
      await fetchData();
    } catch {
      setError("Error al guardar tarjeta RFID.");
    } finally {
      setIsSavingAccess(false);
    }
  };

  const handleSaveBiometric = async () => {
    if (!biometricValue && student.isFaceEnrolled) {
      setFaceError("No se puede quitar el ID Biométrico con el rostro facial activo.");
      return;
    }
    setIsSavingAccess(true);
    try {
      await api.put(`${ENDPOINTS.STUDENTS}/${studentId}`, { biometricId: biometricValue || null });
      setEditingBiometric(false);
      setFaceError("");
      await fetchData();
    } catch {
      setError("Error al guardar ID biométrico.");
    } finally {
      setIsSavingAccess(false);
    }
  };

  const handleToggleFace = async () => {
    if (!student.isFaceEnrolled && !student.biometricId) {
      setFaceError("Se requiere un ID Biométrico para activar el reconocimiento facial.");
      return;
    }
    setIsSavingAccess(true);
    try {
      await api.put(`${ENDPOINTS.STUDENTS}/${studentId}`, { isFaceEnrolled: !student.isFaceEnrolled });
      setFaceError("");
      await fetchData();
    } catch {
      setError("Error al actualizar reconocimiento facial.");
    } finally {
      setIsSavingAccess(false);
    }
  };

  if (isLoading) return <LoadingState message="Cargando expediente..." height="page" />;
  if (error) return <ErrorState title="Error" message={error} action={{ label: "Reintentar", onClick: fetchData }} />;
  if (!data) return <ErrorState title="No encontrado" message="Alumno no encontrado." />;

  const { student, currentEnrollment, currentGroup, enrollments } = data;

  const tallerId = typeof student.workshop_group_id === "object"
    ? (student.workshop_group_id as any)?._id
    : student.workshop_group_id;
  const taller = tallerId ? talleresRes.find((g) => g._id === tallerId) || null : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${student.first_name} ${student.last_name || ""}`}
        subtitle={`No. Control: ${student.controlNumber || "—"} · No. de lista: ${numeroDeLista ?? "—"}`}
        action={{
          label: "Volver",
          href: `/schools/${schoolId}/school-years/${yearId}/students`,
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna 1: Datos personales */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Datos Personales</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditForm({
                      first_name: student.first_name || "",
                      last_name: student.last_name || "",
                      sex: student.sex || "",
                      phone: student.phone || "",
                      address: student.address || "",
                      date_of_birth: student.date_of_birth || "",
                      blood_type: student.blood_type || "",
                      medical_notes: student.medical_notes || "",
                    });
                    setIsEditOpen(true);
                  }}
                >
                  <Edit size={14} className="mr-1" /> Editar
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-text-muted">CURP</span>
                  <p className="font-mono text-xs mt-0.5">{student.curp || "—"}</p>
                </div>
                <div>
                  <span className="text-text-muted"> Sexo</span>
                  <p className="mt-0.5">{student.sex === "male" ? "Masculino" : student.sex === "female" ? "Femenino" : "—"}</p>
                </div>
                <div>
                  <span className="text-text-muted">Teléfono</span>
                  <p className="mt-0.5 flex items-center gap-1">
                    {student.phone ? <><Phone size={12} /> {student.phone}</> : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-text-muted">Fecha de Nacimiento</span>
                  <p className="mt-0.5 flex items-center gap-1">
                    {student.date_of_birth
                      ? <><Calendar size={12} /> {new Date(student.date_of_birth).toLocaleDateString("es-MX")}</>
                      : "—"}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-text-muted">Dirección</span>
                  <p className="mt-0.5 flex items-center gap-1">
                    {student.address ? <><MapPin size={12} /> {student.address}</> : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-text-muted">Tipo de Sangre</span>
                  <p className="mt-0.5 flex items-center gap-1">
                    {student.blood_type ? <><Heart size={12} /> {student.blood_type}</> : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-text-muted">Notas Médicas</span>
                  <p className="mt-0.5">{student.medical_notes || "—"}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Tutor */}
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold text-text-primary mb-4">Tutor</h2>
              {Array.isArray(student.guardians) && student.guardians.length > 0 ? (
                <div className="space-y-3">
                  {student.guardians.map((g) => {
                    const guardian = typeof g === "object" ? g as Guardian : null;
                    if (!guardian) return null;
                    return (
                      <div key={guardian._id}>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-text-muted">Nombre</span>
                            <p className="font-medium mt-0.5">{[guardian.name, guardian.lastname].filter(Boolean).join(" ") || "—"}</p>
                          </div>
                          <div>
                            <span className="text-text-muted">Teléfono</span>
                            <p className="mt-0.5 flex items-center gap-1">
                              <Phone size={12} /> {guardian.phone}
                            </p>
                          </div>
                          <div>
                            <span className="text-text-muted">Parentesco</span>
                            <p className="mt-0.5 capitalize">{guardian.relationship || "—"}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setEditingGuardianId(guardian._id);
                            const rel = guardian.relationship || "";
                            const predefined = ["madre", "padre", "abuelo", "tutor legal"];
                            if (rel && !predefined.includes(rel)) {
                              setTutorForm({ name: guardian.name, lastname: guardian.lastname ?? "", phone: guardian.phone, relationship: "otro" });
                              setCustomRelationship(rel);
                            } else {
                              setTutorForm({ name: guardian.name, lastname: guardian.lastname ?? "", phone: guardian.phone, relationship: rel });
                              setCustomRelationship("");
                            }
                            setIsTutorOpen(true);
                          }}
                          className="text-xs text-accent-dark hover:underline mt-1 flex items-center gap-1"
                        >
                          <Edit size={12} /> Editar tutor
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-text-muted">Sin tutor registrado.</p>
                  <Button type="button" variant="sky" size="sm" onClick={openAddTutorModal}>
                    <UserPlus size={14} className="mr-1" />
                    Agregar tutor
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Dispositivos de Acceso */}
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold text-text-primary mb-4">Dispositivos de Acceso</h2>
              <div className="space-y-4 text-sm">
                {/* RFID */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <span className="text-text-muted">Tarjeta RFID</span>
                    {editingRfid ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          className="flex-1 rounded-xl border border-border bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                          value={rfidValue}
                          onChange={(e) => setRfidValue(e.target.value)}
                          placeholder="Número de tarjeta"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveRfid(); if (e.key === "Escape") setEditingRfid(false); }}
                        />
                        <Button variant="ghost" size="sm" onClick={handleSaveRfid} isLoading={isSavingAccess}>Guardar</Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingRfid(false)}>Cancelar</Button>
                      </div>
                    ) : (
                      <p className="font-mono text-xs mt-0.5">{student.rfid_card || "Sin asignar"}</p>
                    )}
                  </div>
                  {!editingRfid && (
                    <button
                      onClick={() => { setRfidValue(student.rfid_card || ""); setEditingRfid(true); }}
                      className="text-xs text-accent-dark hover:underline flex items-center gap-1 flex-shrink-0"
                    >
                      <Edit size={12} /> Editar
                    </button>
                  )}
                </div>

                {/* Biométrico */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <span className="text-text-muted">ID Biométrico</span>
                    {editingBiometric ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          className="flex-1 rounded-xl border border-border bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                          value={biometricValue}
                          onChange={(e) => setBiometricValue(e.target.value)}
                          placeholder="ID en terminal ZKTeco"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveBiometric(); if (e.key === "Escape") setEditingBiometric(false); }}
                        />
                        <Button variant="ghost" size="sm" onClick={handleSaveBiometric} isLoading={isSavingAccess}>Guardar</Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingBiometric(false)}>Cancelar</Button>
                      </div>
                    ) : (
                      <p className="font-mono text-xs mt-0.5">{student.biometricId || "Sin asignar"}</p>
                    )}
                  </div>
                  {!editingBiometric && (
                    <button
                      onClick={() => { setBiometricValue(student.biometricId || ""); setEditingBiometric(true); }}
                      className="text-xs text-accent-dark hover:underline flex items-center gap-1 flex-shrink-0"
                    >
                      <Edit size={12} /> Editar
                    </button>
                  )}
                </div>

                {/* Rostro Facial */}
                <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                  <div>
                    <span className="text-text-muted">Reconocimiento Facial</span>
                    <p className="text-xs mt-0.5">
                      {student.isFaceEnrolled ? "Rostro registrado en terminal" : "Sin registrar"}
                    </p>
                  </div>
                  <button
                    onClick={handleToggleFace}
                    disabled={isSavingAccess || (!student.isFaceEnrolled && !student.biometricId)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent/30 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      student.isFaceEnrolled ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        student.isFaceEnrolled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                {faceError && <p className="text-xs text-rose-600">{faceError}</p>}
                {!student.biometricId && !student.isFaceEnrolled && (
                  <p className="text-xs text-text-muted">Se requiere un ID Biométrico para activar el reconocimiento facial.</p>
                )}
                {student.isFaceEnrolled && (
                  <p className="text-xs text-emerald-600 font-medium">Rostro registrado en terminal</p>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Inscripción actual */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Inscripción Actual</h2>
                {currentEnrollment && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsGroupOpen(true)}>
                      <User size={14} className="mr-1" /> Grupo
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsTallerOpen(true)}>
                      <Wrench size={14} className="mr-1" /> Taller
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsDeleteOpen(true)}>
                      <Trash2 size={14} className="mr-1" /> Dar de Baja
                    </Button>
                  </div>
                )}
              </div>
              {currentEnrollment ? (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-text-muted">Grupo</span>
                    <p className="font-medium mt-0.5">
                      {currentGroup ? `${currentGroup.grade}°${currentGroup.section}` : "Sin grupo"}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-muted">Turno</span>
                    <p className="mt-0.5">{currentGroup?.shift === "matutino" ? "Matutino" : currentGroup?.shift === "vespertino" ? "Vespertino" : "—"}</p>
                  </div>
                  <div>
                    <span className="text-text-muted">Estado</span>
                    <p className="mt-0.5">
                      <Badge variant={(CYCLE_STATUS_COLORS[currentEnrollment.cycle_status] as any) || "slate"}>
                        {CYCLE_STATUS_LABELS[currentEnrollment.cycle_status] || currentEnrollment.cycle_status}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-text-muted">Taller</span>
                    <p className="mt-0.5">{taller ? `${taller.grade}° ${taller.section}` : "Sin taller"}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-muted">No hay inscripción en este ciclo.</p>
              )}
            </CardBody>
          </Card>

          {/* Historial de inscripciones */}
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold text-text-primary mb-4">Historial de Inscripciones</h2>
              {enrollments.length === 0 ? (
                <p className="text-sm text-text-muted">Sin historial.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-3 py-2 font-semibold">Ciclo</th>
                        <th className="text-left px-3 py-2 font-semibold">Grupo</th>
                        <th className="text-left px-3 py-2 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrollments.map((e) => {
                        const year = typeof e.school_year_id === "object" ? (e.school_year_id as any) : null;
                        const group = typeof e.group_id === "object" ? (e.group_id as any) : null;
                        return (
                          <tr key={e._id} className="border-b border-border last:border-b-0">
                            <td className="px-3 py-2">{year?.name || "—"}</td>
                            <td className="px-3 py-2">{group ? `${group.grade}°${group.section}` : "—"}</td>
                            <td className="px-3 py-2">
                              <Badge variant={(CYCLE_STATUS_COLORS[e.cycle_status] as any) || "slate"}>
                                {CYCLE_STATUS_LABELS[e.cycle_status] || e.cycle_status}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Columna 2: Info rápida */}
        <div className="space-y-4">
          <Card>
            <CardBody className="text-center">
              <div className="relative w-40 h-40 mx-auto mb-3">
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt={`${student.first_name} ${student.last_name}`}
                    className="w-40 h-40 rounded-full object-cover border-2 border-border"
                  />
                ) : (
                  <div className="w-40 h-40 rounded-full bg-accent/10 flex items-center justify-center border-2 border-border">
                    <User size={56} className="text-accent-dark" />
                  </div>
                )}
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-accent rounded-full flex items-center justify-center cursor-pointer hover:bg-accent-dark transition-colors border-2 border-white shadow-sm">
                  {isUploadingPhoto ? (
                    <Loader2 size={14} className="text-white animate-spin" />
                  ) : (
                    <Camera size={14} className="text-white" />
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhoto}
                  />
                </label>
              </div>
              <h3 className="font-semibold text-text-primary">
                {student.first_name} {student.last_name}
              </h3>
              <p className="text-sm text-text-secondary font-mono">{student.controlNumber}</p>
              <p className="text-xs text-text-muted mt-1">
                No. de lista: <span className="font-semibold text-text-secondary tabular-nums">{numeroDeLista ?? "—"}</span>
              </p>
            </CardBody>
          </Card>
          {navIds.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!hasPrev}
                  onClick={() => goToStudent(navIdx - 1)}
                >
                  <ArrowLeft size={14} className="mr-1" /> Anterior
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!hasNext}
                  onClick={() => goToStudent(navIdx + 1)}
                >
                  Siguiente <ArrowRight size={14} className="ml-1" />
                </Button>
              </div>
              <p className="text-xs text-text-muted text-center">{navIdx + 1} / {navIds.length}</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Editar datos */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Editar Datos" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre(s)"
              value={editForm.first_name}
              onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
            />
            <Input
              label="Apellido(s)"
              value={editForm.last_name}
              onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Sexo"
              value={editForm.sex}
              onChange={(e) => setEditForm({ ...editForm, sex: e.target.value })}
              options={[
                { value: "", label: "Sin especificar" },
                { value: "male", label: "Masculino" },
                { value: "female", label: "Femenino" },
              ]}
            />
            <Input
              label="Tipo de Sangre"
              value={editForm.blood_type}
              onChange={(e) => setEditForm({ ...editForm, blood_type: e.target.value })}
              placeholder="Ej: A+, O-"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Teléfono"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
            <Input
              label="Fecha de Nacimiento"
              type="date"
              value={editForm.date_of_birth ? editForm.date_of_birth.slice(0, 10) : ""}
              onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
            />
          </div>
          <Input
            label="Dirección"
            value={editForm.address}
            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Notas Médicas</label>
            <textarea
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              rows={3}
              value={editForm.medical_notes}
              onChange={(e) => setEditForm({ ...editForm, medical_notes: e.target.value })}
              placeholder="Alergias, condiciones, medicamentos..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button variant="sky" isLoading={isSaving} onClick={handleSaveEdit}>Guardar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Cambiar Grupo */}
      <Modal isOpen={isGroupOpen} onClose={() => setIsGroupOpen(false)} title="Cambiar Grupo">
        <div className="space-y-4">
          {currentGroup && (
            <p className="text-xs text-text-muted">
              Solo se muestran grupos de {currentGroup.grade}° grado.
            </p>
          )}
          <Select
            label="Grupo"
            placeholder={currentGroup ? `${currentGroup.grade}° grado` : "Seleccionar grupo"}
            options={
              (currentGroup
                ? groupsRes.filter((g) => g.type !== "taller" && g.grade === currentGroup.grade)
                : groupsRes.filter((g) => g.type !== "taller")
              ).map((g) => ({
                value: g._id,
                label: `${g.grade}° ${g.section} — ${g.shift === "matutino" ? "Matutino" : "Vespertino"}`,
              }))
            }
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsGroupOpen(false)}>Cancelar</Button>
            <Button variant="sky" disabled={!selectedGroupId} isLoading={isAssigningGroup} onClick={handleAssignGroup}>Asignar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Asignar Taller */}
      <Modal isOpen={isTallerOpen} onClose={() => setIsTallerOpen(false)} title="Asignar Taller">
        <div className="space-y-4">
          {currentGroup && (
            <p className="text-xs text-text-muted">
              Solo se muestran talleres de {currentGroup.grade}° grado.
            </p>
          )}
          <Select
            label="Taller"
            placeholder={currentGroup ? `${currentGroup.grade}° grado` : "Seleccionar taller"}
            options={[
              { value: "", label: "Sin taller" },
              ...(currentGroup
                ? (Array.isArray(talleresRes) ? talleresRes : []).filter((g) => g.grade === currentGroup.grade)
                : (Array.isArray(talleresRes) ? talleresRes : [])
              ).map((g) => ({
                value: g._id,
                label: `${g.grade}° ${g.section}`,
              })),
            ]}
            value={selectedTallerId}
            onChange={(e) => setSelectedTallerId(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsTallerOpen(false)}>Cancelar</Button>
            <Button variant="sky" isLoading={isAssigningTaller} onClick={handleAssignTaller}>Asignar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Editar / Agregar Tutor.
          Modo EDIT (editingGuardianId set): solo el form, sin tabs.
          Modo ADD (editingGuardianId null): tabs
            - "Vincular existente": búsqueda reactiva por nombre o
              teléfono, click en un resultado llama
              POST /api/guardians/:id/students { student_ids }
              (aditivo, no pisa datos del tutor).
            - "Registrar nuevo": el form manual que ya existía. */}
      <Modal
        isOpen={isTutorOpen}
        onClose={() => {
          setIsTutorOpen(false);
          setEditingGuardianId(null);
          setTutorFormError(null);
          setExistingGuardianSearch("");
          setExistingGuardianResults([]);
        }}
        title={editingGuardianId ? "Editar Tutor" : "Agregar Tutor"}
      >
        {tutorFormError && (
          <div className="p-3 rounded-xl border border-error/30 bg-error/5 text-sm text-error mb-4">
            {tutorFormError}
          </div>
        )}
        {/* Tabs solo en modo ADD */}
        {!editingGuardianId && (
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-4">
            <button
              type="button"
              onClick={() => {
                setTutorModalTab("existing");
                setTutorFormError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                tutorModalTab === "existing"
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Users size={14} />
              Vincular existente
            </button>
            <button
              type="button"
              onClick={() => {
                setTutorModalTab("new");
                setTutorFormError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                tutorModalTab === "new"
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <UserPlus size={14} />
              Registrar nuevo
            </button>
          </div>
        )}

        {/* Tab: Vincular tutor existente */}
        {!editingGuardianId && tutorModalTab === "existing" && (
          <div className="space-y-3">
            <Input
              placeholder="Buscar por nombre, apellido o teléfono"
              icon={<Search size={16} />}
              autoFocus
              value={existingGuardianSearch}
              onChange={(e) => setExistingGuardianSearch(e.target.value)}
            />
            <div className="max-h-80 overflow-y-auto space-y-2">
              {isExistingGuardianSearching && (
                <p className="text-sm text-text-muted text-center py-4">Buscando…</p>
              )}
              {!isExistingGuardianSearching && existingGuardianSearch.trim().length === 0 && (
                <p className="text-sm text-text-muted text-center py-4">
                  Escribe al menos 2 caracteres (o 10 dígitos) para buscar un tutor ya registrado en la escuela.
                </p>
              )}
              {!isExistingGuardianSearching &&
                existingGuardianSearch.trim().length > 0 &&
                existingGuardianSearch.trim().length < 2 && (
                  <p className="text-sm text-text-muted text-center py-4">
                    Escribe al menos 2 caracteres para buscar.
                  </p>
                )}
              {!isExistingGuardianSearching &&
                existingGuardianSearch.trim().length >= 2 &&
                existingGuardianResults.length === 0 && (
                  <p className="text-sm text-text-muted text-center py-4">
                    Sin coincidencias. Cambia al tab "Registrar nuevo" para crear al tutor a mano.
                  </p>
                )}
              {existingGuardianResults.map((g) => (
                <button
                  key={g._id}
                  type="button"
                  disabled={isLinkingGuardian}
                  onClick={() => linkExistingGuardianToStudent(g)}
                  className="w-full text-left p-3 rounded-xl border border-border hover:border-accent hover:bg-accent/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-text-primary truncate">
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
            <div className="flex justify-end pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsTutorOpen(false);
                  setEditingGuardianId(null);
                  setTutorFormError(null);
                  setExistingGuardianSearch("");
                  setExistingGuardianResults([]);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Tab: Registrar nuevo / modo EDIT (form manual) */}
        {(editingGuardianId || tutorModalTab === "new") && (
          <div className="space-y-4">
            <Input
              label="Nombre(s)"
              value={tutorForm.name}
              onChange={(e) => setTutorForm({ ...tutorForm, name: e.target.value })}
            />
            <Input
              label="Apellido(s)"
              value={tutorForm.lastname}
              onChange={(e) => setTutorForm({ ...tutorForm, lastname: e.target.value })}
            />
            <Input
              label="Teléfono"
              value={tutorForm.phone}
              onChange={(e) => setTutorForm({ ...tutorForm, phone: e.target.value })}
              placeholder="10 digitos"
            />
            <Select
              label="Parentesco"
              value={tutorForm.relationship}
              onChange={(e) => setTutorForm({ ...tutorForm, relationship: e.target.value })}
              options={[
                { value: "madre", label: "Madre" },
                { value: "padre", label: "Padre" },
                { value: "abuelo", label: "Abuelo/a" },
                { value: "tutor legal", label: "Tutor legal" },
                { value: "otro", label: "Otro..." },
              ]}
            />
            {tutorForm.relationship === "otro" && (
              <Input
                label="Especifica el parentesco"
                value={customRelationship}
                onChange={(e) => setCustomRelationship(e.target.value)}
                placeholder="Ej: Tio, Hermano, etc."
              />
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsTutorOpen(false);
                  setEditingGuardianId(null);
                  setTutorFormError(null);
                }}
              >
                Cancelar
              </Button>
              <Button variant="sky" isLoading={isSavingTutor} onClick={handleSaveTutor}>
                Guardar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm: Dar de Baja */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Dar de Baja">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            ¿Estás seguro de que quieres dar de baja a <strong>{student.first_name} {student.last_name}</strong> de este ciclo?
            El alumno permanecerá en el sistema pero no aparecerá como inscrito.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" isLoading={isDeleting} onClick={handleDeleteEnrollment}>Dar de Baja</Button>
          </div>
        </div>
      </Modal>

      {/* Crop: Foto del alumno */}
      <PhotoCropModal
        isOpen={isCropOpen}
        file={pendingPhotoFile}
        onCancel={handlePhotoCropCancel}
        onConfirm={handlePhotoCropConfirm}
      />
    </div>
  );
}
