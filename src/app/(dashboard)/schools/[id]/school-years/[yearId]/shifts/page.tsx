// Página de Turnos / Campanas (scoped por ciclo escolar)
// CRUD completo con bloques de tiempo — misma funcionalidad que la página de escuela.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
import type { SchoolShift, TimeBlock } from "@/lib/types";
import { Clock, Pencil, Trash2, Plus, X } from "lucide-react";
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

export default function ShiftsPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;

  const [shifts, setShifts] = useState<SchoolShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<SchoolShift | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Time blocks state
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

  const fetchShifts = async () => {
    try {
      const res = await api.get<SchoolShift[]>(
        `${ENDPOINTS.SCHOOL_SHIFTS}?school_year_id=${yearId}`
      );
      setShifts(res || []);
    } catch {
      setError("Error al cargar los turnos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [yearId]);

  const openCreateModal = () => {
    setEditingShift(null);
    reset({ shift: "matutino", moduleDurationMinutes: 50, gracePeriodMinutes: 30 });
    setTimeBlocks([]);
    setBlockName("");
    setBlockStart("");
    setBlockEnd("");
    setBlockIsBreak(false);
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (shift: SchoolShift) => {
    setEditingShift(shift);
    reset({
      name: shift.name,
      shift: shift.shift,
      startTime: shift.startTime,
      endTime: shift.endTime,
      moduleDurationMinutes: shift.moduleDurationMinutes,
      gracePeriodMinutes: shift.gracePeriodMinutes,
    });
    setTimeBlocks(shift.timeBlocks.map((b) => ({ ...b })));
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
        school_year_id: yearId,
      };

      if (editingShift) {
        await api.put(`${ENDPOINTS.SCHOOL_SHIFTS}/${editingShift._id}`, body);
      } else {
        await api.post(ENDPOINTS.SCHOOL_SHIFTS, body);
      }
      await fetchShifts();
      setIsModalOpen(false);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : editingShift
            ? "Error al actualizar el turno"
            : "Error al crear el turno"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (shift: SchoolShift) => {
    if (!confirm(`¿Eliminar el turno "${shift.name}"?`)) return;
    try {
      await api.delete(`${ENDPOINTS.SCHOOL_SHIFTS}/${shift._id}`);
      await fetchShifts();
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
        action={{ label: "Reintentar", onClick: fetchShifts }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Turnos"
        subtitle={`${shifts.length} turno${shifts.length !== 1 ? "s" : ""} configurado${shifts.length !== 1 ? "s" : ""}`}
        action={{ label: "Nuevo Turno", onClick: openCreateModal }}
      />

      {shifts.length === 0 ? (
        <EmptyState
          icon={<Clock size={48} />}
          title="No hay turnos configurados"
          description="Crea turnos para definir la jornada escolar del ciclo."
          action={{ label: "Crear Turno", onClick: openCreateModal }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((shift) => (
            <Card key={shift._id} className="hover:shadow-md transition-shadow">
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-xl shrink-0">
                      <Clock size={18} className="text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-text-primary truncate">
                        {shift.name}
                      </h3>
                      <p className="text-sm text-text-secondary">
                        {shift.startTime} — {shift.endTime}
                      </p>
                    </div>
                  </div>
                  <Badge variant={shift.isActive ? "emerald" : "rose"}>
                    {shift.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-text-muted">
                  <span className="capitalize">{shift.shift}</span>
                  <span>•</span>
                  <span>{shift.moduleDurationMinutes} min/módulo</span>
                  <span>•</span>
                  <span>{shift.timeBlocks?.length || 0} bloques</span>
                  <span>•</span>
                  <span>Gracia: {shift.gracePeriodMinutes} min</span>
                </div>
                {/* Time blocks preview */}
                {shift.timeBlocks && shift.timeBlocks.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-divider">
                    <div className="flex flex-wrap gap-1">
                      {shift.timeBlocks.map((b, i) => (
                        <span
                          key={b._id || i}
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                            b.isBreak
                              ? "bg-amber-100 text-amber-700"
                              : "bg-sky-100 text-sky-700"
                          }`}
                        >
                          {b.name} ({b.startTime}-{b.endTime})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-divider">
                  <button
                    onClick={() => openEditModal(shift)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-text-muted hover:text-accent-dark transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(shift)}
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
        title={editingShift ? "Editar Turno" : "Nuevo Turno"}
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
                variant={editingBlockIdx !== null ? "secondary" : "sky"}
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
              {editingShift ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
