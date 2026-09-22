// Página de Materias a nivel Escuela
// Lista todas las materias del catálogo de la escuela (no depende de ciclo escolar).
// Permite agregar materias con color e icono personalizados.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Subject } from "@/lib/types";
import {
  getSubjectIcon,
  ICON_OPTIONS,
  ICON_MAP,
  SUBJECT_COLORS,
  hexToRgba,
} from "@/lib/subjectIcons";
import { BookOpen, Search, ChevronLeft, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const subjectSchema = z.object({
  code: z.string().min(1, "Código requerido").max(20),
  name: z.string().min(1, "Nombre requerido").max(100),
  grade: z.string().optional(),
  educationalLevel: z.enum(["BASIC", "UPPER_SECONDARY", "HIGHER"]),
  classificationType: z.string().optional(),
  description: z.string().optional(),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

const LEVEL_OPTIONS = [
  { value: "BASIC", label: "Básico" },
  { value: "UPPER_SECONDARY", label: "Secundaria Superior" },
  { value: "HIGHER", label: "Superior" },
];

const CLASS_OPTIONS = [
  { value: "DISCIPLINE", label: "Disciplina" },
  { value: "WORKSHOP", label: "Taller" },
  { value: "UAC", label: "UAC" },
  { value: "KNOWLEDGE_AREA", label: "Área de Conocimiento" },
  { value: "PROFESSIONAL_COMPONENT", label: "Componente Profesional" },
];

const GRADE_OPTIONS = [
  { value: "", label: "Sin grado" },
  { value: "1", label: "1°" },
  { value: "2", label: "2°" },
  { value: "3", label: "3°" },
  { value: "4", label: "4°" },
  { value: "5", label: "5°" },
  { value: "6", label: "6°" },
];

export default function SchoolSubjectsPage() {
  const params = useParams();
  const schoolId = params.id as string;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { educationalLevel: "BASIC" },
  });

  const fetchSubjects = async () => {
    try {
      const res = await api.get<{ items: Subject[] }>(ENDPOINTS.SUBJECTS);
      setSubjects(res.items || []);
    } catch {
      setError("Error al cargar las materias.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [schoolId]);

  const openModal = () => {
    reset({ educationalLevel: "BASIC" });
    setSelectedColor(null);
    setSelectedIcon(null);
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const onSubmit = async (data: SubjectFormData) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await api.post(ENDPOINTS.SUBJECTS, {
        ...data,
        code: data.code.toUpperCase().trim(),
        grade: data.grade ? Number(data.grade) : null,
        classificationType: data.classificationType || "DISCIPLINE",
        color: selectedColor,
        icon: selectedIcon,
        school: schoolId,
      });
      await fetchSubjects();
      setIsModalOpen(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al crear la materia");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando materias..." height="page" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error"
        message={error}
        action={{ label: "Reintentar", onClick: fetchSubjects }}
      />
    );
  }

  const filtered = subjects.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q)
    );
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
        title="Materias"
        subtitle={`${subjects.length} materia${subjects.length !== 1 ? "s" : ""} en el catálogo`}
        action={{ label: "Nueva Materia", onClick: openModal }}
      />

      {subjects.length > 0 && (
        <Card>
          <CardBody>
            <Input
              placeholder="Buscar por nombre o código..."
              icon={<Search size={18} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </CardBody>
        </Card>
      )}

      {subjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={48} />}
          title="No hay materias registradas"
          description="Agrega materias al catálogo de la escuela."
          action={{ label: "Nueva Materia", onClick: openModal }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={48} />}
          title="Sin resultados"
          description="No se encontraron materias con ese criterio."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((subject) => {
            const Icon = getSubjectIcon(subject.icon);
            const color = subject.color || "#EF4444";
            return (
              <Card key={subject._id}>
                <CardBody>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                        style={{ backgroundColor: hexToRgba(color, 0.1) }}
                      >
                        <Icon size={18} style={{ color }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-text-primary truncate">
                          {subject.name}
                        </h3>
                        <p className="text-sm text-text-secondary">
                          {subject.code}
                        </p>
                      </div>
                    </div>
                    <Badge variant={subject.isActive ? "emerald" : "rose"}>
                      {subject.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  {subject.grade && (
                    <p className="text-xs text-text-muted mt-2">
                      Grado {subject.grade}°
                    </p>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Nueva Materia */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nueva Materia"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {submitError && (
            <div className="p-3 rounded-xl bg-error-light text-error text-sm">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Código"
              placeholder="MAT-101"
              error={errors.code?.message}
              {...register("code")}
            />
            <Input
              label="Nombre"
              placeholder="Matemáticas"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Nivel Educativo"
              options={LEVEL_OPTIONS}
              {...register("educationalLevel")}
            />
            <Select
              label="Grado"
              options={GRADE_OPTIONS}
              {...register("grade")}
            />
          </div>

          <Select
            label="Clasificación"
            options={CLASS_OPTIONS}
            {...register("classificationType")}
          />

          {/* Color Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-primary">Color</label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.label}
                  onClick={() => setSelectedColor(selectedColor === c.hex ? null : c.hex)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    selectedColor === c.hex
                      ? "border-text-primary scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          {/* Icon Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-primary">Icono</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((name) => {
                const Icon = ICON_MAP[name];
                const isActive = selectedIcon === name;
                const previewColor = selectedColor || "#EF4444";
                return (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => setSelectedIcon(isActive ? null : name)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                      isActive
                        ? "ring-2 ring-offset-1"
                        : "hover:bg-slate-100"
                    }`}
                    style={
                      isActive
                        ? { backgroundColor: hexToRgba(previewColor, 0.15), boxShadow: `0 0 0 2px ${previewColor}` }
                        : undefined
                    }
                  >
                    <Icon
                      size={18}
                      style={{ color: isActive ? previewColor : "#64748B" }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          {(selectedColor || selectedIcon) && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-border">
              <span className="text-xs text-text-muted">Vista previa:</span>
              <div
                className="flex items-center justify-center w-9 h-9 rounded-lg"
                style={{
                  backgroundColor: hexToRgba(selectedColor || "#EF4444", 0.1),
                }}
              >
                {(() => {
                  const PreviewIcon = getSubjectIcon(selectedIcon);
                  return (
                    <PreviewIcon
                      size={18}
                      style={{ color: selectedColor || "#EF4444" }}
                    />
                  );
                })()}
              </div>
              <span className="text-sm font-medium text-text-primary">
                Materia
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="sky" isLoading={isSubmitting}>
              Crear
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
