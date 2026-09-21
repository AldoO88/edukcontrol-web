// Página de Calendario Escolar (SchoolCalendar)
// CRUD de días festivos, vacaciones, suspensiones y días no lectivos.
// El cronjob de auto-ausencias consulta este modelo antes de marcar
// faltas para saber si un día es lectivo.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { SchoolCalendarEntry } from "@/lib/types";
import { Calendar, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Tipo labels para mostrar al usuario
const TYPE_LABELS: Record<SchoolCalendarEntry["type"], string> = {
  holiday: "Festivo",
  vacation: "Vacaciones",
  suspension: "Suspensión",
  non_lectivo: "No lectivo",
};

// Colores por tipo (mismos del sistema de diseño)
const TYPE_COLORS: Record<
  SchoolCalendarEntry["type"],
  { bg: string; text: string; dot: string }
> = {
  holiday: { bg: "bg-rose-100", text: "text-rose-700", dot: "bg-rose-500" },
  vacation: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  suspension: { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500" },
  non_lectivo: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-500" },
};

const calendarSchema = z.object({
  date: z.string().min(1, "Fecha requerida"),
  type: z.enum(["holiday", "vacation", "suspension", "non_lectivo"], {
    errorMap: () => ({ message: "Selecciona un tipo" }),
  }),
  name: z.string().max(120, "Máximo 120 caracteres").optional(),
});

type CalendarFormData = z.infer<typeof calendarSchema>;

export default function CalendarPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;

  const [entries, setEntries] = useState<SchoolCalendarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<SchoolCalendarEntry | null>(
    null
  );
  const [deletingEntry, setDeletingEntry] = useState<SchoolCalendarEntry | null>(
    null
  );
  const [filterType, setFilterType] = useState<string>("all");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CalendarFormData>({
    resolver: zodResolver(calendarSchema),
    defaultValues: { date: "", type: "holiday", name: "" },
  });

  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append("school_year_id", yearId);
      if (filterType !== "all") params.append("type", filterType);
      const res = await api.get<{
        items: SchoolCalendarEntry[];
        total: number;
      }>(`${ENDPOINTS.SCHOOL_CALENDAR}?${params.toString()}`);
      setEntries(res.items || []);
    } catch {
      // Error silencioso
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearId, filterType]);

  const openCreateModal = () => {
    setEditingEntry(null);
    reset({
      date: new Date().toISOString().slice(0, 10),
      type: "holiday",
      name: "",
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (entry: SchoolCalendarEntry) => {
    setEditingEntry(entry);
    const dateStr = new Date(entry.date).toISOString().slice(0, 10);
    reset({
      date: dateStr,
      type: entry.type,
      name: entry.name || "",
    });
    setError(null);
    setIsModalOpen(true);
  };

  const onSubmit = async (data: CalendarFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      if (editingEntry) {
        // Update — el backend solo permite type/name/is_active.
        // Para cambiar la fecha hay que eliminar y crear de nuevo.
        await api.put(`${ENDPOINTS.SCHOOL_CALENDAR}/${editingEntry._id}`, {
          type: data.type,
          name: data.name || null,
        });
      } else {
        // Create
        await api.post(ENDPOINTS.SCHOOL_CALENDAR, {
          school: schoolId,
          school_year_id: yearId,
          date: data.date,
          type: data.type,
          name: data.name || null,
        });
      }
      setIsModalOpen(false);
      setEditingEntry(null);
      fetchEntries();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar el registro"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingEntry) return;
    try {
      await api.delete(`${ENDPOINTS.SCHOOL_CALENDAR}/${deletingEntry._id}`);
      setDeletingEntry(null);
      fetchEntries();
    } catch (err) {
      console.error("Error deleting calendar entry:", err);
      setDeletingEntry(null);
    }
  };

  // Formatear fecha para mostrar
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // Agrupar por mes para mejor UX
  const groupedByMonth = entries.reduce<
    Record<string, SchoolCalendarEntry[]>
  >((acc, entry) => {
    const d = new Date(entry.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const sortedMonths = Object.keys(groupedByMonth).sort();
  const monthLabel = (key: string) => {
    const [year, month] = key.split("-");
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendario Escolar"
        subtitle="Días festivos, vacaciones, suspensiones y no lectivos (afectan el cron de ausencias)."
        action={{
          label: "Nuevo Día",
          onClick: openCreateModal,
        }}
      />

      {/* Filtros por tipo */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterType("all")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filterType === "all"
              ? "bg-accent text-white"
              : "bg-slate-100 text-text-secondary hover:bg-slate-200"
          }`}
        >
          Todos
        </button>
        {(Object.keys(TYPE_LABELS) as Array<keyof typeof TYPE_LABELS>).map(
          (type) => {
            const colors = TYPE_COLORS[type];
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filterType === type
                    ? `${colors.bg} ${colors.text} ring-2 ring-current`
                    : "bg-slate-100 text-text-secondary hover:bg-slate-200"
                }`}
              >
                {TYPE_LABELS[type]}
              </button>
            );
          }
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-error-light text-error text-sm">
          {error}
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyState
          icon={<Calendar size={48} />}
          title="No hay días configurados"
          description="Marca los días festivos, vacaciones y suspensiones del ciclo escolar. Esto evita que el cron de ausencias marque faltas esos días."
          action={{
            label: "Agregar Primer Día",
            onClick: openCreateModal,
          }}
        />
      ) : (
        <div className="space-y-6">
          {sortedMonths.map((monthKey) => {
            const monthEntries = groupedByMonth[monthKey];
            return (
              <div key={monthKey}>
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
                  {monthLabel(monthKey)}
                </h3>
                <div className="space-y-2">
                  {monthEntries.map((entry) => {
                    const colors = TYPE_COLORS[entry.type];
                    return (
                      <Card key={entry._id}>
                        <CardBody className="!p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-slate-50 shrink-0">
                                <span className="text-xs text-text-secondary uppercase font-medium">
                                  {new Date(entry.date)
                                    .toLocaleDateString("es-MX", {
                                      month: "short",
                                    })
                                    .replace(".", "")}
                                </span>
                                <span className="text-2xl font-bold text-text-primary leading-none">
                                  {new Date(entry.date).getDate()}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}
                                  >
                                    {TYPE_LABELS[entry.type]}
                                  </span>
                                </div>
                                {entry.name && (
                                  <p className="font-medium text-text-primary truncate">
                                    {entry.name}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => openEditModal(entry)}
                                className="p-2 rounded-lg hover:bg-slate-100 text-text-secondary hover:text-accent-dark transition-colors"
                                title="Editar"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => setDeletingEntry(entry)}
                                className="p-2 rounded-lg hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de crear/editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEntry ? "Editar Día" : "Nuevo Día"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-error-light text-error text-sm">
              {error}
            </div>
          )}

          <Input
            label="Fecha"
            type="date"
            error={errors.date?.message}
            disabled={!!editingEntry}
            {...register("date")}
          />
          {editingEntry && (
            <p className="text-xs text-text-secondary -mt-2">
              Para cambiar la fecha, elimina este registro y crea uno nuevo.
            </p>
          )}

          <Select
            label="Tipo"
            options={[
              { value: "holiday", label: "Festivo (día feriado oficial)" },
              { value: "vacation", label: "Vacaciones (receso escolar)" },
              { value: "suspension", label: "Suspensión (clima, seguridad, etc.)" },
              { value: "non_lectivo", label: "No lectivo (fin de semana especial)" },
            ]}
            error={errors.type?.message}
            {...register("type")}
          />

          <Input
            label="Nombre descriptivo (opcional)"
            placeholder="Día de muertos, Vacaciones de Navidad..."
            error={errors.name?.message}
            {...register("name")}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="sky" isLoading={isSubmitting}>
              {editingEntry ? "Guardar cambios" : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm dialog de eliminar */}
      <ConfirmDialog
        isOpen={!!deletingEntry}
        onClose={() => setDeletingEntry(null)}
        onConfirm={handleDelete}
        title="Eliminar día"
        message={`¿Estás seguro de eliminar "${
          deletingEntry?.name ||
          TYPE_LABELS[deletingEntry?.type || "holiday"]
        }" del ${deletingEntry ? formatDate(deletingEntry.date) : ""}?`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />
    </div>
  );
}
