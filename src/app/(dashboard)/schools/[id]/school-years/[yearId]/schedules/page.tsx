// Página de Horarios de Clases + Bulk Load

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type {
  ClassSchedule,
  Group,
  Subject,
  SchoolShift,
  ScheduleSlot,
} from "@/lib/types";
import { Calendar, Upload, CheckCircle2, XCircle } from "lucide-react";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAY_COLORS = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-purple-100 text-purple-700",
  "bg-teal-100 text-teal-700",
];

interface FlatSlot {
  key: string;
  dayOfWeek: number;
  subject: Subject | string;
  blockName: string;
  blockStart: string;
  blockEnd: string;
}

interface BulkItem {
  teacher_id: string;
  subject_id: string;
  group_id: string;
  classroom?: string;
  scheduleSlots: Array<{
    dayOfWeek: number;
    timeBlockRefs: string[];
  }>;
}

interface BulkResult {
  index: number;
  status: "ok" | "error";
  _id?: string;
  errors?: string[];
}

export default function SchedulesPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [shifts, setShifts] = useState<SchoolShift[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Bulk load state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [bulkSummary, setBulkSummary] = useState<{
    total: number;
    succeeded: number;
    failed: number;
  } | null>(null);

  const fetchData = async () => {
    try {
      const [schedulesRes, groupsRes, shiftsRes] = await Promise.all([
        api.get<ClassSchedule[]>(
          `${ENDPOINTS.CLASS_SCHEDULES}?school_year_id=${yearId}`
        ),
        api.get<Group[]>(`${ENDPOINTS.GROUPS}?school_year_id=${yearId}`),
        api.get<SchoolShift[]>(
          `${ENDPOINTS.SCHOOL_SHIFTS}?school_year_id=${yearId}`
        ),
      ]);
      setSchedules(schedulesRes);
      setGroups(groupsRes);
      setShifts(shiftsRes);
      if (groupsRes.length > 0) {
        setSelectedGroup(groupsRes[0]._id);
      }
    } catch {
      // Error silencioso
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearId]);

  const currentShift = shifts[0];

  const filteredSchedules = selectedGroup
    ? schedules.filter(
        (s) =>
          (s.group_id as Group)?._id === selectedGroup ||
          s.group_id === selectedGroup
      )
    : schedules;

  const flatSlots: FlatSlot[] = useMemo(() => {
    const out: FlatSlot[] = [];
    for (const schedule of filteredSchedules) {
      const subject = schedule.subject_id as Subject;
      for (const slot of schedule.scheduleSlots) {
        for (const ref of slot.timeBlockRefs) {
          const block = currentShift?.timeBlocks?.find((b) => b._id === ref);
          out.push({
            key: `${schedule._id}-${slot.dayOfWeek}-${ref}`,
            dayOfWeek: slot.dayOfWeek,
            subject,
            blockName: block?.name || "—",
            blockStart: block?.startTime || "",
            blockEnd: block?.endTime || "",
          });
        }
      }
    }
    return out;
  }, [filteredSchedules, currentShift]);

  const groupedByDay = DAYS.map((day, idx) => ({
    day,
    color: DAY_COLORS[idx],
    slots: flatSlots
      .filter((s) => s.dayOfWeek === idx + 1)
      .sort((a, b) => a.blockStart.localeCompare(b.blockStart)),
  }));

  // Bulk load — validate + submit
  const handleBulkSubmit = async () => {
    setBulkResults([]);
    setBulkSummary(null);

    // Parse JSON
    let items: BulkItem[];
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) {
        throw new Error("El JSON debe ser un array de asignaciones");
      }
      items = parsed;
    } catch (err) {
      setBulkResults([
        {
          index: 0,
          status: "error",
          errors: [
            err instanceof Error
              ? `JSON inválido: ${err.message}`
              : "JSON inválido",
          ],
        },
      ]);
      return;
    }

    if (!currentShift) {
      setBulkResults([
        {
          index: 0,
          status: "error",
          errors: [
            "No hay turno configurado para este ciclo. Configura el turno primero.",
          ],
        },
      ]);
      return;
    }

    setBulkSubmitting(true);
    try {
      const res = await api.post<{
        total: number;
        succeeded: number;
        failed: number;
        results: BulkResult[];
      }>(`${ENDPOINTS.CLASS_SCHEDULES}/bulk`, {
        school_year_id: yearId,
        school_shift_id: currentShift._id,
        items,
      });
      setBulkSummary({
        total: res.total,
        succeeded: res.succeeded,
        failed: res.failed,
      });
      setBulkResults(res.results || []);
      // Refresh schedules if any succeeded
      if (res.succeeded > 0) fetchData();
    } catch (err) {
      setBulkResults([
        {
          index: 0,
          status: "error",
          errors: [
            err instanceof Error
              ? err.message
              : "Error al enviar el batch",
          ],
        },
      ]);
    } finally {
      setBulkSubmitting(false);
    }
  };

  const closeBulk = () => {
    setBulkOpen(false);
    setBulkJson("");
    setBulkResults([]);
    setBulkSummary(null);
  };

  if (isLoading) {
    return <LoadingState message="Cargando..." height="page" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Horarios de Clases"
        subtitle="Visualización semanal y carga masiva desde el setup wizard"
        action={{
          label: "Carga Masiva (JSON)",
          onClick: () => setBulkOpen(true),
        }}
      />

      <div className="flex items-center gap-4">
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">Todos los grupos</option>
          {groups.map((g) => (
            <option key={g._id} value={g._id}>
              {g.grade}°{g.section}
            </option>
          ))}
        </select>
        {currentShift && (
          <span className="text-sm text-text-secondary">
            Horario: {currentShift.name}
          </span>
        )}
      </div>

      {flatSlots.length === 0 ? (
        <EmptyState
          icon={<Calendar size={48} />}
          title="No hay horarios configurados"
          description="Carga los horarios de clases usando la carga masiva (botón arriba) o desde la app móvil."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {groupedByDay.map(({ day, color, slots }) => (
            <Card key={day}>
              <CardBody>
                <div
                  className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold ${color} mb-3`}
                >
                  {day}
                </div>
                {slots.length === 0 ? (
                  <p className="text-xs text-text-muted">Sin clases</p>
                ) : (
                  <div className="space-y-2">
                    {slots.map((slot) => (
                      <div
                        key={slot.key}
                        className="p-2 bg-surface rounded-lg border border-gray-100"
                      >
                        <p className="text-xs font-medium text-text-primary">
                          {(typeof slot.subject === "object" &&
                            slot.subject?.name) ||
                            "Materia"}
                        </p>
                        <p className="text-[10px] text-text-muted mt-0.5">
                          {slot.blockStart} - {slot.blockEnd}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de carga masiva */}
      <Modal
        isOpen={bulkOpen}
        onClose={closeBulk}
        title="Carga Masiva de Horarios"
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sm text-sky-800">
            <p className="font-semibold mb-1">Formato esperado:</p>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{`[
  {
    "teacher_id": "65f...",
    "subject_id": "65f...",
    "group_id": "65f...",
    "classroom": "Aula 12",
    "scheduleSlots": [
      { "dayOfWeek": 1, "timeBlockRefs": ["65f..."] },
      { "dayOfWeek": 3, "timeBlockRefs": ["65f..."] }
    ]
  },
  ...
]`}
            </pre>
            <p className="mt-2 text-xs">
              <strong>dayOfWeek</strong>: 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb.
              <br />
              <strong>timeBlockRefs</strong>: array de IDs de bloques del turno.
              <br />
              <strong>teacher_id / subject_id / group_id</strong>: ObjectIds.
            </p>
          </div>

          <textarea
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
            placeholder='Pega aquí el array JSON...'
            className="w-full h-48 px-3 py-2 text-xs font-mono rounded-xl border border-border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
            spellCheck={false}
          />

          {bulkSummary && (
            <div className="p-3 rounded-xl border bg-emerald-50 border-emerald-200 text-sm">
              <p className="font-semibold text-emerald-800">
                Resumen: {bulkSummary.succeeded} éxito(s),{" "}
                {bulkSummary.failed} error(es) de {bulkSummary.total} totales.
              </p>
            </div>
          )}

          {bulkResults.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {bulkResults.map((r) => (
                <div
                  key={r.index}
                  className={`p-2 rounded-lg flex items-start gap-2 text-xs ${
                    r.status === "ok"
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-rose-50 text-rose-800"
                  }`}
                >
                  {r.status === "ok" ? (
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={14} className="shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">
                      #{r.index + 1}{" "}
                      {r.status === "ok"
                        ? `creado (${r._id?.slice(-6)})`
                        : "error"}
                    </p>
                    {r.errors && r.errors.length > 0 && (
                      <ul className="list-disc list-inside mt-0.5">
                        {r.errors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={closeBulk}>
              Cerrar
            </Button>
            <Button
              variant="sky"
              onClick={handleBulkSubmit}
              isLoading={bulkSubmitting}
            >
              <Upload size={16} className="mr-1.5" />
              Cargar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
