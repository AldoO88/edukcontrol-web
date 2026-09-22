// Página de Plantillas de Grupo a nivel Escuela
// CRUD de GroupTemplates (sin ciclo escolar).
// Al crear un SchoolYear, se clonan como Groups del año.

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
import type { GroupTemplate } from "@/lib/types";
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

const templateSchema = z.object({
  grade: z.string().min(1, "Grado requerido"),
  section: z.string().min(1, "Sección requerida"),
  shift: z.string().min(1, "Turno requerido"),
});

type TemplateFormData = z.infer<typeof templateSchema>;

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

  const [templates, setTemplates] = useState<GroupTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<GroupTemplate | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
  });

  const fetchTemplates = async () => {
    try {
      const res = await api.get<{ items: GroupTemplate[] }>(
        ENDPOINTS.GROUP_TEMPLATES
      );
      setTemplates(res.items || []);
    } catch {
      setError("Error al cargar las plantillas de grupo.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [schoolId]);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setSubmitError(null);
    reset({ grade: "", section: "", shift: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (tpl: GroupTemplate) => {
    setEditingTemplate(tpl);
    setSubmitError(null);
    reset({
      grade: String(tpl.grade),
      section: tpl.section,
      shift: tpl.shift,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: TemplateFormData) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const body = {
        grade: parseInt(data.grade, 10),
        section: data.section.toUpperCase().trim(),
        shift: data.shift,
        school: schoolId,
      };

      if (editingTemplate) {
        await api.put(ENDPOINTS.GROUP_TEMPLATE_BY_ID(editingTemplate._id), body);
      } else {
        await api.post(ENDPOINTS.GROUP_TEMPLATES, body);
      }
      setIsModalOpen(false);
      await fetchTemplates();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Error al guardar la plantilla.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <LoadingState message="Cargando plantillas de grupo..." height="page" />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Error"
        message={error}
        action={{ label: "Reintentar", onClick: fetchTemplates }}
      />
    );
  }

  const filtered = templates.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const label = `${t.grade}° ${t.section}`;
    return label.toLowerCase().includes(q);
  });

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
        title="Plantillas de Grupo"
        subtitle={`${templates.length} grupo${templates.length !== 1 ? "s" : ""} definido${templates.length !== 1 ? "s" : ""}`}
        action={{
          label: "Nuevo Grupo",
          onClick: openCreateModal,
          icon: <Plus size={18} />,
        }}
      />

      {templates.length > 0 && (
        <Card>
          <CardBody>
            <Input
              placeholder="Buscar por grado o sección..."
              icon={<Search size={18} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </CardBody>
        </Card>
      )}

      {templates.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={48} />}
          title="No hay plantillas de grupo"
          description="Crea los grupos que tendrá esta escuela. Al crear un ciclo escolar, se copiarán automáticamente."
          action={{
            label: "Crear Grupo",
            onClick: openCreateModal,
          }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={48} />}
          title="Sin resultados"
          description="No se encontraron plantillas con ese criterio."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tpl) => (
            <Card key={tpl._id} className="group relative">
              <button
                type="button"
                onClick={() => openEditModal(tpl)}
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
                      {tpl.grade}° {tpl.section}
                    </h3>
                    <p className="text-sm text-text-secondary capitalize">
                      {tpl.shift}
                    </p>
                    <div className="mt-2">
                      <Badge variant="slate">Regular</Badge>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTemplate ? "Editar Grupo" : "Nuevo Grupo"}
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

          <Select
            label="Turno"
            options={shiftOptions}
            error={errors.shift?.message}
            {...register("shift")}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="sky" isLoading={submitting}>
              {editingTemplate ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
