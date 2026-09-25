// Expediente del Alumno — Detalle dentro del ciclo escolar.
// Muestra datos personales, inscripción actual, historial y opciones de gestión.

"use client";

import { useEffect, useState } from "react";
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
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Student, Enrollment, Group } from "@/lib/types";
import {
  User,
  Phone,
  MapPin,
  Calendar,
  Heart,
  FileText,
  ArrowLeft,
  Edit,
  Wrench,
  Trash2,
} from "lucide-react";

// --- Types ---
interface StudentDetail {
  student: Student;
  currentEnrollment: Enrollment | null;
  currentGroup: Group | null;
  enrollments: Enrollment[];
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

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;
  const studentId = params.studentId as string;

  const [data, setData] = useState<StudentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ phone: "", address: "" });
  const [isSaving, setIsSaving] = useState(false);

  // Taller modal
  const [isTallerOpen, setIsTallerOpen] = useState(false);
  const [selectedTallerId, setSelectedTallerId] = useState("");
  const [isAssigningTaller, setIsAssigningTaller] = useState(false);

  // Delete enrollment
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const [studentRes, enrollmentsRes, groupsRes] = await Promise.all([
        api.get<Student>(`${ENDPOINTS.STUDENTS}/${studentId}`),
        api.get<Enrollment[]>(`${ENDPOINTS.STUDENTS}/${studentId}/enrollments`),
        api.get<Group[]>(`${ENDPOINTS.GROUPS}?school_year_id=${yearId}`),
      ]);

      const enrollList = Array.isArray(enrollmentsRes) ? enrollmentsRes : [];
      const currentEnrollment = enrollList.find((e) => {
        const yearIdStr = typeof e.school_year_id === "string" ? e.school_year_id : (e.school_year_id as any)?._id;
        return yearIdStr === yearId;
      }) || null;

      const currentGroupId = currentEnrollment && typeof currentEnrollment.group_id === "object"
        ? (currentEnrollment.group_id as any)._id
        : typeof currentEnrollment?.group_id === "string"
          ? currentEnrollment.group_id
          : null;
      const currentGroup = currentGroupId
        ? (groupsRes || []).find((g) => g._id === currentGroupId) || null
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

  const handleDeleteEnrollment = async () => {
    if (!data?.currentEnrollment) return;
    setIsDeleting(true);
    try {
      await api.delete(`${ENDPOINTS.ENROLLMENTS}/${data.currentEnrollment._id}`);
      setIsDeleteOpen(false);
      router.back();
    } catch {
      setError("Error al eliminar inscripción.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <LoadingState message="Cargando expediente..." height="page" />;
  if (error) return <ErrorState title="Error" message={error} action={{ label: "Reintentar", onClick: fetchData }} />;
  if (!data) return <ErrorState title="No encontrado" message="Alumno no encontrado." />;

  const { student, currentEnrollment, currentGroup, enrollments } = data;

  const tallerId = typeof student.workshop_group_id === "object"
    ? (student.workshop_group_id as any)?._id
    : student.workshop_group_id;
  const allGroups: Group[] = [];
  const taller = tallerId ? allGroups.find((g) => g._id === tallerId) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${student.first_name} ${student.last_name || ""}`}
        subtitle={`No. Control: ${student.controlNumber || "—"}`}
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
                    setEditForm({ phone: student.phone || "", address: student.address || "" });
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

          {/* Inscripción actual */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Inscripción Actual</h2>
                {currentEnrollment && (
                  <div className="flex gap-2">
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
              <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <User size={32} className="text-accent-dark" />
              </div>
              <h3 className="font-semibold text-text-primary">
                {student.first_name} {student.last_name}
              </h3>
              <p className="text-sm text-text-secondary font-mono">{student.controlNumber}</p>
              {currentGroup && (
                <p className="mt-2">
                  <Badge variant="sky">{currentGroup.grade}°{currentGroup.section}</Badge>
                </p>
              )}
              {taller && (
                <p className="mt-1">
                  <Badge variant="amber">{taller.grade}° {taller.section}</Badge>
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Modal: Editar datos */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Editar Datos">
        <div className="space-y-4">
          <Input
            label="Teléfono"
            value={editForm.phone}
            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
          />
          <Input
            label="Dirección"
            value={editForm.address}
            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button variant="sky" isLoading={isSaving} onClick={handleSaveEdit}>Guardar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Asignar Taller */}
      <Modal isOpen={isTallerOpen} onClose={() => setIsTallerOpen(false)} title="Asignar Taller">
        <div className="space-y-4">
          <Select
            label="Taller"
            placeholder="Seleccionar taller"
            options={[
              { value: "", label: "Sin taller" },
              ...(Array.isArray(allGroups) ? allGroups.filter((g) => g.type === "taller") : []).map((g) => ({
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
    </div>
  );
}
