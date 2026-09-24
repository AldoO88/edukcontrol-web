// Calendario Escolar — vista anual compacta (todos los meses en pantalla).
// Click en un día → modal con selector de rango para marcar períodos.

"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { SchoolCalendarEntry, SchoolYear } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];
const DAY_NAMES = ["D", "L", "M", "M", "J", "V", "S"];

const TYPE_LABELS: Record<SchoolCalendarEntry["type"], string> = {
  holiday: "Festivo",
  vacation: "Vacaciones",
  suspension: "Suspensión",
  non_lectivo: "No lectivo",
};

const TYPE_COLORS: Record<
  SchoolCalendarEntry["type"],
  { bg: string; text: string; border: string; cell: string }
> = {
  holiday: { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-300", cell: "bg-rose-400" },
  vacation: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", cell: "bg-amber-400" },
  suspension: { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-300", cell: "bg-violet-400" },
  non_lectivo: { bg: "bg-slate-200", text: "text-slate-600", border: "border-slate-300", cell: "bg-slate-400" },
};

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseDateKey(key: string): { year: number; month: number; day: number } {
  const [y, m, d] = key.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;

  const [entries, setEntries] = useState<SchoolCalendarEntry[]>([]);
  const [schoolYear, setSchoolYear] = useState<SchoolYear | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<SchoolCalendarEntry["type"]>("holiday");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [entryName, setEntryName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEntry, setEditingEntry] = useState<SchoolCalendarEntry | null>(null);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, SchoolCalendarEntry>();
    for (const e of entries) {
      map.set(e.date.slice(0, 10), e);
    }
    return map;
  }, [entries]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [yearRes, calRes] = await Promise.all([
        api.get<SchoolYear>(`${ENDPOINTS.SCHOOL_YEARS}/${yearId}`),
        api.get<{ items: SchoolCalendarEntry[] }>(
          `${ENDPOINTS.SCHOOL_CALENDAR}?school_year_id=${yearId}`
        ),
      ]);
      setSchoolYear(yearRes);
      setEntries(calRes.items || []);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [yearId]);

  const openAddModal = () => {
    setEditingEntry(null);
    setSelectedType("holiday");
    setDateFrom("");
    setDateTo("");
    setEntryName("");
    setIsModalOpen(true);
  };

  const openEditModal = (entry: SchoolCalendarEntry) => {
    setEditingEntry(entry);
    setSelectedType(entry.type);
    const d = entry.date.slice(0, 10);
    setDateFrom(d);
    setDateTo(d);
    setEntryName(entry.name || "");
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!dateFrom) return;
    setIsSubmitting(true);
    try {
      const endDate = dateTo || dateFrom;
      const { year: sy, month: sm, day: sd } = parseDateKey(dateFrom);
      const { year: ey, month: em, day: ed } = parseDateKey(endDate);

      if (editingEntry) {
        // Single day edit
        await api.put(`${ENDPOINTS.SCHOOL_CALENDAR}/${editingEntry._id}`, {
          type: selectedType,
          name: entryName || null,
        });
      } else {
        // Create entries for each day in range
        let cy = sy, cm = sm, cd = sd;
        while (cy < ey || (cy === ey && cm < em) || (cy === ey && cm === em && cd <= ed)) {
          const dateStr = toKey(cy, cm, cd);
          await api.post(ENDPOINTS.SCHOOL_CALENDAR, {
            school: schoolId,
            school_year_id: yearId,
            date: dateStr,
            type: selectedType,
            name: entryName || null,
          }).catch(() => {});
          cd++;
          if (cd > getDaysInMonth(cy, cm)) { cd = 1; cm++; if (cm > 11) { cm = 0; cy++; } }
        }
      }
      setIsModalOpen(false);
      fetchData();
    } catch {
      // silent
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEntry) return;
    try {
      await api.delete(`${ENDPOINTS.SCHOOL_CALENDAR}/${editingEntry._id}`);
      setIsModalOpen(false);
      fetchData();
    } catch {
      // silent
    }
  };

  // Determine year range from school year (parse dates without new Date to avoid UTC shift)
  const startYear = schoolYear ? parseDateKey(schoolYear.startDate.slice(0, 10)).year : new Date().getFullYear();
  const endYear = schoolYear ? parseDateKey(schoolYear.endDate.slice(0, 10)).year : startYear + 1;

  const startKey = schoolYear ? schoolYear.startDate.slice(0, 10) : "";
  const endKey = schoolYear ? schoolYear.endDate.slice(0, 10) : "";

  // Generate all months to display
  const months = useMemo(() => {
    const result: { year: number; month: number }[] = [];
    const { month: sm } = parseDateKey(schoolYear?.startDate?.slice(0, 10) || "2026-01-01");
    const { month: em } = parseDateKey(schoolYear?.endDate?.slice(0, 10) || "2026-12-31");
    for (let y = startYear; y <= endYear; y++) {
      const mStart = y === startYear ? sm : 0;
      const mEnd = y === endYear ? em : 11;
      for (let m = mStart; m <= mEnd; m++) {
        result.push({ year: y, month: m });
      }
    }
    return result;
  }, [startYear, endYear, schoolYear]);

  // Count by type
  const counts = useMemo(() => {
    const c: Record<string, number> = { holiday: 0, vacation: 0, suspension: 0, non_lectivo: 0 };
    for (const e of entries) c[e.type] = (c[e.type] || 0) + 1;
    return c;
  }, [entries]);

  if (isLoading) {
    return <LoadingState message="Cargando calendario..." height="page" />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Calendario Escolar"
        subtitle="Vista anual del ciclo. Haz click en un día para ver o editar su tipo."
        action={{ label: "Agregar Período", onClick: openAddModal, icon: <Plus size={16} /> }}
      />

      {/* Year calendar grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {months.map(({ year, month }) => (
          <div key={`${year}-${month}`} className="bg-white rounded-xl border border-border p-2">
            {/* Month header */}
            <div className="text-center mb-1">
              <span className="text-xs font-bold text-text-primary uppercase">
                {MONTH_NAMES[month]} {year}
              </span>
            </div>
            {/* Day name headers */}
            <div className="grid grid-cols-7 gap-px mb-0.5">
              {DAY_NAMES.map((d, i) => (
                <div key={i} className="text-center text-[9px] font-medium text-text-muted py-0.5">
                  {d}
                </div>
              ))}
            </div>
            {/* Day grid */}
            <div className="grid grid-cols-7 gap-px">
              {(() => {
                const daysInMonth = getDaysInMonth(year, month);
                const firstDay = getFirstDayOfMonth(year, month);
                const cells: (number | null)[] = [];
                for (let i = 0; i < firstDay; i++) cells.push(null);
                for (let d = 1; d <= daysInMonth; d++) cells.push(d);

                return cells.map((day, i) => {
                  if (day === null) return <div key={`e-${i}`} className="aspect-square" />;

                  const dateKey = toKey(year, month, day);
                  const entry = entriesByDate.get(dateKey);
                  const isStart = dateKey === startKey;
                  const isEnd = dateKey === endKey;
                  const isToday = dateKey === toKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

                  let cellClass = "aspect-square rounded flex items-center justify-center text-[10px] cursor-pointer transition-all ";
                  if (entry) {
                    cellClass += `${TYPE_COLORS[entry.type].cell} text-white font-bold `;
                  } else if (isStart || isEnd) {
                    cellClass += "bg-sky-500 text-white font-bold ";
                  } else if (isToday) {
                    cellClass += "ring-1 ring-sky-500 font-bold text-sky-700 ";
                  } else {
                    cellClass += "hover:bg-slate-100 text-text-secondary ";
                  }

                  return (
                    <button
                      key={dateKey}
                      onClick={() => entry ? openEditModal(entry) : undefined}
                      className={cellClass}
                      title={
                        entry
                          ? `${TYPE_LABELS[entry.type]}${entry.name ? `: ${entry.name}` : ""}`
                          : isStart
                          ? "Inicio de clases"
                          : isEnd
                          ? "Fin de clases"
                          : `${day} ${MONTH_NAMES[month]}`
                      }
                    >
                      {day}
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-sky-500" />
          <span className="text-xs text-text-secondary">Inicio/Fin</span>
        </div>
        {(Object.keys(TYPE_LABELS) as Array<keyof typeof TYPE_LABELS>).map((type) => {
          const colors = TYPE_COLORS[type];
          return (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${colors.cell}`} />
              <span className="text-xs text-text-secondary">
                {TYPE_LABELS[type]}
                {counts[type] > 0 && ` (${counts[type]})`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Add/Edit modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEntry ? "Editar Día" : "Agregar Período"}
      >
        <div className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Tipo de día
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TYPE_LABELS) as Array<keyof typeof TYPE_LABELS>).map((type) => {
                const colors = TYPE_COLORS[type];
                const isSelected = selectedType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? `${colors.bg} ${colors.border}`
                        : "border-border hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${colors.cell}`} />
                      <span className={`text-sm font-medium ${isSelected ? colors.text : "text-text-primary"}`}>
                        {TYPE_LABELS[type]}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Desde"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              label="Hasta"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom || undefined}
            />
          </div>

          <Input
            label="Nombre (opcional)"
            placeholder="Vacaciones de navidad, Día de muertos..."
            value={entryName}
            onChange={(e) => setEntryName(e.target.value)}
          />

          <div className="flex justify-between pt-2">
            {editingEntry && (
              <Button variant="danger" onClick={handleDelete}>
                <Trash2 size={14} className="mr-1" />
                Eliminar
              </Button>
            )}
            {!editingEntry && <div />}
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="sky" onClick={handleSave} isLoading={isSubmitting} disabled={!dateFrom}>
                {editingEntry ? "Guardar" : "Agregar"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
