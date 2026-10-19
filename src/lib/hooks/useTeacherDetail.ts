// Hook del DETALLE de maestro (2 fetchs en paralelo, igual que
// teachers/[teacherId].jsx de la app):
//   1. GET /api/prefect/teachers/:id     → { teacher, subjects, assignedGroups }
//   2. GET /api/prefect/teacher-schedule/:id → { schedule, dayNames, stats }

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { TeacherDetailData, TeacherScheduleData } from "@/lib/types";

export function useTeacherDetail(teacherId: string | undefined) {
  const [detail, setDetail] = useState<TeacherDetailData | null>(null);
  const [schedule, setSchedule] = useState<TeacherScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!teacherId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [detailRes, scheduleRes] = await Promise.all([
        api.get<TeacherDetailData>(ENDPOINTS.PREFECT_TEACHER_BY_ID(teacherId)),
        api.get<TeacherScheduleData>(ENDPOINTS.PREFECT_TEACHER_SCHEDULE(teacherId)),
      ]);
      setDetail(detailRes);
      setSchedule(scheduleRes);
    } catch (e: unknown) {
      setError((e as Error)?.message || "No se pudo cargar la información del maestro.");
    } finally {
      setIsLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { detail, schedule, isLoading, error, refetch: fetchAll };
}
