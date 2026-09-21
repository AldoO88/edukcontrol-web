// Página de Maestros a nivel Escuela
// Lista TODOS los maestros de la escuela (activos e inactivos) para historial.
// Al clickear un maestro, abre modal con detalle y opción de editar.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { AcademicRecordTable } from "@/components/ui/AcademicRecordTable";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { User, AcademicRecord } from "@/lib/types";
import { Users, Search, Pencil, ChevronLeft } from "lucide-react";

type FilterStatus = "all" | "active" | "inactive";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
];

const SEX_OPTIONS = [
  { value: "", label: "No especificado" },
  { value: "male", label: "Masculino" },
  { value: "female", label: "Femenino" },
];

export default function SchoolTeachersPage() {
  const params = useParams();
  const schoolId = params.id as string;

  const [teachers, setTeachers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  // Modal states
  const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edit form states
  const [editName, setEditName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSex, setEditSex] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editAcademic, setEditAcademic] = useState<AcademicRecord[]>([]);

  const fetchTeachers = async () => {
    try {
      const res = await api.get<{ items: User[] }>(
        `${ENDPOINTS.DASHBOARD_TEACHERS(schoolId)}`
      );
      setTeachers(res.items || []);
    } catch {
      setError("Error al cargar los maestros.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [schoolId]);

  const openDetail = (teacher: User) => {
    setSelectedTeacher(teacher);
    setIsEditing(false);
    setSaveError(null);
    setEditName(teacher.name);
    setEditLastName(teacher.last_name || "");
    setEditPhone(teacher.phoneNumber);
    setEditEmail(teacher.email || "");
    setEditSex(teacher.sex || "");
    setEditActive(teacher.isActive);
    setEditAcademic(teacher.academicPreparation || []);
  };

  const closeModal = () => {
    setSelectedTeacher(null);
    setIsEditing(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!selectedTeacher) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await api.put<{ teacher: User }>(
        ENDPOINTS.DASHBOARD_UPDATE_TEACHER(schoolId, selectedTeacher._id),
        {
          name: editName,
          last_name: editLastName,
          phoneNumber: editPhone,
          email: editEmail || undefined,
          sex: editSex || undefined,
          isActive: editActive,
          academicPreparation: editAcademic,
        }
      );
      setTeachers((prev) =>
        prev.map((t) => (t._id === selectedTeacher._id ? updated.teacher : t))
      );
      setSelectedTeacher(updated.teacher);
      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando maestros..." height="page" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error"
        message={error}
        action={{ label: "Reintentar", onClick: fetchTeachers }}
      />
    );
  }

  const filtered = teachers.filter((t) => {
    const matchesSearch =
      searchQuery === "" ||
      `${t.name} ${t.last_name || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phoneNumber.includes(searchQuery) ||
      (t.email && t.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && t.isActive) ||
      (statusFilter === "inactive" && !t.isActive);

    return matchesSearch && matchesStatus;
  });

  const activeCount = teachers.filter((t) => t.isActive).length;
  const inactiveCount = teachers.length - activeCount;

  return (
    <div className="space-y-6">
      <Link
        href={`/schools/${schoolId}`}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-accent-dark transition-colors"
      >
        <ChevronLeft size={16} />
        Volver a Escuela
      </Link>

      <PageHeader
        title="Maestros"
        subtitle={`${teachers.length} registrado${teachers.length !== 1 ? "s" : ""} — ${activeCount} activo${activeCount !== 1 ? "s" : ""}, ${inactiveCount} inactivo${inactiveCount !== 1 ? "s" : ""}`}
        action={{
          label: "Registrar Maestro",
          href: `/schools/${schoolId}/teachers/new`,
        }}
      />

      {/* Filtros */}
      {teachers.length > 0 && (
        <Card>
          <CardBody>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por nombre, teléfono o email..."
                  icon={<Search size={18} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-40">
                <Select
                  options={STATUS_OPTIONS}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                />
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Lista */}
      {teachers.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="No hay maestros registrados"
          description="Registra maestros para poder asignarles materias y grupos en los ciclos escolares."
          action={{
            label: "Registrar Primer Maestro",
            href: `/schools/${schoolId}/teachers/new`,
          }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={48} />}
          title="Sin resultados"
          description="No se encontraron maestros con los filtros seleccionados."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((teacher) => (
            <button
              key={teacher._id}
              onClick={() => openDetail(teacher)}
              className="text-left"
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardBody>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-sky-100 rounded-xl shrink-0">
                      <span className="text-sky-600 font-bold text-lg">
                        {teacher.name.charAt(0)}{(teacher.last_name || "").charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-text-primary truncate">
                        {teacher.name} {teacher.last_name}
                      </h3>
                      <p className="text-sm text-text-secondary">
                        {teacher.phoneNumber}
                      </p>
                      {teacher.email && (
                        <p className="text-xs text-text-muted truncate">
                          {teacher.email}
                        </p>
                      )}
                      <div className="mt-1.5">
                        <Badge variant={teacher.isActive ? "emerald" : "rose"}>
                          {teacher.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {teacher.academicPreparation && teacher.academicPreparation.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {teacher.academicPreparation.slice(0, 2).map((prep, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600"
                        >
                          {prep.type}
                        </span>
                      ))}
                      {teacher.academicPreparation.length > 2 && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          +{teacher.academicPreparation.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* Modal de Detalle/Edición */}
      <Modal
        isOpen={!!selectedTeacher}
        onClose={closeModal}
        title={isEditing ? "Editar Maestro" : "Detalle del Maestro"}
        size="lg"
      >
        {selectedTeacher && (
          <div className="space-y-4">
            {saveError && (
              <div className="p-3 rounded-xl bg-error-light text-error text-sm">
                {saveError}
              </div>
            )}

            {/* Nombre */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-text-primary">Nombre(s)</label>
                {isEditing ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                ) : (
                  <p className="text-text-secondary mt-1">{selectedTeacher.name}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-semibold text-text-primary">Apellido(s)</label>
                {isEditing ? (
                  <Input
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                  />
                ) : (
                  <p className="text-text-secondary mt-1">{selectedTeacher.last_name || "—"}</p>
                )}
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label className="text-sm font-semibold text-text-primary">Teléfono</label>
              {isEditing ? (
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              ) : (
                <p className="text-text-secondary mt-1">{selectedTeacher.phoneNumber}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-semibold text-text-primary">Email</label>
              {isEditing ? (
                <Input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              ) : (
                <p className="text-text-secondary mt-1">{selectedTeacher.email || "—"}</p>
              )}
            </div>

            {/* Sexo */}
            <div>
              <label className="text-sm font-semibold text-text-primary">Sexo</label>
              {isEditing ? (
                <Select
                  options={SEX_OPTIONS}
                  value={editSex}
                  onChange={(e) => setEditSex(e.target.value)}
                />
              ) : (
                <p className="text-text-secondary mt-1">
                  {selectedTeacher.sex === "male"
                    ? "Masculino"
                    : selectedTeacher.sex === "female"
                      ? "Femenino"
                      : "No especificado"}
                </p>
              )}
            </div>

            {/* Preparación Académica */}
            {isEditing ? (
              <AcademicRecordTable
                value={editAcademic}
                onChange={setEditAcademic}
              />
            ) : (
              <AcademicRecordTable
                value={selectedTeacher.academicPreparation || []}
                onChange={() => {}}
                readonly
              />
            )}

            {/* Estado */}
            <div>
              <label className="text-sm font-semibold text-text-primary">Estado</label>
              {isEditing ? (
                <div className="flex items-center gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setEditActive(!editActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      editActive ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-text-secondary">
                    {editActive ? "Activo" : "Inactivo"}
                  </span>
                </div>
              ) : (
                <div className="mt-1">
                  <Badge variant={selectedTeacher.isActive ? "emerald" : "rose"}>
                    {selectedTeacher.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-divider">
              {isEditing ? (
                <>
                  <Button variant="ghost" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                  <Button variant="sky" onClick={handleSave} isLoading={isSaving}>
                    Guardar
                  </Button>
                </>
              ) : (
                <Button
                  variant="sky"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil size={16} className="mr-1.5" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
