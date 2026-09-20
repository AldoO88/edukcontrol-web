// Página de Horarios de Clases

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { ClassSchedule, Group, Subject, SchoolShift, ScheduleSlot } from "@/lib/types";
import { Calendar } from "lucide-react";

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

export default function SchedulesPage() {
  const params = useParams();
  const yearId = params.yearId as string;
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [shifts, setShifts] = useState<SchoolShift[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [schedulesRes, groupsRes, shiftsRes] = await Promise.all([
          api.get<ClassSchedule[]>(`${ENDPOINTS.CLASS_SCHEDULES}?school_year_id=${yearId}`),
          api.get<Group[]>(`${ENDPOINTS.GROUPS}?school_year_id=${yearId}`),
          api.get<SchoolShift[]>(`${ENDPOINTS.SCHOOL_SHIFTS}?school_year_id=${yearId}`),
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
    }
    fetchData();
  }, []);

  const currentShift = shifts[0];

  const filteredSchedules = selectedGroup
    ? schedules.filter(
        (s) => (s.group_id as Group)?._id === selectedGroup || s.group_id === selectedGroup
      )
    : schedules;

  const flatSlots: FlatSlot[] = [];
  for (const schedule of filteredSchedules) {
    const subject = schedule.subject_id as Subject;
    for (const slot of schedule.scheduleSlots) {
      for (const ref of slot.timeBlockRefs) {
        const block = currentShift?.timeBlocks?.find((b) => b._id === ref);
        flatSlots.push({
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

  const groupedByDay = DAYS.map((day, idx) => ({
    day,
    color: DAY_COLORS[idx],
    slots: flatSlots
      .filter((s) => s.dayOfWeek === idx + 1)
      .sort((a, b) => a.blockStart.localeCompare(b.blockStart)),
  }));

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
        title="Horarios de Clases"
        subtitle="Visualización semanal de horarios"
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
          description="Configura los horarios de clases desde la app móvil o solicita al administrador."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {groupedByDay.map(({ day, color, slots }) => (
            <Card key={day}>
              <CardBody>
                <div className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold ${color} mb-3`}>
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
                          {(typeof slot.subject === 'object' && slot.subject?.name) || "Materia"}
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
    </div>
  );
}
