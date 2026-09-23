// Página de Calendario Escolar — vista mensual tipo cuadrícula.
// Click en un día → modal para marcar festivo, vacaciones, suspensión, etc.

"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingState } from "@/components/ui/LoadingState";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { SchoolCalendarEntry } from "@/lib/types";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const TYPE_LABELS: Record<SchoolCalendarEntry["type"], string> = {
  holiday: "Festivo",
  vacation: "Vacaciones",
  suspension: "Suspensión",
  non_lectivo: "No lectivo",
};

const TYPE_COLORS: Record<
  SchoolCalendarEntry["type"],
  { bg: string; text: string; border: string }
> = {
  holiday: { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-300" },
  vacation: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300" },
  suspension: { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-300" },
  non_lectivo: { bg: "bg-slate-200", text: "text-slate-600", border: "border-slate-300" },
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function CalendarPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;

  const [entries, setEntries] = useState<SchoolCalendarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedType, setSelectedType] = useState<SchoolCalendarEntry["type"]>("holiday");
  const [selectedName, setSelectedName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingEntry, setExistingEntry] = useState<SchoolCalendarEntry | null>(null);

  // Build lookup: date key → entry
  const entriesByDate = useMemo(() => {
    const map = new Map<string, SchoolCalendarEntry>();
    for (const e of entries) {
      const key = new Date(e.date).toISOString().slice(0, 10);
      map.set(key, e);
    }
    return map;
  }, [entries]);

  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ items: SchoolCalendarEntry[] }>(
        `${ENDPOINTS.SCHOOL_CALENDAR}?school_year_id=${yearId}`
      );
      setEntries(res.items || []);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [yearId]);

  const openDayModal = (dateKey: string) => {
    setSelectedDate(dateKey);
    const existing = entriesByDate.get(dateKey);
    if (existing) {
      setExistingEntry(existing);
      setSelectedType(existing.type);
      setSelectedName(existing.name || "");
    } else {
      setExistingEntry(null);
      setSelectedType("holiday");
      setSelectedName("");
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      if (existingEntry) {
        // Update type/name
        await api.put(`${ENDPOINTS.SCHOOL_CALENDAR}/${existingEntry._id}`, {
          type: selectedType,
          name: selectedName || null,
        });
      } else {
        // Create
        await api.post(ENDPOINTS.SCHOOL_CALENDAR, {
          school: schoolId,
          school_year_id: yearId,
          date: selectedDate,
          type: selectedType,
          name: selectedName || null,
        });
      }
      setIsModalOpen(false);
      fetchEntries();
    } catch {
      // silent
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingEntry) return;
    try {
      await api.delete(`${ENDPOINTS.SCHOOL_CALENDAR}/${existingEntry._id}`);
      setIsModalOpen(false);
      fetchEntries();
    } catch {
      // silent
    }
  };

  const prevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const { year, month } = currentMonth;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [currentMonth]);

  const monthLabel = new Date(currentMonth.year, currentMonth.month, 1).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });

  // Count by type for legend
  const counts = useMemo(() => {
    const c: Record<string, number> = { holiday: 0, vacation: 0, suspension: 0, non_lectivo: 0 };
    for (const e of entries) c[e.type] = (c[e.type] || 0) + 1;
    return c;
  }, [entries]);

  if (isLoading) {
    return <LoadingState message="Cargando calendario..." height="page" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendario Escolar"
        subtitle="Haz click en un día para marcarlo como festivo, vacaciones, suspensión o no lectivo."
      />

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-4 sm:p-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft size={20} className="text-text-secondary" />
          </button>
          <h3 className="text-lg font-semibold text-text-primary capitalize">
            {monthLabel}
          </h3>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ChevronRight size={20} className="text-text-secondary" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              className="text-center text-xs font-semibold text-text-muted py-2"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="aspect-square" />;
            }

            const dateKey = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const entry = entriesByDate.get(dateKey);
            const colors = entry ? TYPE_COLORS[entry.type] : null;
            const isToday = dateKey === toKey(new Date());

            return (
              <button
                key={dateKey}
                onClick={() => openDayModal(dateKey)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all relative ${
                  entry
                    ? `${colors!.bg} ${colors!.text} font-semibold border ${colors!.border}`
                    : "hover:bg-slate-100 text-text-primary"
                } ${isToday ? "ring-2 ring-sky-500" : ""}`}
              >
                <span>{day}</span>
                {entry && (
                  <span className="text-[9px] leading-none mt-0.5 truncate max-w-full px-0.5">
                    {TYPE_LABELS[entry.type]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.keys(TYPE_LABELS) as Array<keyof typeof TYPE_LABELS>).map((type) => {
          const colors = TYPE_COLORS[type];
          return (
            <div key={type} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${colors.bg} border ${colors.border}`} />
              <span className="text-sm text-text-secondary">
                {TYPE_LABELS[type]}
                {counts[type] > 0 && (
                  <span className="ml-1 text-text-muted">({counts[type]})</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Day modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={existingEntry ? "Editar Día" : "Marcar Día"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Fecha
            </label>
            <p className="text-sm text-text-secondary">
              {selectedDate &&
                parseKey(selectedDate).toLocaleDateString("es-MX", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Tipo de día
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TYPE_LABELS) as Array<keyof typeof TYPE_LABELS>).map(
                (type) => {
                  const colors = TYPE_COLORS[type];
                  const isSelected = selectedType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? `${colors.bg} ${colors.border} border-2`
                          : "border-border hover:border-slate-300"
                      }`}
                    >
                      <span
                        className={`text-sm font-medium ${
                          isSelected ? colors.text : "text-text-primary"
                        }`}
                      >
                        {TYPE_LABELS[type]}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <Input
            label="Nombre (opcional)"
            placeholder="Día de muertos, Vacaciones navidad..."
            value={selectedName}
            onChange={(e) => setSelectedName(e.target.value)}
          />

          <div className="flex justify-between pt-2">
            {existingEntry ? (
              <Button variant="danger" onClick={handleDelete}>
                <Trash2 size={14} className="mr-1" />
                Eliminar
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="sky" onClick={handleSave} isLoading={isSubmitting}>
                {existingEntry ? "Guardar" : "Marcar"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
