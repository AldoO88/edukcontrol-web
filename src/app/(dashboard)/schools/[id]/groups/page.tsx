// Página de Grupos a nivel Escuela
// Lista todos los grupos de la escuela, permite crear/editar.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Group, SchoolYear } from "@/lib/types";
import {
  ClipboardList,
  Search,
  ChevronLeft,
  Plus,
  Pencil,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const groupSchema = z.object({
  grade: z.string().min(1, "Grado requerido"),
  section: z.string().min(1, "Sección requerida"),
  shift: z.string().min(1, "Turno requerido"),
  school_year_id: z.string().min(1, "Ciclo escolar requerido"),
});

type GroupFormData = z.infer<typeof groupSchema>;

const gradeOptions = [
  { value: "", label: "Seleccionar grado" },
  { value: "1", label: "1°" },
  { value: "2", label: "2°" },
  { value: "3", label: "3°" },
];

const shiftOptions = [
  { value: "", label: "Seleccionar turno" },
  { value: "matutino", label: "Matutino" },
  { value: "vespertino", label: "Vespertino" },
];

export default function SchoolGroupsPage() {
  const params = useParams();
  const schoolId = params.id as string;

  const [groups, setGroups] = useState<Group[]>([]);
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GroupFormData>({
    resolver: zodResolver(groupSchema),
  });

  const fetchData = async () => {
    try {
      const [groupsRes, yearsRes] = await Promise.all([
        api.get<{ items: Group[] }>(
          yearFilter
            ? `${ENDPOINTS.DASHBOARD_GROUPS(schoolId)}?yearId=${yearFilter}`
            : ENDPOINTS.DASHBOARD_GROUPS(schoolId)
        ),
        api.get<{ items: SchoolYear[] }>(
          `${ENDPOINTS.SCHOOL_YEARS}?school=${schoolId}`
        ),
      ]);
      setGroups(groupsRes.items || []);
      setYears(yearsRes.items || []);
    } catch {
      setError("Error al cargar los grupos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolId, yearFilter]);

  const openCreateModal = () => {
    setEditingGroup(null);
    setSubmitError(null);
    const activeYear = years.find((y) => y.isActive);
    reset({
      grade: "",
      section: "",
      shift: "",
      school_year_id: activeYear?._id || "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (group: Group) => {
    setEditingGroup(group);
    setSubmitError(null);
    const yearId =
      typeof group.school_year_id === "object"
        ? group.school_year_id._id
        : group.school_year_id;
    reset({
      grade: String(group.grade),
      section: group.section,
      shift: group.shift,
      school_year_id: yearId,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: GroupFormData) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const body = {
        grade: parseInt(data.grade, 10),
        section: data.section.toUpperCase().trim(),
        shift: data.shift,
        school_year_id: data.school_year_id,
        type: "regular",
      };

      if (editingGroup) {
        await api.put(
          ENDPOINTS.DASHBOARD_UPDATE_GROUP(schoolId, editingGroup._id),
          body
        );
      } else {
        await api.post(ENDPOINTS.DASHBOARD_CREATE_GROUP(schoolId), body);
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Error al guardar el grupo.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando grupos..." height="page" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error"
        message={error}
        action={{ label: "Reintentar", onClick: fetchData }}
      />
    );
  }

  const filtered = groups.filter((g) => {
    if (g.type === "taller") return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const gradeStr = `${g.grade}° ${g.section}`;
    return gradeStr.toLowerCase().includes(q);
  });

  const yearOptions = [
    { value: "", label: "Todos los ciclos" },
    ...years.map((y) => ({ value: y._id, label: y.name })),
  ];

  const modalYearOptions = years.map((y) => ({
    value: y._id,
    label: `${y.name}${y.isActive ? " (activo)" : ""}`,
  }));

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
        title="Grupos"
        subtitle={`${groups.length} grupo${groups.length !== 1 ? "s" : ""}`}
        action={{
          label: "Nuevo Grupo",
          onClick: openCreateModal,
          icon: <Plus size={18} />,
        }}
      />

      {groups.length > 0 && (
        <Card>
          <CardBody>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por grado o sección..."
                  icon={<Search size={18} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  options={yearOptions}
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                />
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {groups.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={48} />}
          title="No hay grupos registrados"
          description="Crea el primer grupo para esta escuela."
          action={{
            label: "Crear Grupo",
            onClick: openCreateModal,
          }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={48} />}
          title="Sin resultados"
          description="No se encontraron grupos con ese criterio."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((group) => {
            const yearName =
              typeof group.school_year_id === "object"
                ? group.school_year_id.name
                : "";
            return (
              <Card key={group._id} className="group relative">
                <button
                  type="button"
                  onClick={() => openEditModal(group)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-100 text-text-muted hover:text-accent-dark transition-all cursor-pointer"
                >
                  <Pencil size={14} />
                </button>
                <CardBody>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-violet-100 rounded-xl shrink-0">
                      <ClipboardList size={18} className="text-violet-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-text-primary truncate">
                        {group.grade}° {group.section}
                      </h3>
                      <p className="text-sm text-text-secondary capitalize">
                        {group.shift}
                      </p>
                      {yearName && (
                        <p className="text-xs text-text-muted mt-1">
                          {yearName}
                        </p>
                      )}
                      <div className="mt-2">
                        <Badge
                          variant={group.type === "taller" ? "amber" : "slate"}
                        >
                          {group.type === "taller" ? "Taller" : "Regular"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGroup ? "Editar Grupo" : "Nuevo Grupo"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {submitError && (
            <div className="px-4 py-3 bg-error-light text-error rounded-lg text-sm">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Grado"
              options={gradeOptions}
              error={errors.grade?.message}
              {...register("grade")}
            />
            <Input
              label="Sección"
              placeholder="A, B, C..."
              error={errors.section?.message}
              {...register("section")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Turno"
              options={shiftOptions}
              error={errors.shift?.message}
              {...register("shift")}
            />
            <Select
              label="Ciclo Escolar"
              options={modalYearOptions}
              error={errors.school_year_id?.message}
              {...register("school_year_id")}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="sky" isLoading={submitting}>
              {editingGroup ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
