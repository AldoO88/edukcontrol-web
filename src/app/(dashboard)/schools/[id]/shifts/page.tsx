// Página de Turnos a nivel Escuela
// Muestra las plantillas de turnos (ShiftTemplate) — sin ciclo escolar.
// CRUD completo: crear, editar, eliminar plantillas.

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
import type { ShiftTemplate, TimeBlock } from "@/lib/types";
import { Clock, Search, ChevronLeft, Pencil, Trash2, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const shiftSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(60),
  shift: z.enum(["matutino", "vespertino"]),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:mm"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:mm"),
  moduleDurationMinutes: z.coerce.number().min(5).max(240),
  gracePeriodMinutes: z.coerce.number().min(0).max(120),
});

type ShiftFormData = z.infer<typeof shiftSchema>;

const SHIFT_OPTIONS = [
  { value: "matutino", label: "Matutino" },
  { value: "vespertino", label: "Vespertino" },
];

export default function SchoolShiftsPage() {
  const params = useParams();
  const schoolId = params.id as string;

  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Time blocks state (managed outside react-hook-form due to dynamic array)
  const [timeBlocks, setTimeBlocks] = useState<(TimeBlock & { _id?: string })[]>([]);
  const [blockName, setBlockName] = useState("");
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockIsBreak, setBlockIsBreak] = useState(false);
  const [editingBlockIdx, setEditingBlockIdx] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: { shift: "matutino", moduleDurationMinutes: 50, gracePeriodMinutes: 30 },
  });

  const fetchTemplates = async () => {
    try {
      const res = await api.get<{ items: ShiftTemplate[] }>(ENDPOINTS.SHIFT_TEMPLATES);
      setTemplates(res.items || []);
    } catch {
      setError("Error al cargar las plantillas de turnos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [schoolId]);

  const openCreateModal = () => {
    setEditingTemplate(null);
    reset({ shift: "matutino", moduleDurationMinutes: 50, gracePeriodMinutes: 30 });
    setTimeBlocks([]);
    setBlockName("");
    setBlockStart("");
    setBlockEnd("");
    setBlockIsBreak(false);
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (template: ShiftTemplate) => {
    setEditingTemplate(template);
    reset({
      name: template.name,
      shift: template.shift,
      startTime: template.startTime,
      endTime: template.endTime,
      moduleDurationMinutes: template.moduleDurationMinutes,
      gracePeriodMinutes: template.gracePeriodMinutes,
    });
    setTimeBlocks(template.timeBlocks.map((b) => ({ ...b })));
    setBlockName("");
    setBlockStart("");
    setBlockEnd("");
    setBlockIsBreak(false);
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const addBlock = () => {
    if (!blockName.trim() || !blockStart || !blockEnd) return;
    if (editingBlockIdx !== null) {
      // Editar bloque existente
      const updated = [...timeBlocks];
      updated[editingBlockIdx] = {
        ...updated[editingBlockIdx],
        name: blockName.trim(),
        startTime: blockStart,
        endTime: blockEnd,
        isBreak: blockIsBreak,
      };
      setTimeBlocks(updated);
      setEditingBlockIdx(null);
    } else {
      // Agregar nuevo bloque
      const newBlock = {
        _id: `local_${Date.now()}`,
        name: blockName.trim(),
        startTime: blockStart,
        endTime: blockEnd,
        isBreak: blockIsBreak,
        order: timeBlocks.length,
      };
      setTimeBlocks([...timeBlocks, newBlock]);
    }
    setBlockName("");
    setBlockStart("");
    setBlockEnd("");
    setBlockIsBreak(false);
  };

  const editBlock = (idx: number) => {
    const block = timeBlocks[idx];
    setEditingBlockIdx(idx);
    setBlockName(block.name);
    setBlockStart(block.startTime);
    setBlockEnd(block.endTime);
    setBlockIsBreak(block.isBreak);
  };

  const cancelEditBlock = () => {
    setEditingBlockIdx(null);
    setBlockName("");
    setBlockStart("");
    setBlockEnd("");
    setBlockIsBreak(false);
  };

  const removeBlock = (idx: number) => {
    setTimeBlocks(timeBlocks.filter((_, i) => i !== idx));
  };

  const onSubmit = async (data: ShiftFormData) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const body = {
        ...data,
        name: data.name.trim(),
        startTime: data.startTime.trim(),
        endTime: data.endTime.trim(),
        timeBlocks: timeBlocks.map((b, i) => ({
          name: b.name,
          startTime: b.startTime,
          endTime: b.endTime,
          isBreak: b.isBreak,
          order: i,
        })),
        school: schoolId,
      };

      if (editingTemplate) {
        await api.put(`${ENDPOINTS.SHIFT_TEMPLATES}/${editingTemplate._id}`, body);
      } else {
        await api.post(ENDPOINTS.SHIFT_TEMPLATES, body);
      }
      await fetchTemplates();
      setIsModalOpen(false);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : editingTemplate
            ? "Error al actualizar el turno"
            : "Error al crear el turno"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (template: ShiftTemplate) => {
    if (!confirm(`¿Eliminar la plantilla "${template.name}"?`)) return;
    try {
      await api.delete(`${ENDPOINTS.SHIFT_TEMPLATES}/${template._id}`);
      await fetchTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando turnos..." height="page" />;
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
    return t.name.toLowerCase().includes(searchQuery.toLowerCase());
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
        title="Turnos"
        subtitle={`${templates.length} plantilla${templates.length !== 1 ? "s" : ""} de turno${templates.length !== 1 ? "s" : ""}`}
        action={{ label: "Nuevo Turno", onClick: openCreateModal }}
      />

      {templates.length > 0 && (
        <Card>
          <CardBody>
            <Input
              placeholder="Buscar por nombre..."
              icon={<Search size={18} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </CardBody>
        </Card>
      )}

      {templates.length === 0 ? (
        <EmptyState
          icon={<Clock size={48} />}
          title="No hay turnos configurados"
          description="Crea plantillas de turnos para definir la jornada escolar."
          action={{ label: "Nuevo Turno", onClick: openCreateModal }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={48} />}
          title="Sin resultados"
          description="No se encontraron turnos con ese criterio."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => (
            <Card key={template._id} className="hover:shadow-md transition-shadow">
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-xl shrink-0">
                      <Clock size={18} className="text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-text-primary truncate">
                        {template.name}
                      </h3>
                      <p className="text-sm text-text-secondary">
                        {template.startTime} — {template.endTime}
                      </p>
                    </div>
                  </div>
                  <Badge variant={template.isActive ? "emerald" : "rose"}>
                    {template.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-text-muted">
                  <span className="capitalize">{template.shift}</span>
                  <span>•</span>
                  <span>{template.moduleDurationMinutes} min/módulo</span>
                  <span>•</span>
                  <span>{template.timeBlocks?.length || 0} bloques</span>
                  <span>•</span>
                  <span>Gracia: {template.gracePeriodMinutes} min</span>
                </div>
                <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-divider">
                  <button
                    onClick={() => openEditModal(template)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-text-muted hover:text-accent-dark transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(template)}
                    className="p-1.5 rounded-lg hover:bg-error-light text-text-muted hover:text-error transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar Turno */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTemplate ? "Editar Turno" : "Nuevo Turno"}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {submitError && (
            <div className="p-3 rounded-xl bg-error-light text-error text-sm">
              {submitError}
            </div>
          )}

          <Input
            label="Nombre"
            placeholder="Turno Matutino"
            error={errors.name?.message}
            {...register("name")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Turno"
              options={SHIFT_OPTIONS}
              {...register("shift")}
            />
            <div />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Hora Inicio"
              type="time"
              error={errors.startTime?.message}
              {...register("startTime")}
            />
            <Input
              label="Hora Fin"
              type="time"
              error={errors.endTime?.message}
              {...register("endTime")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duración Módulo (min)"
              type="number"
              error={errors.moduleDurationMinutes?.message}
              {...register("moduleDurationMinutes")}
            />
            <Input
              label="Tiempo de Gracia (min)"
              type="number"
              error={errors.gracePeriodMinutes?.message}
              {...register("gracePeriodMinutes")}
            />
          </div>

          {/* Time Blocks */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-primary">Bloques de Tiempo</label>
            {timeBlocks.length > 0 && (
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border">
                      <th className="text-left px-3 py-2 font-semibold text-text-primary">Nombre</th>
                      <th className="text-left px-3 py-2 font-semibold text-text-primary">Inicio</th>
                      <th className="text-left px-3 py-2 font-semibold text-text-primary">Fin</th>
                      <th className="text-left px-3 py-2 font-semibold text-text-primary">Tipo</th>
                      <th className="w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeBlocks.map((block, idx) => (
                      <tr key={block._id || idx} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-2 text-text-primary">{block.name}</td>
                        <td className="px-3 py-2 text-text-secondary">{block.startTime}</td>
                        <td className="px-3 py-2 text-text-secondary">{block.endTime}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            block.isBreak ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
                          }`}>
                            {block.isBreak ? "Receso" : "Módulo"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => editBlock(idx)}
                              className="p-1 rounded-lg hover:bg-sky-100 text-text-muted hover:text-sky-600 transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeBlock(idx)}
                              className="p-1 rounded-lg hover:bg-error-light text-text-muted hover:text-error transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="grid grid-cols-[1fr_120px_120px_auto_auto] gap-2 items-end">
              <Input
                label="Nombre"
                placeholder="Módulo 1"
                value={blockName}
                onChange={(e) => setBlockName(e.target.value)}
              />
              <Input
                label="Inicio"
                type="time"
                value={blockStart}
                onChange={(e) => setBlockStart(e.target.value)}
              />
              <Input
                label="Fin"
                type="time"
                value={blockEnd}
                onChange={(e) => setBlockEnd(e.target.value)}
              />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-primary">Receso</label>
                <button
                  type="button"
                  onClick={() => setBlockIsBreak(!blockIsBreak)}
                  className={`w-9 h-5 rounded-full transition-colors ${
                    blockIsBreak ? "bg-amber-500" : "bg-slate-300"
                  }`}
                >
                  <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${
                    blockIsBreak ? "translate-x-4.5" : "translate-x-0.5"
                  }`} />
                </button>
              </div>
              <Button
                type="button"
                variant={editingBlockIdx !== null ? "outline" : "sky"}
                size="sm"
                onClick={addBlock}
                disabled={!blockName.trim() || !blockStart || !blockEnd}
              >
                {editingBlockIdx !== null ? "Guardar" : <Plus size={16} />}
              </Button>
              {editingBlockIdx !== null && (
                <Button type="button" variant="ghost" size="sm" onClick={cancelEditBlock}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="sky" isLoading={isSubmitting}>
              {editingTemplate ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
