// Página de Horarios de Clases

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type {
  ClassSchedule,
  Group,
  Subject,
  SchoolShift,
  TeacherSubject,
  User,
} from "@/lib/types";
import { Calendar, Plus, Trash2, Pencil } from "lucide-react";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const DAY_COLORS = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-purple-100 text-purple-700",
];

interface FlatSlot {
  key: string;
  dayOfWeek: number;
  subject: Subject | string;
  teacher: string;
  blockName: string;
  blockStart: string;
  blockEnd: string;
  scheduleId: string;
  schedule: ClassSchedule;
  isTallerTecnologia: boolean;
  rowSpan: number;
  allBlockIds: string[];
}

export default function SchedulesPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const yearId = params.yearId as string;
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [shifts, setShifts] = useState<SchoolShift[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Add schedule modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    group_id: "",
    subject_id: "",
    teacher_id: "",
    classroom: "",
  });
  const [selectedBlocks, setSelectedBlocks] = useState<Record<number, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit schedule modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [editForm, setEditForm] = useState({
    teacher_id: "",
    classroom: "",
  });
  const [editSelectedBlocks, setEditSelectedBlocks] = useState<Record<number, string[]>>({});
  const [editError, setEditError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [schedulesRes, groupsRes, shiftsRes, tsRes] = await Promise.all([
        api.get<ClassSchedule[]>(
          `${ENDPOINTS.CLASS_SCHEDULES}?school_year_id=${yearId}`
        ),
        api.get<Group[]>(`${ENDPOINTS.GROUPS}?school_year_id=${yearId}`),
        api.get<SchoolShift[]>(
          `${ENDPOINTS.SCHOOL_SHIFTS}?school_year_id=${yearId}`
        ),
        api.get<{ items: TeacherSubject[]; total: number }>(
          `${ENDPOINTS.TEACHER_SUBJECTS}?school_year_id=${yearId}`
        ),
      ]);
      setSchedules(schedulesRes);
      setGroups(groupsRes);
      setShifts(shiftsRes);
      setTeacherSubjects(tsRes.items || []);

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

  // Filtrar por grupo seleccionado (incluye talleres)
  const filteredSchedules = selectedGroup
    ? schedules.filter(
        (s) => {
          const gId = typeof s.group_id === "object" ? (s.group_id as Group)._id : s.group_id;
          // Direct match
          if (gId === selectedGroup) return true;
          // For Tecnología: include taller schedules of the same grade
          const selectedGrp = groups.find((g) => g._id === selectedGroup);
          if (!selectedGrp || selectedGrp.type === "taller") return false;
          const tallerGroup = typeof s.group_id === "object" ? s.group_id as Group : groups.find((g) => g._id === gId);
          if (!tallerGroup || tallerGroup.type !== "taller" || tallerGroup.grade !== selectedGrp.grade) return false;
          const subject = s.subject_id as Subject;
          const subjectName = subject?.name?.toLowerCase() || "";
          return subjectName.includes("tecnolog") || subject?.code?.toLowerCase()?.includes("tec");
        }
      )
    : schedules;

  const flatSlots: FlatSlot[] = useMemo(() => {
    const out: FlatSlot[] = [];
    const seenTecnologia = new Set<string>();
    for (const schedule of filteredSchedules) {
      const subject = schedule.subject_id as Subject;
      const teacher = schedule.teacher_id as User;
      const group = schedule.group_id as Group;
      const isTallerTecnologia = group?.type === "taller" && (subject?.name?.toLowerCase()?.includes("tecnolog") || subject?.code?.toLowerCase()?.includes("tec"));
      for (const slot of schedule.scheduleSlots) {
        const sortedRefs = [...slot.timeBlockRefs].sort().join(",");
        const techKey = `${slot.dayOfWeek}-${sortedRefs}`;
        if (isTallerTecnologia) {
          if (seenTecnologia.has(techKey)) continue;
          seenTecnologia.add(techKey);
        }
        const sortedBlockIds = [...slot.timeBlockRefs].sort();
        const firstRef = sortedBlockIds[0];
        const lastRef = sortedBlockIds[sortedBlockIds.length - 1];
        const block = currentShift?.timeBlocks?.find((b) => b._id === firstRef);
        const lastBlock = currentShift?.timeBlocks?.find((b) => b._id === lastRef);
        out.push({
          key: `${schedule._id}-${slot.dayOfWeek}-${firstRef}`,
          dayOfWeek: slot.dayOfWeek,
          subject,
          teacher: isTallerTecnologia ? "Taller" : (teacher ? `${teacher.name} ${teacher.last_name || ""}`.trim() : "—"),
          blockName: block?.name || "—",
          blockStart: block?.startTime || "",
          blockEnd: lastBlock?.endTime || block?.endTime || "",
          scheduleId: schedule._id,
          schedule,
          isTallerTecnologia,
          rowSpan: sortedBlockIds.length,
          allBlockIds: sortedBlockIds,
        });
      }
    }
    return out;
  }, [filteredSchedules, currentShift]);

  // Grid data: dayOfWeek → blockId → FlatSlot | "skip"
  const gridData = useMemo(() => {
    const grid: Record<number, Record<string, FlatSlot | "skip">> = {};
    for (let d = 1; d <= 5; d++) grid[d] = {};
    for (const slot of flatSlots) {
      const firstRef = slot.allBlockIds[0];
      if (firstRef && !grid[slot.dayOfWeek][firstRef]) {
        grid[slot.dayOfWeek][firstRef] = slot;
        // Mark subsequent blocks as "skip"
        for (let i = 1; i < slot.allBlockIds.length; i++) {
          grid[slot.dayOfWeek][slot.allBlockIds[i]] = "skip";
        }
      }
    }
    return grid;
  }, [flatSlots]);

  // All time blocks sorted by order (including breaks)
  const gridRows = useMemo(() => {
    return (currentShift?.timeBlocks || [])
      .sort((a, b) => a.order - b.order);
  }, [currentShift]);

  // --- Add schedule logic ---
  const availableBlocks = useMemo(() => {
    return (currentShift?.timeBlocks || []).filter((b) => !b.isBreak);
  }, [currentShift]);

  // Filter teacher_subjects by selected group
  const tsForGroup = useMemo(() => {
    if (!addForm.group_id) return [];
    return teacherSubjects.filter((ts) => {
      const gId = typeof ts.group_id === "object" ? (ts.group_id as Group)._id : ts.group_id;
      return gId === addForm.group_id;
    });
  }, [teacherSubjects, addForm.group_id]);

  // Teacher subjects for taller groups of the same grade (for regular groups)
  const tsForTalleresOfGrade = useMemo(() => {
    if (!addForm.group_id) return [];
    const selectedGroup = groups.find((g) => g._id === addForm.group_id);
    if (!selectedGroup || selectedGroup.type === "taller") return [];
    const tallerGroupIds = groups
      .filter((g) => g.type === "taller" && g.grade === selectedGroup.grade)
      .map((g) => g._id);
    return teacherSubjects.filter((ts) => {
      const gId = typeof ts.group_id === "object" ? (ts.group_id as Group)._id : ts.group_id;
      return tallerGroupIds.includes(gId);
    });
  }, [teacherSubjects, addForm.group_id, groups]);

  // Unique subjects for the selected group (regular + taller subjects for that grade)
  const subjectsForGroup = useMemo(() => {
    if (!addForm.group_id) return [];
    const map = new Map<string, Subject>();
    // Subjects from the regular group itself
    for (const ts of tsForGroup) {
      const s = ts.subject_id as Subject;
      if (s && s._id && !map.has(s._id)) map.set(s._id, s);
    }
    // Subjects from taller groups of the same grade (e.g. Tecnología)
    for (const ts of tsForTalleresOfGrade) {
      const s = ts.subject_id as Subject;
      if (s && s._id && !map.has(s._id)) map.set(s._id, s);
    }
    return Array.from(map.values());
  }, [tsForGroup, tsForTalleresOfGrade, addForm.group_id]);

  // Detect Tecnología subject by name/code
  const tecnologiaSubjectId = useMemo(() => {
    const tech = subjectsForGroup.find(
      (s) => s.name?.toLowerCase().includes("tecnolog") || s.code?.toLowerCase().includes("tec")
    );
    return tech?._id || null;
  }, [subjectsForGroup]);

  const isTecnologia = addForm.subject_id === tecnologiaSubjectId;

  // Subject IDs already assigned to the selected group (to filter out)
  const assignedSubjectIds = useMemo(() => {
    if (!addForm.group_id) return new Set<string>();
    return new Set(
      schedules
        .filter((s) => {
          const gId = typeof s.group_id === "object" ? s.group_id._id : s.group_id;
          return gId === addForm.group_id;
        })
        .map((s) => (typeof s.subject_id === "object" ? s.subject_id._id : s.subject_id))
    );
  }, [schedules, addForm.group_id]);

  // Check if all taller groups have TeacherSubject for Tecnología
  const tecnologiaAssignmentsComplete = useMemo(() => {
    if (!addForm.group_id || !tecnologiaSubjectId) return false;
    const selectedGroup = groups.find((g) => g._id === addForm.group_id);
    if (!selectedGroup) return false;
    const tallerGroups = groups.filter((g) => g.type === "taller" && g.grade === selectedGroup.grade);
    return tallerGroups.every((tallerGroup) => {
      const teacherId = tallerGroup.head_teacher_id
        ? typeof tallerGroup.head_teacher_id === "object"
          ? tallerGroup.head_teacher_id._id
          : tallerGroup.head_teacher_id
        : null;
      if (!teacherId) return false;
      return teacherSubjects.some((ts) => {
        const gId = typeof ts.group_id === "object" ? ts.group_id._id : ts.group_id;
        const tId = typeof ts.teacher_id === "object" ? ts.teacher_id._id : ts.teacher_id;
        const sId = typeof ts.subject_id === "object" ? ts.subject_id._id : ts.subject_id;
        return gId === tallerGroup._id && tId === teacherId && sId === tecnologiaSubjectId;
      });
    });
  }, [addForm.group_id, groups, tecnologiaSubjectId, teacherSubjects]);

  // Subjects filtered: exclude already assigned
  const filteredSubjectsForGroup = useMemo(() => {
    return subjectsForGroup.filter((s) => {
      if (assignedSubjectIds.has(s._id)) return false;
      if (s._id === tecnologiaSubjectId && !tecnologiaAssignmentsComplete) return false;
      return true;
    });
  }, [subjectsForGroup, assignedSubjectIds, tecnologiaSubjectId, tecnologiaAssignmentsComplete]);

  // Taller groups of the same grade (used when creating Tecnología schedules)
  const tallerGroupsForGrade = useMemo(() => {
    if (!addForm.group_id || !isTecnologia) return [];
    const selectedGroup = groups.find((g) => g._id === addForm.group_id);
    if (!selectedGroup) return [];
    return groups.filter(
      (g) => g.type === "taller" && g.grade === selectedGroup.grade
    );
  }, [addForm.group_id, isTecnologia, groups]);

  // Teachers for the selected group + subject (includes taller teachers)
  const teachersForGroup = useMemo(() => {
    if (!addForm.group_id || !addForm.subject_id) return [];
    // Check if the subject belongs to a taller group
    const subjectInTaller = tsForTalleresOfGrade.some((ts) => {
      const sId = typeof ts.subject_id === "object" ? (ts.subject_id as Subject)._id : ts.subject_id;
      return sId === addForm.subject_id;
    });
    const source = subjectInTaller ? tsForTalleresOfGrade : tsForGroup;
    const filtered = source.filter((ts) => {
      const sId = typeof ts.subject_id === "object" ? (ts.subject_id as Subject)._id : ts.subject_id;
      return sId === addForm.subject_id;
    });
    const map = new Map<string, User>();
    for (const ts of filtered) {
      const t = ts.teacher_id as User;
      if (t && t._id && !map.has(t._id)) map.set(t._id, t);
    }
    return Array.from(map.values());
  }, [tsForGroup, tsForTalleresOfGrade, addForm.subject_id, addForm.group_id]);

  // Teachers available for the editing schedule's group + subject
  const editTeachersForSchedule = useMemo(() => {
    if (!editingSchedule) return [];
    const groupId = typeof editingSchedule.group_id === "object"
      ? editingSchedule.group_id._id
      : editingSchedule.group_id;
    const subjectId = typeof editingSchedule.subject_id === "object"
      ? editingSchedule.subject_id._id
      : editingSchedule.subject_id;

    const tsForEditGroup = teacherSubjects.filter((ts) => {
      const gId = typeof ts.group_id === "object" ? (ts.group_id as Group)._id : ts.group_id;
      return gId === groupId;
    });
    const editGroup = groups.find((g) => g._id === groupId);
    const tallerIds = editGroup
      ? groups.filter((g) => g.type === "taller" && g.grade === editGroup.grade).map((g) => g._id)
      : [];
    const tsForEditTalleres = teacherSubjects.filter((ts) => {
      const gId = typeof ts.group_id === "object" ? (ts.group_id as Group)._id : ts.group_id;
      return tallerIds.includes(gId);
    });

    const allTs = [...tsForEditGroup, ...tsForEditTalleres];
    const filtered = allTs.filter((ts) => {
      const sId = typeof ts.subject_id === "object" ? (ts.subject_id as Subject)._id : ts.subject_id;
      return sId === subjectId;
    });
    const map = new Map<string, User>();
    for (const ts of filtered) {
      const t = ts.teacher_id as User;
      if (t && t._id && !map.has(t._id)) map.set(t._id, t);
    }
    return Array.from(map.values());
  }, [editingSchedule, teacherSubjects, groups]);

  const toggleBlock = (dayOfWeek: number, blockId: string) => {
    setSelectedBlocks((prev) => {
      const current = prev[dayOfWeek] || [];
      const next = current.includes(blockId)
        ? current.filter((b) => b !== blockId)
        : [...current, blockId];
      return { ...prev, [dayOfWeek]: next };
    });
  };

  const handleAddSchedule = async () => {
    setAddError(null);

    // Build scheduleSlots from selected blocks
    const scheduleSlots: Array<{ dayOfWeek: number; timeBlockRefs: string[] }> = [];
    for (const dayNum of [1, 2, 3, 4, 5]) {
      const blocks = selectedBlocks[dayNum];
      if (blocks && blocks.length > 0) {
        scheduleSlots.push({ dayOfWeek: dayNum, timeBlockRefs: blocks });
      }
    }

    if (scheduleSlots.length === 0) {
      setAddError("Selecciona al menos un bloque de horario.");
      return;
    }

    if (!addForm.group_id || !addForm.subject_id) {
      setAddError("Selecciona grupo y materia.");
      return;
    }

    // For non-Tecnología subjects, teacher is required
    if (!isTecnologia && !addForm.teacher_id) {
      setAddError("Selecciona un maestro.");
      return;
    }

    // For Tecnología, need at least one taller group
    if (isTecnologia && tallerGroupsForGrade.length === 0) {
      setAddError("No hay grupos taller configurados para este grado.");
      return;
    }

    // For Tecnología, all taller groups must have a teacher
    if (isTecnologia) {
      const withoutTeacher = tallerGroupsForGrade.filter((g) => !g.head_teacher_id);
      if (withoutTeacher.length > 0) {
        const names = withoutTeacher.map((g) => `${g.grade}°${g.section}`).join(", ");
        setAddError(`Los grupos taller ${names} no tienen maestro asignado.`);
        return;
      }
    }

    // For Tecnología, all taller groups must have TeacherSubject for Tecnología
    if (isTecnologia && tecnologiaSubjectId) {
      const missingTs = tallerGroupsForGrade.filter((tallerGroup) => {
        const teacherId = typeof tallerGroup.head_teacher_id === "object"
          ? tallerGroup.head_teacher_id._id
          : tallerGroup.head_teacher_id;
        return !teacherSubjects.some((ts) => {
          const gId = typeof ts.group_id === "object" ? ts.group_id._id : ts.group_id;
          const tId = typeof ts.teacher_id === "object" ? ts.teacher_id._id : ts.teacher_id;
          const sId = typeof ts.subject_id === "object" ? ts.subject_id._id : ts.subject_id;
          return gId === tallerGroup._id && tId === teacherId && sId === tecnologiaSubjectId;
        });
      });
      if (missingTs.length > 0) {
        const names = missingTs.map((g) => `${g.grade}°${g.section}`).join(", ");
        setAddError(`Faltan asignaciones de materia para: ${names}. Crea las asignaciones en "Asignar Materias" primero.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      if (isTecnologia) {
        // Create one schedule per taller group of the same grade
        const results = await Promise.allSettled(
          tallerGroupsForGrade.map((tallerGroup) =>
            api.post(ENDPOINTS.CLASS_SCHEDULES, {
              school: schoolId,
              school_year_id: yearId,
              group_id: tallerGroup._id,
              subject_id: addForm.subject_id,
              teacher_id: tallerGroup.head_teacher_id
                ? typeof tallerGroup.head_teacher_id === "object"
                  ? tallerGroup.head_teacher_id._id
                  : tallerGroup.head_teacher_id
                : null,
              school_shift_id: currentShift?._id,
              classroom: addForm.classroom || undefined,
              scheduleSlots,
            })
          )
        );
        const failures = results.filter((r) => r.status === "rejected");
        if (failures.length > 0 && failures.length < tallerGroupsForGrade.length) {
          setAddError(`${tallerGroupsForGrade.length - failures.length} horarios creados. ${failures.length} fallaron.`);
        } else if (failures.length === tallerGroupsForGrade.length) {
          setAddError("Error al guardar horarios de Tecnología.");
          return;
        }
      } else {
        // Normal case: create single schedule
        await api.post(ENDPOINTS.CLASS_SCHEDULES, {
          school: schoolId,
          school_year_id: yearId,
          group_id: addForm.group_id,
          subject_id: addForm.subject_id,
          teacher_id: addForm.teacher_id,
          school_shift_id: currentShift?._id,
          classroom: addForm.classroom || undefined,
          scheduleSlots,
        });
      }
      setIsAddOpen(false);
      resetAddForm();
      await fetchData();
    } catch (err: any) {
      setAddError(err?.message || "Error al guardar horario.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      await api.delete(`${ENDPOINTS.CLASS_SCHEDULES}/${scheduleId}`);
      await fetchData();
    } catch {
      // silent
    }
  };

  const resetAddForm = () => {
    setAddForm({ group_id: "", subject_id: "", teacher_id: "", classroom: "" });
    setSelectedBlocks({});
    setAddError(null);
  };

  const openAddModal = () => {
    resetAddForm();
    setIsAddOpen(true);
  };

  const openEditModal = (schedule: ClassSchedule) => {
    setEditingSchedule(schedule);
    setEditForm({
      teacher_id: typeof schedule.teacher_id === "object" ? schedule.teacher_id._id : schedule.teacher_id || "",
      classroom: schedule.classroom || "",
    });
    const blocks: Record<number, string[]> = {};
    for (const slot of schedule.scheduleSlots) {
      blocks[slot.dayOfWeek] = slot.timeBlockRefs.map((ref: any) => typeof ref === "object" ? ref._id : ref);
    }
    setEditSelectedBlocks(blocks);
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleEditSchedule = async () => {
    setEditError(null);
    if (!editingSchedule) return;

    const scheduleSlots: Array<{ dayOfWeek: number; timeBlockRefs: string[] }> = [];
    for (const dayNum of [1, 2, 3, 4, 5]) {
      const blocks = editSelectedBlocks[dayNum];
      if (blocks && blocks.length > 0) {
        scheduleSlots.push({ dayOfWeek: dayNum, timeBlockRefs: blocks });
      }
    }

    if (scheduleSlots.length === 0) {
      setEditError("Selecciona al menos un bloque de horario.");
      return;
    }

    if (!editForm.teacher_id) {
      setEditError("Selecciona un maestro.");
      return;
    }

    setIsSaving(true);
    try {
      await api.put(`${ENDPOINTS.CLASS_SCHEDULES}/${editingSchedule._id}`, {
        school: schoolId,
        teacher_id: editForm.teacher_id,
        classroom: editForm.classroom || undefined,
        scheduleSlots,
      });
      setIsEditOpen(false);
      setEditingSchedule(null);
      await fetchData();
    } catch (err: any) {
      setEditError(err?.message || "Error al actualizar horario.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando..." height="page" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Horarios de Clases"
        subtitle="Horario semanal por grupo"
        action={{
          label: "Agregar",
          onClick: openAddModal,
        }}
      />

      <div className="flex items-center gap-4">
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">Todos los grupos</option>
          {groups.filter((g) => g.type !== "taller").map((g) => (
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
          description="Agrega horarios de clases usando el botón 'Agregar'."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-text-secondary border-b border-r border-gray-200 w-36">
                  Módulo
                </th>
                {DAYS.map((day, idx) => (
                  <th
                    key={day}
                    className={`px-3 py-2 text-center text-xs font-semibold border-b border-r border-gray-200 last:border-r-0 ${DAY_COLORS[idx]}`}
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gridRows.map((block, rowIdx) => {
                const isLast = rowIdx === gridRows.length - 1;
                if (block.isBreak) {
                  return (
                    <tr key={block._id}>
                      <td className="px-3 py-2 border-r border-b border-gray-200 bg-amber-50">
                        <p className="text-xs font-medium text-amber-700">{block.name}</p>
                        <p className="text-[10px] text-amber-600">{block.startTime} - {block.endTime}</p>
                      </td>
                      {[1, 2, 3, 4, 5].map((dayNum) => (
                        <td key={dayNum} className="px-2 py-1.5 border-r border-b border-gray-200 bg-amber-50 last:border-r-0 text-center">
                          <span className="text-[10px] text-amber-400 font-medium">RECESO</span>
                        </td>
                      ))}
                    </tr>
                  );
                }
                return (
                  <tr key={block._id}>
                    <td className={`px-3 py-2 border-r border-b border-gray-200 bg-gray-50 ${isLast ? "border-b-0" : ""}`}>
                      <p className="text-xs font-medium text-text-primary">{block.name}</p>
                      <p className="text-[10px] text-text-muted">{block.startTime} - {block.endTime}</p>
                    </td>
                    {[1, 2, 3, 4, 5].map((dayNum) => {
                      const cell = gridData[dayNum]?.[block._id];
                      if (cell === "skip") return null;
                      const slot = cell as FlatSlot | undefined;
                      const rowSpan = slot?.rowSpan || 1;
                      return (
                        <td
                          key={dayNum}
                          rowSpan={rowSpan}
                          className={`px-2 py-1.5 border-r border-b border-gray-200 last:border-r-0 text-center ${isLast ? "border-b-0" : ""}`}
                        >
                          {slot ? (
                            <div
                              onClick={() => openEditModal(slot.schedule)}
                              className="cursor-pointer hover:bg-sky-50 rounded-lg p-1.5 transition-colors relative h-full flex flex-col justify-center"
                            >
                              <p className="text-xs font-medium text-text-primary">
                                {(typeof slot.subject === "object" && slot.subject?.name) || "Materia"}
                              </p>
                              <p className="text-[10px] text-text-muted">
                                {slot.teacher}
                              </p>
                              <p className="text-[10px] text-text-muted">
                                {slot.blockStart} - {slot.blockEnd}
                              </p>
                              <div className="absolute top-0.5 right-0.5 flex gap-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(slot.schedule);
                                  }}
                                  className="p-0.5 rounded hover:bg-sky-100 text-text-muted hover:text-sky-600 transition-all"
                                  title="Editar horario"
                                >
                                  <Pencil size={10} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSchedule(slot.scheduleId);
                                  }}
                                  className="p-0.5 rounded hover:bg-rose-100 text-text-muted hover:text-rose-600 transition-all"
                                  title="Eliminar horario"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-text-muted">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Agregar Horario */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Agregar Horario"
        size="xl"
      >
        <div className="space-y-4">
          <Select
            label="Grupo"
            placeholder="Seleccionar grupo"
            options={groups.filter((g) => g.type !== "taller").map((g) => ({
              value: g._id,
              label: `${g.grade}°${g.section} — ${g.shift === "matutino" ? "Matutino" : "Vespertino"}`,
            }))}
            value={addForm.group_id}
            onChange={(e) => {
              setAddForm({
                ...addForm,
                group_id: e.target.value,
                subject_id: "",
                teacher_id: "",
              });
            }}
            disabled={isTecnologia}
          />

          <Select
            label="Materia"
            placeholder={
              addForm.group_id
                ? filteredSubjectsForGroup.length > 0
                  ? "Seleccionar materia"
                  : "Sin materias disponibles"
                : "Primero selecciona un grupo"
            }
            options={filteredSubjectsForGroup.map((s) => ({
              value: s._id,
              label: s.name,
            }))}
            value={addForm.subject_id}
            onChange={(e) => {
              setAddForm({ ...addForm, subject_id: e.target.value, teacher_id: "" });
            }}
            disabled={!addForm.group_id}
          />

          {isTecnologia ? (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Maestro</label>
              <p className="text-sm text-text-secondary bg-slate-50 px-3 py-2 rounded-xl">
                4 maestros (1 por taller del grado)
              </p>
            </div>
          ) : (
            <Select
              label="Maestro"
              placeholder={
                !addForm.group_id
                  ? "Primero selecciona un grupo"
                  : !addForm.subject_id
                  ? "Primero selecciona una materia"
                  : teachersForGroup.length > 0
                  ? "Seleccionar maestro"
                  : "Sin maestros asignados"
              }
              options={teachersForGroup.map((t) => ({
                value: t._id,
                label: `${t.name} ${t.last_name || ""}`.trim(),
              }))}
              value={addForm.teacher_id}
              onChange={(e) => setAddForm({ ...addForm, teacher_id: e.target.value })}
              disabled={!addForm.group_id || !addForm.subject_id || teachersForGroup.length === 0}
            />
          )}

          <Input
            label="Aula (opcional)"
            placeholder="Ej: Aula 12"
            value={addForm.classroom}
            onChange={(e) => setAddForm({ ...addForm, classroom: e.target.value })}
          />

          {/* Day + Block selector — Grid */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Horario</label>
            {availableBlocks.length === 0 ? (
              <p className="text-xs text-text-muted">No hay bloques configurados en el turno.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr>
                      <th className="px-2 py-1.5 text-left text-text-muted font-medium border border-gray-200 bg-gray-50 rounded-tl-lg">Módulo</th>
                      {DAYS.map((day) => (
                        <th key={day} className="px-2 py-1.5 text-center text-text-muted font-medium border border-gray-200 bg-gray-50">
                          {day.slice(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {availableBlocks.map((block) => {
                      if (block.isBreak) {
                        return (
                          <tr key={block._id}>
                            <td className="px-2 py-1.5 border border-gray-200 bg-amber-50 whitespace-nowrap">
                              <p className="font-medium text-amber-700">{block.name}</p>
                              <p className="text-amber-600">{block.startTime}-{block.endTime}</p>
                            </td>
                            {DAYS.map((_, idx) => (
                              <td key={idx + 1} className="px-2 py-1.5 border border-gray-200 bg-amber-50 text-center text-amber-400 text-[10px]">
                                RECESO
                              </td>
                            ))}
                          </tr>
                        );
                      }
                      return (
                        <tr key={block._id}>
                          <td className="px-2 py-1.5 border border-gray-200 bg-gray-50 whitespace-nowrap">
                            <p className="font-medium text-text-primary">{block.name}</p>
                            <p className="text-text-muted">{block.startTime}-{block.endTime}</p>
                          </td>
                          {DAYS.map((_, idx) => {
                            const dayNum = idx + 1;
                            const selected = selectedBlocks[dayNum] || [];
                            const isSelected = selected.includes(block._id);
                            return (
                              <td
                                key={dayNum}
                                onClick={() => toggleBlock(dayNum, block._id)}
                                className={`px-2 py-1.5 border border-gray-200 text-center cursor-pointer transition-colors rounded-none ${
                                  isSelected
                                    ? "bg-accent/10 text-accent font-semibold"
                                    : "bg-white text-text-muted hover:bg-gray-50"
                                }`}
                              >
                                {isSelected ? "✓" : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {addError && <p className="text-xs text-rose-600">{addError}</p>}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsAddOpen(false)}>
              Cancelar
            </Button>
            <Button variant="sky" onClick={handleAddSchedule} isLoading={isSaving}>
              <Plus size={16} className="mr-1.5" />
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Editar Horario */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Editar Horario"
        size="xl"
      >
        <div className="space-y-4">
          {editingSchedule && (
            <>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-sm font-medium text-text-primary">
                  {(typeof editingSchedule.group_id === "object" && editingSchedule.group_id)
                    ? `${editingSchedule.group_id.grade}°${editingSchedule.group_id.section}`
                    : ""}
                </p>
                <p className="text-xs text-text-muted">
                  {(typeof editingSchedule.subject_id === "object" && editingSchedule.subject_id)
                    ? editingSchedule.subject_id.name
                    : ""}
                </p>
              </div>

              <Select
                label="Maestro"
                placeholder="Seleccionar maestro"
                options={editTeachersForSchedule.map((t) => ({
                  value: t._id,
                  label: `${t.name} ${t.last_name || ""}`.trim(),
                }))}
                value={editForm.teacher_id}
                onChange={(e) => setEditForm({ ...editForm, teacher_id: e.target.value })}
                disabled={editTeachersForSchedule.length === 0}
              />

              <Input
                label="Aula (opcional)"
                placeholder="Ej: Aula 12"
                value={editForm.classroom}
                onChange={(e) => setEditForm({ ...editForm, classroom: e.target.value })}
              />

              {/* Day + Block selector — Grid */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Horario</label>
                {availableBlocks.length === 0 ? (
                  <p className="text-xs text-text-muted">No hay bloques configurados en el turno.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] border-collapse">
                      <thead>
                        <tr>
                          <th className="px-2 py-1.5 text-left text-text-muted font-medium border border-gray-200 bg-gray-50 rounded-tl-lg">Módulo</th>
                          {DAYS.map((day) => (
                            <th key={day} className="px-2 py-1.5 text-center text-text-muted font-medium border border-gray-200 bg-gray-50">
                              {day.slice(0, 3)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {availableBlocks.map((block) => {
                          if (block.isBreak) {
                            return (
                              <tr key={block._id}>
                                <td className="px-2 py-1.5 border border-gray-200 bg-amber-50 whitespace-nowrap">
                                  <p className="font-medium text-amber-700">{block.name}</p>
                                  <p className="text-amber-600">{block.startTime}-{block.endTime}</p>
                                </td>
                                {DAYS.map((_, idx) => (
                                  <td key={idx + 1} className="px-2 py-1.5 border border-gray-200 bg-amber-50 text-center text-amber-400 text-[10px]">
                                    RECESO
                                  </td>
                                ))}
                              </tr>
                            );
                          }
                          return (
                            <tr key={block._id}>
                              <td className="px-2 py-1.5 border border-gray-200 bg-gray-50 whitespace-nowrap">
                                <p className="font-medium text-text-primary">{block.name}</p>
                                <p className="text-text-muted">{block.startTime}-{block.endTime}</p>
                              </td>
                              {DAYS.map((_, idx) => {
                                const dayNum = idx + 1;
                                const selected = editSelectedBlocks[dayNum] || [];
                                const isSelected = selected.includes(block._id);
                                return (
                                  <td
                                    key={dayNum}
                                    onClick={() => {
                                      setEditSelectedBlocks((prev) => {
                                        const current = prev[dayNum] || [];
                                        const next = isSelected
                                          ? current.filter((b) => b !== block._id)
                                          : [...current, block._id];
                                        return { ...prev, [dayNum]: next };
                                      });
                                    }}
                                    className={`px-2 py-1.5 border border-gray-200 text-center cursor-pointer transition-colors rounded-none ${
                                      isSelected
                                        ? "bg-accent/10 text-accent font-semibold"
                                        : "bg-white text-text-muted hover:bg-gray-50"
                                    }`}
                                  >
                                    {isSelected ? "✓" : "—"}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {editError && <p className="text-xs text-rose-600">{editError}</p>}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setIsEditOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="sky" onClick={handleEditSchedule} isLoading={isSaving}>
                  <Plus size={16} className="mr-1.5" />
                  Actualizar
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
