// Página de Materias a nivel Escuela
// Lista todas las materias agrupadas por macroCategoría.
// Permite crear y editar materias con color e icono personalizados.

"use client";

import { useEffect, useState, useMemo } from "react";
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
import { BookOpen, Search, ChevronLeft, Pencil, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const subjectSchema = z.object({
  code: z.string().min(1, "Código requerido").max(20),
  name: z.string().min(1, "Nombre requerido").max(100),
  grade: z.string().optional(),
  educationalLevel: z.enum(["BASIC", "UPPER_SECONDARY", "HIGHER"]),
  classificationType: z.string().optional(),
  macroCategory: z.string().optional(),
  isTutoria: z.boolean().optional(),
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

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [workshopName, setWorkshopName] = useState("");
  const [workshops, setWorkshops] = useState<{ name: string }[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { educationalLevel: "BASIC" },
  });

  const watchedClassification = watch("classificationType");

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

  const openCreateModal = () => {
    setEditingSubject(null);
    reset({ educationalLevel: "BASIC" });
    setSelectedColor(null);
    setSelectedIcon(null);
    setWorkshops([]);
    setWorkshopName("");
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (subject: Subject) => {
    setEditingSubject(subject);
    reset({
      code: subject.code,
      name: subject.name,
      grade: subject.grade ? String(subject.grade) : "",
      educationalLevel: (subject.educationalLevel as "BASIC" | "UPPER_SECONDARY" | "HIGHER") || "BASIC",
      classificationType: subject.classificationType || "",
      macroCategory: subject.macroCategory || "",
      isTutoria: subject.isTutoria || false,
      description: subject.description || "",
    });
    setSelectedColor(subject.color || null);
    setSelectedIcon(subject.icon || null);
    setWorkshops(subject.workshops || []);
    setWorkshopName("");
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const onSubmit = async (data: SubjectFormData) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const body = {
        ...data,
        code: data.code.toUpperCase().trim(),
        grade: data.grade ? Number(data.grade) : null,
        classificationType: data.classificationType || "DISCIPLINE",
        macroCategory: data.macroCategory || null,
        isTutoria: data.isTutoria || false,
        color: selectedColor,
        icon: selectedIcon,
        workshops: data.classificationType === "WORKSHOP" ? workshops : [],
      };

      if (editingSubject) {
        await api.put(`${ENDPOINTS.SUBJECTS}/${editingSubject._id}`, body);
      } else {
        await api.post(ENDPOINTS.SUBJECTS, { ...body, school: schoolId });
      }
      await fetchSubjects();
      setIsModalOpen(false);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : editingSubject
            ? "Error al actualizar la materia"
            : "Error al crear la materia"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Agrupar por macroCategory
  const grouped = useMemo(() => {
    const filtered = subjects.filter((s) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.macroCategory && s.macroCategory.toLowerCase().includes(q))
      );
    });

    const groups: Record<string, Subject[]> = {};
    for (const s of filtered) {
      const key = s.macroCategory || "Sin categoría";
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }
    // Ordenar categorías alfabétically, "Sin categoría" al final
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "Sin categoría") return 1;
      if (b === "Sin categoría") return -1;
      return a.localeCompare(b);
    });
    return sortedKeys.map((key) => ({ category: key, items: groups[key] }));
  }, [subjects, searchQuery]);

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
        action={{ label: "Nueva Materia", onClick: openCreateModal }}
      />

      {subjects.length > 0 && (
        <Card>
          <CardBody>
            <Input
              placeholder="Buscar por nombre, código o categoría..."
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
          action={{ label: "Nueva Materia", onClick: openCreateModal }}
        />
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={<Search size={48} />}
          title="Sin resultados"
          description="No se encontraron materias con ese criterio."
        />
      ) : (
        grouped.map(({ category, items }) => (
          <div key={category} className="space-y-3">
            <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
              {category}
              <span className="text-xs font-normal text-text-muted bg-slate-100 px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((subject) => {
                const Icon = getSubjectIcon(subject.icon);
                const color = subject.color || "#EF4444";
                return (
                  <Card key={subject._id} className="hover:shadow-md transition-shadow">
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
                            <h4 className="font-semibold text-text-primary truncate">
                              {subject.name}
                            </h4>
                            <p className="text-sm text-text-secondary">
                              {subject.code}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(subject)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-text-muted hover:text-accent-dark transition-colors"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <Badge variant={subject.isActive ? "emerald" : "rose"}>
                            {subject.isActive ? "Activa" : "Inactiva"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-text-muted">
                        {subject.grade && <span>Grado {subject.grade}°</span>}
                        {subject.isTutoria && (
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded-full">Tutoría</span>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Modal Nueva/Editar Materia */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSubject ? "Editar Materia" : "Nueva Materia"}
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

          {/* Talleres — solo si classificationType === "WORKSHOP" */}
          {watchedClassification === "WORKSHOP" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-text-primary">
                Talleres que ofrece esta materia
              </label>
              <p className="text-xs text-text-muted">
                Agrega los nombres de los talleres (ej. Electrónica, Informática)
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={workshopName}
                  onChange={(e) => setWorkshopName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const trimmed = workshopName.trim();
                      if (trimmed && !workshops.some((w) => w.name === trimmed.toUpperCase())) {
                        setWorkshops([...workshops, { name: trimmed.toUpperCase() }]);
                        setWorkshopName("");
                      }
                    }
                  }}
                  placeholder="Nombre del taller"
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
                <Button
                  type="button"
                  variant="sky"
                  size="sm"
                  onClick={() => {
                    const trimmed = workshopName.trim();
                    if (trimmed && !workshops.some((w) => w.name === trimmed.toUpperCase())) {
                      setWorkshops([...workshops, { name: trimmed.toUpperCase() }]);
                      setWorkshopName("");
                    }
                  }}
                  disabled={!workshopName.trim()}
                >
                  <Plus size={16} />
                </Button>
              </div>
              {workshops.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {workshops.map((w, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium"
                    >
                      {w.name}
                      <button
                        type="button"
                        onClick={() => setWorkshops(workshops.filter((_, i) => i !== idx))}
                        className="hover:text-amber-900"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <Input
            label="Macro Categoría"
            placeholder="Ej. Sociocognitivo, Formación integral..."
            {...register("macroCategory")}
          />

          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-text-primary">Es Tutoría</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                {...register("isTutoria")}
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>

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
                {editingSubject ? editingSubject.name : "Materia"}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="sky" isLoading={isSubmitting}>
              {editingSubject ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
