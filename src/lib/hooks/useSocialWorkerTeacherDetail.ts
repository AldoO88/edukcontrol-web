// Hook del DETALLE de maestro para el trabajador social (Fase C).
// Puerto de useTeacherDetail con los endpoints del rol (2 fetchs en
// paralelo, mismo contrato que los endpoints del prefecto):
//   1. GET /api/social-worker/teachers/:id          → { teacher, subjects, assignedGroups }
//   2. GET /api/social-worker/teacher-schedule/:id  → { schedule, dayNames, stats }

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { TeacherDetailData, TeacherScheduleData } from "@/lib/types";

export function useSocialWorkerTeacherDetail(teacherId: string | undefined) {
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
        api.get<TeacherDetailData>(ENDPOINTS.SOCIAL_WORKER_TEACHER_BY_ID(teacherId)),
        api.get<TeacherScheduleData>(ENDPOINTS.SOCIAL_WORKER_TEACHER_SCHEDULE(teacherId)),
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
